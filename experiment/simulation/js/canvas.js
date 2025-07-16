/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

const bb_canvas = document.getElementById("bb_canvas");
bb_canvas.height = 1000;
bb_canvas.width = 1500;
const bb_ctx = bb_canvas.getContext("2d");
const dc_canvas = document.getElementById("dc_canvas");
dc_canvas.height = 1000;
dc_canvas.width = 1500;
const dc_ctx = dc_canvas.getContext("2d");
available_id = 1;
init_x = 20;
init_y = 20;
bit_r = 7;
dot_width = 5;
dot_height = 5;
dot_gap = 20;
dot_color = "grey";
pin_width = 5;
pin_height = 5;
pin_color = "black";
conn_width = 4;
conn_color = "grey";
chip_padding = 4;
chip_color = "blue";
labelColor = "white";
start_x = 0;
start_y = 0;
is_dragging = false;
is_connecting = false;
dragging_chip = false;
dragging_component = false;
dragging_bit = false;
dragging_memory = false;
dragging_clock = false;
clock_running = false;
stop_simulation_flag = false;
drag_chip_index = -1;
drag_comp_index = -1;
sel_bit_index = -1;
sel_memory_index = -1;
sel_conn_index = -1;
nr_dot = {};
start_dot = {};
end_dot = {};
star_spikes = 5;
star_outerRadius = 2;
star_innerRadius = 1;
l_jumper = false;
r_jumper = false;
high_clock = null;
low_clock = null;


function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function block_sleep(time) {
    await sleep(time);
}

var drawStar = function (ctx, cx, cy) {
    var rot = Math.PI / 2 * 3;
    var x = cx;
    var y = cy;
    var step = Math.PI / star_spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - star_outerRadius);
    for (var i = 0; i < star_spikes; i++) {
        x = cx + Math.cos(rot) * star_outerRadius;
        y = cy + Math.sin(rot) * star_outerRadius;
        ctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * star_innerRadius;
        y = cy + Math.sin(rot) * star_innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - star_outerRadius);
    ctx.closePath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'blue';
    ctx.stroke();
    ctx.fillStyle = 'skyblue';
    ctx.fill();
};

var nearest_dot_old = function (x, y) {
    var nr_x = (Math.floor(x / dot_gap) * dot_gap);
    var mod_x = x % dot_gap;
    var tmp = (dot_gap / 3) * 2;
    if (mod_x > 0) {
        if (mod_x > tmp) {
            nr_x = nr_x + dot_gap;
        }
    }
    var nr_y = (Math.floor(y / dot_gap) * dot_gap);
    var mod_y = y % dot_gap;
    if (mod_y > 0) {
        if (mod_y > tmp) {
            nr_y = nr_y + dot_gap;
        }
    }
    x = nr_x;
    y = nr_y;
    return {x, y};
};

var nearest_dot = function (x, y) {
    //console.log('in x: ' + x + " in y: " + y);
    var left_x = (Math.floor(x / dot_gap) * dot_gap);
    var right_x = left_x + dot_gap;

    var d_left_x = x - left_x;
    var d_right_x = right_x - x;
    if (d_left_x <= d_right_x) {
        x = left_x;
    } else {
        x = right_x;
    }

    var top_y = (Math.floor(y / dot_gap) * dot_gap);
    var bottom_y = top_y + dot_gap;
    var d_top_y = y - top_y;
    var d_bottom_y = bottom_y - y;
    if (d_top_y <= d_bottom_y) {
        y = top_y;
    } else {
        y = bottom_y;
    }
    //console.log('out x: ' + x + " out y: " + y);
    return {x, y};
};

class Breadboard {
    type = 'breadboard';
    dots = [];
    constructor(ctx, v_dots, h_dots) {
        this.ctx = ctx;
        this.v_dots = v_dots;
        this.h_dots = h_dots;
    }

    draw_breadboard() {
        var dot_id = 1;
        for (var i = dot_gap; i < this.v_dots * dot_gap; i += dot_gap) {
            for (var j = dot_gap; j < this.h_dots * dot_gap; j += dot_gap) {
                var dot = new Dot(i - (dot_width / 2), j - (dot_height / 2), dot_width, dot_height, dot_color);
                dot.id = dot_id;
                dot.draw_dot(this.ctx);
                this.dots.push(dot);
                dot_id = dot_id + 1;
            }
        }
    }
}

class Element {
    id = -1;
    type = 'element';
    label = 'element';
}

class Bit extends Element {
    color = 'grey';
    val = -1;
    id = -1;
    type = 'bit';
    label = 'bit';
    sel_flag = false;
    constructor(id, x, y) {
        super();
        var nr_pt = nearest_dot(x, y);
        this.x = nr_pt.x;
        this.y = nr_pt.y;
        this.id = id;
    }

    mouse_in_bit(x, y) {
        var flag = false;
        var d_from_centre = (x - this.x) * (x - this.x) + (y - this.y) * (y - this.y);
        if (d_from_centre <= (bit_r * bit_r)) {
            flag = true;
        }
//        //console.log("Bit Clicked: " + flag);
        return flag;
    }

    draw_bit(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, bit_r, 0, 2 * Math.PI);
        if (this.val === 0 || this.val === '0') {
            ctx.fillStyle = "red";
        } else if (this.val === 1 || this.val === '1') {
            ctx.fillStyle = "green";
        } else {
            ctx.fillStyle = "grey";
        }
        ctx.fill();
        ctx.fillStyle = "black";
        ctx.font = "20px sans-serif";
        ctx.fillText(this.id, this.x + bit_r + 1, this.y + bit_r);
        ctx.font = "10px sans-serif";
        if (this.sel_flag) {
            drawStar(ctx, this.x - bit_r, this.y - bit_r);
            drawStar(ctx, this.x + bit_r, this.y - bit_r);
            drawStar(ctx, this.x + bit_r, this.y + bit_r);
            drawStar(ctx, this.x - bit_r, this.y + bit_r);
        }
    }
}

class In_Bit extends Bit {
    association = [];
    type = 'inbit';
    val = 1;
    constructor(id, x, y) {
        super(id, x, y);
        this.val = 1;
        this.color = 'green';
    }

    toggle_bit() {
        if (this.val === 1) {
            this.val = 0;
            this.color = 'red';
        } else {
            this.val = 1;
            this.color = 'green';
        }
    }
}

class Out_Bit extends Bit {
    association = [];
    type = 'outbit';
    val = -1;
    constructor(id, x, y) {
        super(id, x, y);
        this.val = -1;
    }

    draw_bit(ctx) {
        super.draw_bit(ctx);
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.arc(this.x, this.y, bit_r + 2, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

class Dot {
    type = 'dot';
    id = -1;
    constructor(x, y, w, h, color) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;
    }

    draw_dot(ctx) {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

class Pin extends Element {
    chip_id = -1;
    number = -1;
    val = -1;
    id = -1;
    type = 'pin';
    label = 'pin';
    association = [];
    clock_flag = false;
    constructor(id, x, y) {
        super();
        this.id = id;
        this.x = x;
        this.y = y;
        this.w = pin_width;
        this.h = pin_height;
        this.color = pin_color;
    }

    draw_pin(ctx) {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.w, this.h);
        //console.log("chip_id:" + this.chip_id + " pin_id: " + this.id + " number: " + this.number + " val: " + this.val);
        if (this.val === 0) {
            ctx.fillStyle = 'red';
        } else if (this.val === 1) {
            ctx.fillStyle = 'green';
        } else {
            ctx.fillStyle = this.color;
        }
        ctx.fill();
        if (this.clock_flag) {
            ctx.beginPath();
            ctx.moveTo(this.x + this.w, this.y + this.h);
            ctx.lineTo(this.x + 2 * this.w, this.y + this.h);
            ctx.lineTo(this.x + 2 * this.w, this.y);
            ctx.lineTo(this.x + 3 * this.w, this.y);
            ctx.strokeStyle = 'black';
            ctx.stroke();
        }

        if (this.number === 1) {
            ctx.beginPath();
            ctx.arc(this.x + this.w + this.w, this.y + this.h / 2, 2, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        }
    }
}

class Clock extends Element {
    type = 'clock';
    val = -1;
    association = [];
    id = -1;
    sel_flag = false;
    constructor(id, x, y, high, low, trigger) {
        super();
        this.id = id;
        var nr_pt = nearest_dot(x, y);
        this.x = nr_pt.x;
        this.y = nr_pt.y;
        this.x = x;
        this.y = y;
        this.high = high;
        this.low = low;
        this.trigger = trigger;
    }

    draw_clock(ctx) {
//        //console.log("x: " + this.x + " y: " + this.y + " val: " + this.val);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - (dot_gap / 2), this.y - (dot_gap / 2));
        ctx.lineTo(this.x - (dot_gap / 2), this.y + (dot_gap / 2));
        ctx.lineTo(this.x, this.y);
        ctx.closePath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#333666';
        ctx.stroke();
        if (this.val === 1) {
            ctx.fillStyle = 'green';
        } else if (this.val === 0) {
            ctx.fillStyle = 'red';
        } else {
            ctx.fillStyle = 'white';
        }
        ctx.fill();
        if (this.sel_flag) {
            drawStar(ctx, this.x, this.y);
            drawStar(ctx, this.x - (dot_gap / 2), this.y - (dot_gap / 2));
            drawStar(ctx, this.x - (dot_gap / 2), this.y + (dot_gap / 2));
        }
    }
}

class Memory {
    id = -1;
    inpt = {};
    outpt = {};
    val = -1;
    association = [];
    sel_flag = false;
    type = 'memory';
    constructor(id, x, y) {
        this.id = id;
        var nr_pt = nearest_dot(x, y);
        this.inpt = nr_pt;
        this.outpt.x = nr_pt.x + dot_gap;
        this.outpt.y = nr_pt.y;
        this.w = dot_gap;
        this.h = 2 * (dot_gap / 3);
    }

    mouse_on_memory(x, y) {
        var flag = false;
        if (x >= this.inpt.x && x <= this.inpt.x + this.w && y >= this.inpt.y - dot_gap / 3 && y <= this.inpt.y - dot_gap / 3 + this.h) {
            flag = true;
        }
        return flag;
    }

    draw_memory(ctx) {
        ctx.beginPath();
        ctx.rect(this.inpt.x, this.inpt.y - dot_gap / 3, this.w, this.h);
        if (this.val === -1) {
            this.color = 'grey';
        } else if (this.val === 1) {
            this.color = 'green';
        } else if (this.val === 0) {
            this.color = 'red';
        }
        ctx.fillStyle = this.color;
        ctx.fill();
        if (this.sel_flag) {
            drawStar(ctx, this.inpt.x, this.inpt.y - dot_gap / 3);
            drawStar(ctx, this.inpt.x + this.w, this.inpt.y - dot_gap / 3);
            drawStar(ctx, this.inpt.x, this.inpt.y - dot_gap / 3 + this.h);
            drawStar(ctx, this.inpt.x + this.w, this.inpt.y - dot_gap / 3 + this.h);
        }
    }

}

class Chip extends Element {
    in_pins = [];
    out_pins = [];
    sel_flag = false;
    label = 'chip';
    type = 'chip';
    dependency = [];
    layer = -1;
    memory = 1;
    constructor(id, x, y, inputs, outputs, label) {
        super();
        this.id = id;
        var nr_pt = nearest_dot(x, y);
        this.x = nr_pt.x + (dot_width / 2);
        this.y = nr_pt.y - ((dot_height / 2) + chip_padding);
        this.w = (2 * dot_gap) - dot_width;
        var max_pin = Math.max(inputs, outputs);
        if (max_pin === 1) {
            this.h = pin_height + (4 * chip_padding);
        } else {
            this.h = (dot_gap * (max_pin - 1)) + (2 * chip_padding) + pin_height;
        }

        this.inputs = inputs;
        this.outputs = outputs;
        this.color = chip_color;
        this.label = label;
        var pin_x = this.x - pin_width;
        var pin_y = this.y + chip_padding;
        var pin_num = 1;
        for (var i = 0; i < this.inputs; i++) {
            available_id = available_id + 1;
            var pin = new Pin(available_id, pin_x, pin_y);
            pin.chip_id = this.id;
            pin.number = pin_num;
            pin_num = pin_num + 1;
            pin.type = 'InPin';
            this.in_pins.push(pin);
            pin_y += dot_gap;
        }

        pin_x = this.x + this.w;
        pin_y = this.y + chip_padding;
        for (var i = 0; i < this.outputs; i++) {
            available_id = available_id + 1;
            var pin = new Pin(available_id, pin_x, pin_y);
            pin.chip_id = this.id;
            pin.number = pin_num;
            pin_num = pin_num + 1;
            pin.type = 'OutPin';
            this.out_pins.push(pin);
            pin_y += dot_gap;
        }
        available_id = available_id + 1;
    }

    draw_chip(ctx) {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.beginPath();
        var text_x = this.x + 4;
        var text_y = this.y + this.h / 2;
        ctx.fillStyle = labelColor;
        ctx.fillText(this.label, text_x, text_y);
        ctx.fill();

        ctx.fillStyle = "black";
        ctx.font = "20px sans-serif";
        ctx.fillText(this.id, this.x + 1, this.y - 1);
        ctx.font = "10px sans-serif";

        for (let in_pin of this.in_pins) {
            in_pin.draw_pin(ctx);
        }

        for (let out_pin of this.out_pins) {
            out_pin.draw_pin(ctx);
        }

//        //console.log("this selected: " + this.sel_flag);
        if (this.sel_flag) {
            drawStar(ctx, this.x, this.y);
            drawStar(ctx, this.x + this.w, this.y);
            drawStar(ctx, this.x, this.y + this.h);
            drawStar(ctx, this.x + this.w, this.y + this.h);
        }
    }

    chip_evaluate() {
        var flag = false;
        if (this.label === 'NOT') {
            if (this.in_pins[0].val === 1) {
                this.out_pins[0].val = 0;
                flag = true;
            } else if (this.in_pins[0].val === 0) {
                this.out_pins[0].val = 1;
                flag = true;
            }
        } else if (this.label === 'AND') {
            if (this.in_pins[0].val === 0 || this.in_pins[1].val === 0) {
                this.out_pins[0].val = 0;
                flag = true;
            } else if (this.in_pins[0].val === 1 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 1;
                flag = true;
            }
        } else if (this.label === 'OR') {
            if (this.in_pins[0].val === 1 || this.in_pins[1].val === 1) {
                this.out_pins[0].val = 1;
                flag = true;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 0;
                flag = true;
            }
        } else if (this.label === 'XOR') {
            if (this.in_pins[0].val === 1 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 1;
                flag = true;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 1;
                flag = true;
            } else if (this.in_pins[0].val === 1 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 0;
                flag = true;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 0;
                flag = true;
            }
        } else if (this.label === 'NOR') {
            if (this.in_pins[0].val === 0 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 1;
                flag = true;
            } else if (this.in_pins[0].val === 1 || this.in_pins[1].val === 1) {
                this.out_pins[0].val = 0;
                flag = true;
            }
        } else if (this.label === 'XNOR') {
            if (this.in_pins[0].val === 1 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 1;
                flag = true;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 1;
                flag = true;
            } else if (this.in_pins[0].val === 1 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 0;
                flag = true;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 0;
                flag = true;
            }
        } else if (this.label === 'NAND') {
            if (this.in_pins[0].val === 0 || this.in_pins[1].val === 0) {
                this.out_pins[0].val = 1;
                flag = true;
            } else if (this.in_pins[0].val === 1 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 0;
                flag = true;
            }
        }
        return flag;
    }
}

class LineSegment extends Element {
    orientation = '';
    start_pt = {};
    end_pt = {};
    id = -1;
    type = 'linesegment';
    con_id = -1;
    constructor(id, start_pt, end_pt) {
        super();
        this.id = id;
        this.start_pt = start_pt;
        this.end_pt = end_pt;
        if (start_pt.x === end_pt.x) {
            this.direction = 'V';
        } else {
            this.direction = 'H';
        }
    }

    checkPtOnLine(pt) {
        var flag = false;
        var x = pt.x;
        var y = pt.y;
        var ln_start_pt = this.start_pt;
        var ln_end_pt = this.end_pt;
        if ((this.direction === 'H' && y === ln_start_pt.y && x >= ln_start_pt.x && x <= ln_end_pt.x)
                || (this.direction === 'V' && x === ln_start_pt.x && y >= ln_start_pt.y && y <= ln_end_pt.y)) {
            flag = true;
        }
        return flag;
    }

    draw_line_segment(ctx, sel_flag) {
        ctx.beginPath();
        ctx.moveTo(this.start_pt.x, this.start_pt.y);
        ctx.lineTo(this.end_pt.x, this.end_pt.y);
        ctx.lineWidth = conn_width;
        ctx.strokeStyle = conn_color;
        ctx.stroke();
        if (sel_flag) {
            drawStar(ctx, this.start_pt.x, this.start_pt.y);
            drawStar(ctx, this.end_pt.x, this.end_pt.y);
        }
    }
}

class Jumper extends Element {
    start_pt = {};
    arc1_start_pt = {};
    arc1_center_pt = {};
    arc2_center_pt = {};
    arc2_start_pt = {};
    j_line_start_pt = {};
    j_line_end_pt = {};
    end_pt = {};
    radius = dot_gap / 2;
    direction = 'V';
    orientation = 'L';
    id = -1;
    type = 'jumper';
    sel_flag = false;
    con_id = -1;
    constructor(id, start_x, start_y, end_x, end_y, direction, orientation) {
        super();
        this.id = id;
        this.start_pt.x = start_x;
        this.start_pt.y = start_y;
        this.end_pt.x = end_x;
        this.end_pt.y = end_y;
        this.direction = direction;
        this.orientation = orientation;
        if (this.direction === 'V') {
            this.arc1_center_pt.x = start_x;
            this.arc1_center_pt.y = start_y + dot_gap;
            this.arc1_start_pt.x = start_x;
            this.arc1_start_pt.y = start_y + dot_gap / 2;
            this.arc2_center_pt.x = end_x;
            this.arc2_center_pt.y = end_y - dot_gap;
            this.arc2_start_pt.x = end_x;
            this.arc2_start_pt.y = end_y - dot_gap / 2;
            if (start_y !== end_y) {
                if ("L" === orientation) {
                    this.j_line_start_pt.x = start_x - dot_gap / 2;
                    this.j_line_start_pt.y = start_y + dot_gap;
                    this.j_line_end_pt.x = end_x - dot_gap / 2;
                    this.j_line_end_pt.y = end_y - dot_gap;
                } else {
                    this.j_line_start_pt.x = start_x + dot_gap / 2;
                    this.j_line_start_pt.y = start_y + dot_gap;
                    this.j_line_end_pt.x = end_x + dot_gap / 2;
                    this.j_line_end_pt.y = end_y - dot_gap;
                }
            }
        } else if (this.direction === 'H') {
            this.arc1_center_pt.x = start_x + dot_gap;
            this.arc1_center_pt.y = start_y;
            this.arc1_start_pt.x = start_x + dot_gap / 2;
            this.arc1_start_pt.y = start_y;
            this.arc2_center_pt.x = end_x - dot_gap;
            this.arc2_center_pt.y = end_y;
            this.arc2_start_pt.x = end_x - dot_gap / 2;
            this.arc2_start_pt.y = end_y;
            if (start_x !== end_x) {
                if ("L" === orientation) {
                    this.j_line_start_pt.x = start_x + dot_gap;
                    this.j_line_start_pt.y = start_y - dot_gap / 2;
                    this.j_line_end_pt.x = end_x - dot_gap;
                    this.j_line_end_pt.y = end_y - dot_gap / 2;
                } else {
                    this.j_line_start_pt.x = start_x + dot_gap;
                    this.j_line_start_pt.y = start_y + dot_gap / 2;
                    this.j_line_end_pt.x = end_x - dot_gap;
                    this.j_line_end_pt.y = end_y + dot_gap / 2;
                }
            }
        }
    }

    is_horizontal() {
        var horizontal_flag = true;
        if (this.start_pt.x === this.end_pt.x) {
            horizontal_flag = false;
        }
        return horizontal_flag;
    }

    checkPtOnLine(pt) {
        var flag = false;
        var x = pt.x;
        var y = pt.y;
        var ln_start_pt = this.start_pt;
        var ln_end_pt = this.end_pt;
        if (((x === ln_start_pt.x && y === ln_start_pt.y)
                || (x === ln_end_pt.x && y === ln_end_pt.y))) {
            flag = true;
        }
        return flag;
    }

    draw_jumper(ctx, sel_flag) {
        ctx.lineWidth = conn_width;
        ctx.strokeStyle = conn_color;
        ctx.beginPath();
        ctx.moveTo(this.start_pt.x, this.start_pt.y);
        ctx.lineTo(this.arc1_start_pt.x, this.arc1_start_pt.y);
        ctx.stroke();
        ctx.beginPath();
        if (this.direction === 'V' && this.orientation === 'L') {
            ctx.arc(this.arc1_center_pt.x, this.arc1_center_pt.y, this.radius, 1.5 * Math.PI, Math.PI, true);
        } else if (this.direction === 'V' && this.orientation === 'R') {
            ctx.arc(this.arc1_center_pt.x, this.arc1_center_pt.y, this.radius, 1.5 * Math.PI, 0);
        } else if (this.direction === 'H' && this.orientation === 'L') {
            ctx.arc(this.arc1_center_pt.x, this.arc1_center_pt.y, this.radius, Math.PI, 1.5 * Math.PI);
        } else if (this.direction === 'H' && this.orientation === 'R') {
            ctx.arc(this.arc1_center_pt.x, this.arc1_center_pt.y, this.radius, 0.5 * Math.PI, Math.PI);
        }
        ctx.stroke();
        if (Object.keys(this.j_line_start_pt).length > 0) {
            ctx.beginPath();
            ctx.moveTo(this.j_line_start_pt.x, this.j_line_start_pt.y);
            ctx.lineTo(this.j_line_end_pt.x, this.j_line_end_pt.y);
            ctx.stroke();
        }
        ctx.beginPath();
        if (this.direction === 'V' && this.orientation === 'L') {
            ctx.arc(this.arc2_center_pt.x, this.arc2_center_pt.y, this.radius, 0.5 * Math.PI, Math.PI);
        } else if (this.direction === 'V' && this.orientation === 'R') {
            ctx.arc(this.arc2_center_pt.x, this.arc2_center_pt.y, this.radius, 0, 0.5 * Math.PI);
        } else if (this.direction === 'H' && this.orientation === 'L') {
            ctx.arc(this.arc2_center_pt.x, this.arc2_center_pt.y, this.radius, 0, 1.5 * Math.PI, true);
        } else if (this.direction === 'H' && this.orientation === 'R') {
            ctx.arc(this.arc2_center_pt.x, this.arc2_center_pt.y, this.radius, 0, 0.5 * Math.PI);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.arc2_start_pt.x, this.arc2_start_pt.y);
        ctx.lineTo(this.end_pt.x, this.end_pt.y);
        ctx.stroke();
        if (sel_flag) {
            drawStar(ctx, this.start_pt.x, this.start_pt.y);
            drawStar(ctx, this.end_pt.x, this.end_pt.y);
        }
    }
}

class Connection extends Element {
    val;
    terminal_pts = [];
    line_segments = [];
    sel_flag = false;
    association = [];
    id = -1;
    type = 'connection';
    last_flag = false;
    constructor(line_segments) {
        super();
        this.val = -1;
//        this.start_pt = start_pt;
//        this.end_pt = end_pt;
        this.line_segments = line_segments;
    }

    updateTerminalPts() {
        this.terminal_pts = [];
        for (let ln_seg1 of this.line_segments) {
            var start_pt1 = ln_seg1.start_pt;
            var end_pt1 = ln_seg1.end_pt;
            var flag1 = true;
            var flag2 = true;
            for (let ln_seg2 of this.line_segments) {
                if (ln_seg1 !== ln_seg2) {
                    var f1 = ln_seg2.checkPtOnLine(start_pt1);
                    if (f1) {
                        flag1 = false;
                    }
                    var f2 = ln_seg2.checkPtOnLine(end_pt1);
                    if (f2) {
                        flag2 = false;
                    }
                }
            }
            if (flag1) {
                this.terminal_pts.push(start_pt1);
            }
            if (flag2) {
                this.terminal_pts.push(end_pt1);
            }
        }
    }

    draw_connection(ctx) {
        for (let segment of this.line_segments) {
            if (segment instanceof LineSegment) {
                segment.draw_line_segment(ctx, this.sel_flag);
            } else {
                segment.draw_jumper(ctx, this.sel_flag);
            }
        }
    }
}

class Circuit {
    cir_ele_map = {};
    cir_ele = [];
    chips = [];
    connections = [];
    ln_segs = [];
    bits = [];
    inbit_pts = [];
    outbit_pts = [];
    memory_bits = [];
    jumpers = [];
    components = [];
    clock_id = null;
    layer_wise_conns = new Map();
    layer_wise_devices = new Map();
    memory = 0;
    name = 'Circuit'

    constructor(ctx) {
        this.ctx = ctx;
    }

//    load_from_json(json) {
//        this.name = json.name;        
//        this.cir_ele = json.cir_ele;
//        this.chips = json.chips;
//        this.connections = json.connections;
//        this.ln_segs = json.ln_segs;
//        this.bits = json.bits;
//        this.inbit_pts = json.inbit_pts;
//        this.outbit_pts = json.outbit_pts;
//        this.memory_bits = json.memory_bits;
//        this.jumpers = json.jumpers;
//        this.components = json.components;
//        this.clock_id = json.clock_id;
//        this.cir_ele_map = json.cir_ele_map;
//    }

    add_chip(chip) {
        var id = chip.id;
        if (this.chips.indexOf(id) === -1) {
            this.chips.push(id);
        }
        if (this.cir_ele.indexOf(id) === -1) {
            this.cir_ele.push(id);
        }
        this.cir_ele_map[id] = chip;
    }

    draw_chips() {
        for (let id of this.chips) {
            var chip = this.cir_ele_map[id];
            chip.draw_chip(this.ctx);
        }
    }

    add_component(component) {
        var id = component.id;
        if (this.components.indexOf(id) === -1) {
            this.components.push(id);
        }
        if (this.cir_ele.indexOf(id) === -1) {
            this.cir_ele.push(id);
        }
        this.cir_ele_map[component.id] = component;
    }

    draw_components() {
        for (let id of this.components) {
            console.log("comp id: " + id);
            var comp = this.cir_ele_map[id];
            comp.draw_component(this.ctx);
        }
    }

    add_line_segment(line_segment) {
        var id = line_segment.id;
        if (this.ln_segs.indexOf(id) === -1) {
            this.ln_segs.push(id);
        }
        if (this.cir_ele.indexOf(id) === -1) {
            this.cir_ele.push(id);
        }
        this.cir_ele_map[line_segment.id] = line_segment;
    }

    add_inbit_pt(bit) {
        this.inbit_pts.push(bit.id);
        this.add_bit(bit);
    }

    add_outbit_pt(bit) {
        this.outbit_pts.push(bit.id);
        this.add_bit(bit);
    }

    add_memory(bit) {
        var id = bit.id;
        if (this.memory_bits.indexOf(id) === -1) {
            this.memory_bits.push(id);
        }
        if (this.cir_ele.indexOf(id) === -1) {
            this.cir_ele.push(id);
        }
        this.cir_ele_map[bit.id] = bit;
    }

    add_bit(bit) {
        var id = bit.id;
        if (this.bits.indexOf(id) === -1) {
            this.bits.push(id);
        }
        if (this.cir_ele.indexOf(id) === -1) {
            this.cir_ele.push(id);
        }
        this.cir_ele_map[bit.id] = bit;
    }

    draw_bits() {
        for (let id of this.bits) {
            var bit = this.cir_ele_map[id];
            bit.draw_bit(this.ctx);
        }
    }

    draw_memory_bits() {
        for (let id of this.memory_bits) {
            var bit = this.cir_ele_map[id];
            //console.log("bit type: " + bit.type);
            bit.draw_memory(this.ctx);
        }
    }

    add_clock(clock) {
        this.clock_id = clock.id;
        var id = clock.id;
        if (this.bits.indexOf(id) === -1) {
            this.bits.push(id);
        }
        if (this.cir_ele.indexOf(id) === -1) {
            this.cir_ele.push(id);
        }
        this.cir_ele_map[clock.id] = clock;
    }

    draw_clocks() {
        if (this.clock_id !== null) {
            var clock = this.cir_ele_map[this.clock_id];
            clock.draw_clock(this.ctx);
        }
    }

    updateConnectionAssocation(conn, x, y) {
        var flag = false;
        for (let bit_id of this.bits) {
            var bit = this.cir_ele_map[bit_id];
            if (x === bit.x && y === bit.y) {
                if (bit.association.indexOf(conn.id) === -1) {
                    bit.association.push(conn.id);
                }
                if (bit.type !== 'inbit' && conn.association.indexOf(bit.id) === -1) {
                    conn.association.push(bit.id);
                    conn.last_flag = true;
                }
                flag = true;
                break;
            }
        }

        if (!flag) {
            for (let bit_id of this.memory_bits) {
                var bit = this.cir_ele_map[bit_id];
                if ((x === bit.outpt.x && y === bit.outpt.y) || (x === bit.inpt.x && y === bit.inpt.y)) {
                    if (bit.association.indexOf(conn.id) === -1) {
                        bit.association.push(conn.id);
                    }
                    if (conn.association.indexOf(bit.id) === -1) {
                        conn.association.push(bit.id);
                    }
                    flag = true;
                    break;
                }
//                else if (x === bit.inpt.x && y === bit.inpt.y) {
//                    if (conn.association.indexOf(bit.id) === -1) {
//                        conn.association.push(bit.id);
//                    }
//                    flag = true;
//                    break;
//                }
            }
        }

        if (!flag) {
            if (this.clock_id !== null) {
                var clock = this.cir_ele_map[this.clock_id];
                var left = clock.x;
                var right = clock.x + dot_width;
                var top = clock.y;
                var bottom = clock.y + dot_height;
                if (x >= left && x <= right && y >= top && y <= bottom) {
                    if (clock.association.indexOf(conn.id) === -1) {
                        clock.association.push(conn.id);
                    }
                    flag = true;
                }
            }
        }


        if (!flag) {
            for (let chip_id of this.chips) {
                var chip = this.cir_ele_map[chip_id];
                for (let pin of chip.in_pins) {
//                    //console.log("inpin id: " + pin.id);
                    var left = pin.x;
                    var right = pin.x + pin_width;
                    var top = pin.y;
                    var bottom = pin.y + pin_height;
//                    //console.log("inpin left: " + left + " right: " + right + " top: " + top + " bottom: " + bottom);
                    if (x >= left && x <= right && y >= top && y <= bottom) {
                        if (conn.association.indexOf(pin.id) === -1) {
                            conn.association.push(pin.id);
                        }
                        if (pin.association.indexOf(conn.id) === -1) {
                            pin.association.push(conn.id);
                        }
                        flag = true;
                        break;
                    }
                }

                if (!flag) {
                    for (let pin of chip.out_pins) {
//                        //console.log("outpin id: " + pin.id);
                        var left = pin.x;
                        var right = pin.x + pin_width;
                        var top = pin.y;
                        var bottom = pin.y + pin_height;
//                        //console.log("outpin left: " + left + " right: " + right + " top: " + top + " bottom: " + bottom);
                        if (x >= left && x <= right && y >= top && y <= bottom) {
                            if (pin.association.indexOf(conn.id) === -1) {
                                pin.association.push(conn.id);
                            }
                            if (conn.association.indexOf(pin.id) === -1) {
                                conn.association.push(pin.id);
                            }
                            flag = true;
                            break;
                        }
                    }
                }
            }
        }

        if (!flag) {
            for (let comp_id of this.components) {
                var comp = this.cir_ele_map[comp_id];
                for (let pin of comp.in_pins) {
                    var left = pin.x;
                    var right = pin.x + pin_width;
                    var top = pin.y;
                    var bottom = pin.y + pin_height;
                    if (x >= left && x <= right && y >= top && y <= bottom) {
                        if (conn.association.indexOf(pin.id) === -1) {
//                            //console.log("association conn:" + conn.id + " pin: " + pin.id);
                            conn.association.push(pin.id);
                        }
                        if (pin.association.indexOf(conn.id) === -1) {
                            pin.association.push(conn.id);
                        }
                        flag = true;
                        break;
                    }
                }

                if (!flag) {
                    for (let pin of comp.out_pins) {
                        var left = pin.x;
                        var right = pin.x + pin_width;
                        var top = pin.y;
                        var bottom = pin.y + pin_height;
                        if (x >= left && x <= right && y >= top && y <= bottom) {
                            if (pin.association.indexOf(conn.id) === -1) {
                                pin.association.push(conn.id);
                            }
                            if (conn.association.indexOf(pin.id) === -1) {
                                conn.association.push(pin.id);
                            }
                            flag = true;
                            break;
                        }
                    }
                }
            }
        }
        return flag;
    }

    reset_circuit() {
        for (let conn_id of this.connections) {
            var conn = this.cir_ele_map[conn_id];
            conn.val = -1;
            for (let id of conn.association) {
                var assoc = this.cir_ele_map[id];
                if (assoc.type !== 'outbit' && assoc.type !== 'memory') {
                    assoc.val = conn.val;
                }
            }
        }
        for (let chip_id of this.chips) {
            var chip = this.cir_ele_map[chip_id];
            for (let pin of chip.in_pins) {
                pin.val = -1;
            }
            for (let pin of chip.out_pins) {
                pin.val = -1;
            }
        }
        for (let comp_id of this.components) {
            var comp = this.cir_ele_map[comp_id];
            for (let pin of comp.in_pins) {
                pin.val = -1;
            }
            for (let pin of comp.out_pins) {
                pin.val = -1;
            }
            comp.reset_circuit();
        }
    }

    updateElementAssociation() {
        for (let inbit_pt_id of this.inbit_pts) {
            var inbit_pt = this.cir_ele_map[inbit_pt_id];
            inbit_pt.association = [];
        }
        for (let outbit_pt_id of this.outbit_pts) {
            var outbit_pt = this.cir_ele_map[outbit_pt_id];
            outbit_pt.association = [];
        }
        for (let bit_id of this.memory_bits) {
            var bit = this.cir_ele_map[bit_id];
            bit.association = [];
        }
        for (let chip_id of this.chips) {
            var chip = this.cir_ele_map[chip_id];
            for (let pin of chip.out_pins) {
                pin.association = [];
            }
            for (let pin of chip.in_pins) {
                pin.association = [];
            }
        }
        for (let comp_id of this.components) {
            var comp = this.cir_ele_map[comp_id];
            for (let pin of comp.out_pins) {
                pin.association = [];
            }
            for (let pin of comp.in_pins) {
                pin.association = [];
            }
        }

        if (this.clock_id !== null) {
            var clock = this.cir_ele_map[this.clock_id];
            clock.association = [];
        }

        for (let conn_id of this.connections) {
            var conn = this.cir_ele_map[conn_id];
            conn.association = [];
            for (let pt of conn.terminal_pts) {
                var x = pt.x;
                var y = pt.y;
                this.updateConnectionAssocation(conn, x, y);
            }
        }
    }

    updateElementDependency() {

        for (let key of Object.keys(this.cir_ele_map)) {
            var ele = this.cir_ele_map[key];
            //console.log("cir_ele_map key: " + key + " ele: " + ele.type);
        }

        for (let chip_id of this.chips) {
            var chip = this.cir_ele_map[chip_id];
            for (let pin of chip.in_pins) {
                for (let conn_id of pin.association) {
                    var conn = this.cir_ele_map[conn_id];
                    for (let pin_id of conn.association) {
                        //console.log(" dependency chip: " + chip_id + " in_pin: " + pin.number + " assoc_pin: " + pin_id);
                        var assoc_pin = this.cir_ele_map[pin_id];
                        if (assoc_pin.type === 'OutPin' && assoc_pin.association.indexOf(pin.chip_id) === -1) {
                            chip.dependency.push(assoc_pin.chip_id);
                        }
                    }
                }
            }
        }

        for (let comp_id of this.components) {
            //console.log("comp_id: " + comp_id);
            var comp = this.cir_ele_map[comp_id];
            for (let pin of comp.in_pins) {
                //console.log("Comp: " + comp_id + " in_pin: " + pin.id);
                for (let conn_id of pin.association) {
                    //console.log("inpin: " + pin.id + " assoc conn_id: " + conn_id);
                    var conn = this.cir_ele_map[conn_id];
                    for (let pin_id of conn.association) {
                        //console.log(" dependency component: " + comp_id + " in_pin: " + pin.number + " assoc_pin: " + pin_id);
                        var assoc_pin = this.cir_ele_map[pin_id];
                        if (assoc_pin.type === 'OutPin' && assoc_pin.association.indexOf(pin.chip_id) === -1) {
                            //console.log("dependency: " + true);
                            comp.dependency.push(assoc_pin.chip_id);
                        } else {
                            //console.log("dependency: " + false);
                        }
                    }
                }
            }
        }
    }

    updateCircuitLayerInfo() {
        //console.log("Starting Layer Assignment");

        var layer = 0;
        var total_conns = this.connections.length;
        var total_devices = this.chips.length + this.components.length;
        var device_layer = [];
        var conn_layer = [];
        var conn_covered = new Map();
        var device_covered = new Map();
        this.layer_wise_conns.clear();
        this.layer_wise_devices.clear();

        for (let inbit_pt_id of this.inbit_pts) {
//            //console.log("inbit_pt_id: " + inbit_pt_id);
            var inbit_pt = this.cir_ele_map[inbit_pt_id];
//            //console.log("inbit_pt assoc: " + inbit_pt.association);
            for (let conn_id of inbit_pt.association) {
                if (conn_layer.indexOf(conn_id) === -1) {
                    conn_layer.push(conn_id);
                }
            }
        }

//        //console.log("total_conns: " + total_conns);

        if (this.clock_id !== null) {
            var clock = this.cir_ele_map[this.clock_id];
            for (let conn_id of clock.association) {
                var conn = this.cir_ele_map[conn_id];
                conn_layer.push(conn.id);
            }
        }

        this.layer_wise_conns.set((layer + 1), conn_layer);

        while (device_covered.size < total_devices && layer < 50) {
            layer++;
            for (let conn_id of conn_layer) {
                //console.log("conn_id: " + conn_id);
                var conn = this.cir_ele_map[conn_id];
                for (let id of conn.association) {
                    var assoc = this.cir_ele_map[id];
                    if (assoc.type === 'InPin') {
                        var chip_id = assoc.chip_id;
                        var chip = this.cir_ele_map[chip_id];
                        if (device_covered.get(chip_id) !== 1 && (chip.layer <= 0 || layer > chip.layer)) {
                            if (chip.layer > 0) {
                                var old_indx = this.layer_wise_devices.get(chip.layer).indexOf(chip_id);
                                this.layer_wise_devices.get(chip.layer).splice(old_indx, 1);
                            }
                            chip.layer = layer;
                        }
                        if (device_layer.indexOf(chip_id) === -1) {
                            device_layer.push(chip_id);
                        }
                    }
                }
                conn_covered.set(conn.id, layer);
            }
            this.layer_wise_devices.set(layer, device_layer);
            conn_layer = [];

            for (let dev_id of device_layer) {
                var dev = this.cir_ele_map[dev_id];
                for (let pin of dev.out_pins) {
                    for (let id of pin.association) {
                        if (conn_layer.indexOf(id) === -1) {
                            conn_layer.push(id);
                        }
                    }
                }
                device_covered.set(dev_id, 1);
            }
            //console.log("layer: " + layer + " device_covered: " + Array.from(device_covered.keys()) + " devs in layer: " + device_layer);
            this.layer_wise_conns.set(layer + 1, conn_layer);
            device_layer = [];
        }

        for (let key of this.layer_wise_devices.keys()) {
            //console.log("layer: " + key + " devices: " + this.layer_wise_devices.get(key));
        }
    }

    split_connection(conn_id) {
        //console.log("Inside split_connection: " + conn_id);
        var conn = this.cir_ele_map[conn_id];
        var conn_map = [];
        var processed_segs = [];
        var new_set = [];
        var tested_for_segs = [];
        for (let line_segment of conn.line_segments) {
            if (processed_segs.indexOf(line_segment.id) >= 0) {
                continue;
            }
            processed_segs.push(line_segment.id);
            new_set = [];
            new_set.push(line_segment);
            var gflag = true;
            tested_for_segs = [];
            while (gflag) {
                gflag = false;
                for (let new_ls of new_set) {
                    var seg_id = new_ls.id;
                    //console.log("seg_id: " + seg_id);
                    if (tested_for_segs.indexOf(seg_id) === -1) {
                        tested_for_segs.push(seg_id);
                    }
                    var s_start_pt = new_ls.start_pt;
                    var s_end_pt = new_ls.end_pt;
                    var i = 0;
                    var loop_start = 0;
                    var loop_end = 0;
                    var step = dot_gap;
                    var x = 0;
                    var y = 0;
                    if (new_ls.direction === 'H') {
                        loop_start = s_start_pt.x;
                        loop_end = s_end_pt.x;
                        y = s_start_pt.y;
                    } else {
                        x = s_start_pt.x;
                        loop_start = s_start_pt.y;
                        loop_end = s_end_pt.y;
                    }

                    if (new_ls instanceof Jumper) {
                        step = loop_end - loop_start;
                    }

                    for (let line of conn.line_segments) {
                        var flag = false;
                        var line_id = line.id;
                        if (seg_id === line_id || processed_segs.indexOf(line_id) >= 0) {
                            continue;
                        }
                        var c_start_pt = line.start_pt;
                        var c_end_pt = line.end_pt;
                        for (i = loop_start; i <= loop_end; i += step) {
                            if (new_ls.direction === 'H') {
                                x = i;
                            } else {
                                y = i;
                            }

                            if (line instanceof LineSegment && ((x === c_start_pt.x && y >= c_start_pt.y && y <= c_end_pt.y) || (y === c_start_pt.y && x >= c_start_pt.x && x <= c_end_pt.x))) {
                                flag = true;
                                gflag = true;
                                //console.log("line_id: " + line_id + " flag1: " + flag);
                            } else if (line instanceof Jumper && ((x === c_start_pt.x && y === c_start_pt.y) || (x === c_end_pt.x && y === c_end_pt.y))) {
                                flag = true;
                                gflag = true;
                                console.log("line_id: " + line_id + " flag2: " + flag);
                            }

                            if (flag) {
                                if (processed_segs.indexOf(line_id) === -1 && new_set.indexOf(line_id) === -1) {
                                    new_set.push(line);
                                    processed_segs.push(line_id);
                                }
                                break;
                            }
                        }
                    }
                }
            }
            console.log("new_set: " + new_set.length);
            conn_map.push(new_set);
        }

        console.log("conn_map.length: " + conn_map.length);
        if (conn_map.length > 1) {
            //conn_map.forEach((value, key) => {
            for (var i = 0; i < conn_map.length; i++) {
                var line_segs = conn_map[i];
                var new_conn = new Connection(line_segs);
                new_conn.id = available_id;
                available_id = available_id + 1;
                new_conn.updateTerminalPts();
                dc.add_new_connection(new_conn);
            }
            const index = this.connections.indexOf(conn_id);
            if (index > -1) { // only splice array when item is found
                this.connections.splice(index, 1); // 2nd parameter means remove one item only
            }
            delete this.cir_ele_map[conn_id];
            return true;
        }

        return false;
    }

    delete_last() {
        var flag = false;
        var id = this.cir_ele[this.cir_ele.length - 1];
        var ele = this.cir_ele_map[id];
        console.log("Delete Ele Type: " + ele.type + " Ele.id: " + id);
        if (ele.type === 'connection') {
            this.connections.splice(this.connections.indexOf(id), 1);
            flag = true;
        } else if (ele.type === 'chip') {
            this.chips.splice(this.chips.indexOf(id), 1);
            flag = true;
        } else if (ele.type === 'memory') {
            this.memory_bits.splice(this.memory_bits.indexOf(id), 1);
            flag = true;
        } else if (ele.type === 'inbit' || ele.type === 'outbit') {
            this.bits.splice(this.bits.indexOf(id), 1);
            this.inbit_pts.splice(this.inbit_pts.indexOf(id), 1);
            this.outbit_pts.splice(this.outbit_pts.indexOf(id), 1);
            flag = true;
        } else if (ele.type === 'component') {
            this.components.splice(this.components.indexOf(id), 1);
            flag = true;
        } else if (ele.type === 'clock') {
            this.clock = null;
            flag = true;
        } else if (ele.type === 'linesegment') {
            for (let conn_id of this.connections) {
                var conn = this.cir_ele_map[conn_id];
                var indx = -1;
                for (var i = 0; i < conn.line_segments.length; i++) {
                    var lns = conn.line_segments[i];
                    if (lns.id === id) {
                        indx = i;
                        break;
                    }
                }
                if (indx >= 0) {
                    conn.line_segments.splice(indx, 1);
                    if (conn.line_segments.length === 0) {
                        delete this.cir_ele_map[conn_id];
                        this.connections.splice(this.connections.indexOf(conn_id), 1);
                        //this.cir_ele.splice(this.cir_ele.indexOf(conn_id), 1);
                    } else {
                        if (!this.split_connection(conn_id)) {
                            conn.updateTerminalPts();
                        }
                    }
                    break;
                }
            }
            this.ln_segs.splice(this.ln_segs.indexOf(id), 1);
            flag = true;
        } else if (ele.type === 'jumper') {
            for (let conn_id of this.connections) {
                var conn = this.cir_ele_map[conn_id];
                var indx = -1;
                for (var i = 0; i < conn.line_segments.length; i++) {
                    var lns = conn.line_segments[i];
                    if (lns.id === id) {
                        indx = i;
                        break;
                    }
                }
                if (indx >= 0) {
                    conn.line_segments.splice(indx, 1);
                    if (conn.line_segments.length === 0) {
                        delete this.cir_ele_map[conn_id];
                        this.connections.splice(this.connections.indexOf(conn_id), 1);
                        //this.cir_ele.splice(this.cir_ele.indexOf(conn_id), 1);
                    } else {
                        if (!this.split_connection(conn_id)) {
                            conn.updateTerminalPts();
                        }
                    }
                    break;
                }
            }
            this.ln_segs.splice(this.ln_segs.indexOf(id), 1);
            this.jumpers.splice(this.jumpers.indexOf(id), 1);
            flag = true;
        }
        delete this.cir_ele_map[id];
        this.cir_ele.splice(this.cir_ele.indexOf(id), 1);

        return flag;
    }

    add_to_connection(line_segment) {
        var flag = false;
        var gflag = false;
        var s_start_pt = line_segment.start_pt;
        var s_end_pt = line_segment.end_pt;
        var i = 0;
        var loop_start = 0;
        var loop_end = 0;
        var step = dot_gap;
        var x = 0;
        var y = 0;
        if (line_segment.direction === 'H') {
            loop_start = s_start_pt.x;
            loop_end = s_end_pt.x;
            y = s_start_pt.y;
        } else {
            x = s_start_pt.x;
            loop_start = s_start_pt.y;
            loop_end = s_end_pt.y;
        }

        //console.log("Source Con: " + line_segment.id + " Direction: " + line_segment.direction);
        if (line_segment instanceof Jumper) {
            step = loop_end - loop_start;
        }

        var conn_index = 0;
        var last_match_conn = -1;
        var match_conn = [];
        for (let conn_id of this.connections) {
            //console.log("Index: " + conn_index + "Target Con id: " + conn_id);
            var conn = this.cir_ele_map[conn_id];
            flag = false;
            for (let line of conn.line_segments) {
                var c_start_pt = line.start_pt;
                var c_end_pt = line.end_pt;
                for (i = loop_start; i <= loop_end; i += step) {

                    if (line_segment.direction === 'H') {
                        x = i;
                    } else {
                        y = i;
                    }

                    if (line instanceof LineSegment && ((x === c_start_pt.x && y >= c_start_pt.y && y <= c_end_pt.y) || (y === c_start_pt.y && x >= c_start_pt.x && x <= c_end_pt.x))) {
                        flag = true;
                        gflag = true;
                    } else if (line instanceof Jumper && ((x === c_start_pt.x && y === c_start_pt.y) || (x === c_end_pt.x && y === c_end_pt.y))) {
                        flag = true;
                        gflag = true;
                    }

                    if (flag) {
                        //console.log("x: " + x + " y: " + y + " c_start_pt.x: " + c_start_pt.x + " c_start_pt.y: " + c_start_pt.y + " c_end_pt.x: " + c_end_pt.x + " c_end_pt.y: " + c_end_pt.y);
                        //console.log("Matched Conn: " + conn_id + " last_match_conn: " + last_match_conn);

                        if (last_match_conn === -1) {
                            last_match_conn = conn_id;
                            line_segment.con_id = conn_id;
                            conn.line_segments.push(line_segment);
                            conn.updateTerminalPts();
                        } else {
                            this.cir_ele_map[last_match_conn].line_segments.push(...conn.line_segments); //add current conn to last match
                            this.cir_ele_map[last_match_conn].updateTerminalPts();
                            match_conn.push(conn_id);
                        }
                        break;
                    }
                }
                if (flag) {
                    break;
                }
            }
            conn_index += 1;
        }

        //remove matched connections except the first match
        for (let conn_id of match_conn) {
            const index = this.connections.indexOf(conn_id);
            if (index > -1) { // only splice array when item is found
                this.connections.splice(index, 1); // 2nd parameter means remove one item only
            }
            delete this.cir_ele_map[conn_id];
        }

        if (!gflag) {
            var line_segments = [];
            line_segment.con_id = available_id;
            line_segments.push(line_segment);
            var connection = new Connection(line_segments);
            //console.log("connection id: " + available_id);
            connection.id = available_id;
            available_id = available_id + 1;
            connection.updateTerminalPts();
            dc.add_new_connection(connection);
            flag = true;
        }

        return flag;
    }

    add_new_connection(conn)
    {
        var id = conn.id;
        if (this.connections.indexOf(id) === -1) {
            this.connections.push(id);
        }
//        if (this.cir_ele.indexOf(id) === -1) {
//            this.cir_ele.push(id);
//        }
        this.cir_ele_map[conn.id] = conn;
    }

    draw_connections()
    {
        for (let id of this.connections) {
            //console.log("conn id: " + id);
            var conn = this.cir_ele_map[id];
            conn.draw_connection(this.ctx);
        }
    }

    add_jumper(jumper) {
        if (this.jumpers.indexOf(jumper.id) === -1) {
            this.jumpers.push(jumper.id);
        }
        if (this.cir_ele.indexOf(jumper.id) === -1) {
            this.cir_ele.push(jumper.id);
        }
        this.cir_ele_map[jumper.id] = jumper;
    }

    draw_jumper() {
        for (let jumper of this.jumpers) {
            jumper.draw_jumper(this.ctx);
        }
    }

    redraw() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
//        //console.log("redraw ch1");
        this.draw_chips();
//        //console.log("redraw ch2");
        this.draw_connections();
//        //console.log("redraw ch3");
        this.draw_bits();
//        //console.log("redraw ch4");
        this.draw_components();
//        //console.log("redraw ch5");
        this.draw_clocks();
//        //console.log("redraw ch6");
        this.draw_memory_bits();
    }

    inside_rec(x, y, left, right, top, bottom) {
        var flag = false;
        if (x >= left && x <= right && y >= top && y <= bottom) {
            flag = true;
        }
        return flag;
    }

    clicked_on_clock(x, y) {
        if (this.clock_id !== null) {
            var clock = this.cir_ele_map[this.clock_id];
            var pt1 = {};
            var pt2 = {};
            var pt3 = {};
            pt1.x = clock.x;
            pt1.y = clock.y;
            pt2.x = clock.x - (dot_gap / 2);
            pt2.y = clock.y - (dot_gap / 2);
            pt3.x = clock.x - (dot_gap / 2);
            pt3.y = clock.y + (dot_gap / 2);
            var area_clock = (pt1.x * (pt2.y - pt3.y) + pt2.x * (pt3.y - pt1.y) + pt3.x * (pt1.y - pt2.y)) / 2;
            var area_1 = (x * (pt1.y - pt2.y) + pt1.x * (pt2.y - y) + pt2.x * (y - pt1.y)) / 2;
            var area_2 = (x * (pt2.y - pt3.y) + pt2.x * (pt3.y - y) + pt3.x * (y - pt2.y)) / 2;
            var area_3 = (x * (pt1.y - pt3.y) + pt1.x * (pt3.y - y) + pt3.x * (y - pt1.y)) / 2;
//            //console.log("area: " + area_clock + " a1: " + area_1 + " a2: " + area_2 + " a3: " + area_3);
            if (Math.abs(area_clock) === Math.abs(area_1) + Math.abs(area_2) + Math.abs(area_3)) {
//                //console.log("Clock clicked");
                return true;
            }
        }
//        //console.log("Clock not clicked");
        return false;
    }

    clicked_in_chip(x, y) {
        for (var i = this.chips.length - 1; i >= 0; i--) {
            var chip_id = this.chips[i];
            var chip = this.cir_ele_map[chip_id];
            let left = chip.x;
            let right = chip.x + chip.w;
            let top = chip.y;
            let bottom = chip.y + chip.h;
            if (this.inside_rec(x, y, left, right, top, bottom)) {
                drag_chip_index = chip_id;
                return true;
            }
        }
        return false;
    }

    clicked_on_component(x, y) {

        for (var i = this.components.length - 1; i >= 0; i--) {
            var comp_id = this.components[i];
            var chip = this.cir_ele_map[comp_id];
            let left = chip.x;
            let right = chip.x + chip.w;
            let top = chip.y;
            let bottom = chip.y + chip.h;
            if (this.inside_rec(x, y, left, right, top, bottom)) {
                drag_comp_index = comp_id;
                return true;
            }
        }
        return false;
    }

    position_in_dot(x, y) {
        var near_pt = nearest_dot(x, y);
//        var nr_x = near_pt.x - (dot_width / 2);
//        var nr_y = near_pt.y - (dot_height / 2);
//        let left = nr_x;
//        let right = nr_x + dot_gap;
//        let top = nr_y;
//        let bottom = nr_y + dot_gap;
//        if (this.inside_rec(x, y, left, right, top, bottom)) {
//            nr_dot.x = near_pt.x;
//            nr_dot.y = near_pt.y;
//            is_connecting = true;
//            return true;
//        }

        nr_dot.x = near_pt.x;
        nr_dot.y = near_pt.y;
        is_connecting = true;
        return true;
    }

    position_on_conn(x, y) {
        var flag = false;
        for (var i = 0; i < this.connections.length; i++) {
            var conn_id = this.connections[i];
            var conn = this.cir_ele_map[conn_id];
            for (let seg of conn.line_segments) {
                var start_pt = seg.start_pt;
                var end_pt = seg.end_pt;
                var l, r, t, b;
                if (seg.direction === 'H') {
                    l = start_pt.x - (dot_width / 2);
                    r = end_pt.x + (dot_width / 2);
                    t = start_pt.y - (dot_width / 2);
                    b = start_pt.y + (dot_width / 2);
                } else {
                    l = start_pt.x - (dot_width / 2);
                    r = start_pt.x + (dot_width / 2);
                    t = start_pt.y - (dot_width / 2);
                    b = end_pt.y + (dot_width / 2);
                }
                if (this.inside_rec(x, y, l, r, t, b)) {
                    flag = true;
                    sel_conn_index = conn_id;
                    break;
                }
            }
//            if (flag) {
//                if (this.connections[i].sel_flag) {
//                    this.connections[i].sel_flag = false;
//                } else {
//                    this.connections[i].sel_flag = true;
//                }
//                break;
//            }
        }

        return flag;
    }

    clicked_in_bit(x, y) {
        var flag = false;
        for (var i = this.bits.length - 1; i >= 0; i--) {
            var bit_id = this.bits[i];
            var bit = this.cir_ele_map[bit_id];
            if (bit.mouse_in_bit(x, y)) {
                sel_bit_index = bit_id;
                flag = true;
                break;
            }
        }
        return flag;
    }

    clicked_on_memory(x, y) {
        var flag = false;
        for (var i = this.memory_bits.length - 1; i >= 0; i--) {
            var bit_id = this.memory_bits[i];
            var bit = this.cir_ele_map[bit_id];
            if (bit.mouse_on_memory(x, y)) {
                sel_memory_index = bit_id;
                flag = true;
                break;
            }
        }
        return flag;
    }

    toggle_clicked_bit() {
//        //console.log("sel_bit_index:" + sel_bit_index);
        if (sel_bit_index > 0 && (this.cir_ele_map[sel_bit_index] instanceof In_Bit)) {
            this.cir_ele_map[sel_bit_index].toggle_bit();
            sel_bit_index = -1;
        }
    }

    move_chip(dx, dy) {
        var chip = this.cir_ele_map[drag_chip_index];
        var last_x = chip.x;
        var last_y = chip.y;
        chip.x = last_x + dx;
        chip.y = last_y + dy;
        for (let in_pin of chip.in_pins) {
            in_pin.x = in_pin.x + dx;
            in_pin.y = in_pin.y + dy;
        }
        for (let out_pin of chip.out_pins) {
            out_pin.x = out_pin.x + dx;
            out_pin.y = out_pin.y + dy;
        }
        this.redraw();
    }

    move_component(dx, dy) {
        var comp = this.cir_ele_map[drag_comp_index];
        var last_x = comp.x;
        var last_y = comp.y;
        comp.x = last_x + dx;
        comp.y = last_y + dy;
        for (let pin of comp.pins) {
            pin.x = pin.x + dx;
            pin.y = pin.y + dy;
        }
        this.redraw();
    }

    move_clock(dx, dy) {
        if (this.clock_id !== null) {
            var clock = this.cir_ele_map[this.clock_id];
            var last_x = clock.x;
            var last_y = clock.y;
            clock.x = last_x + dx;
            clock.y = last_y + dy;
            this.redraw();
        }
    }

    move_bit(dx, dy) {
        var bit = this.cir_ele_map[sel_bit_index];
        var last_x = bit.x;
        var last_y = bit.y;
        bit.x = last_x + dx;
        bit.y = last_y + dy;
        this.redraw();
    }

    move_memory(dx, dy) {
        var bit = this.cir_ele_map[sel_memory_index];
        var last_x = bit.inpt.x;
        var last_y = bit.inpt.y;
        bit.inpt.x = last_x + dx;
        bit.inpt.y = last_y + dy;
        this.redraw();
    }

    delete_selected() {
        var flag = false;
        var id_list = Object.keys(this.cir_ele_map);
        for (let id of id_list) {
            id = parseInt(id);
            var ele = this.cir_ele_map[id];
            if (ele.sel_flag === true) {
                console.log("selected ele: " + ele.type + " id: " + id + " sel_flag: " + ele.sel_flag);
                if (ele.type === 'connection') {
                    this.connections.splice(this.connections.indexOf(id), 1);
                    flag = true;
                } else if (ele.type === 'chip') {
                    this.chips.splice(this.chips.indexOf(id), 1);
                    flag = true;
                } else if (ele.type === 'memory') {
                    this.memory_bits.splice(this.memory_bits.indexOf(id), 1);
                    flag = true;
                } else if (ele.type === 'inbit' || ele.type === 'outbit') {
                    this.bits.splice(this.bits.indexOf(id), 1);
                    this.inbit_pts.splice(this.inbit_pts.indexOf(id), 1);
                    this.outbit_pts.splice(this.outbit_pts.indexOf(id), 1);
                    flag = true;
                } else if (ele.type === 'component') {
                    this.components.splice(this.components.indexOf(id), 1);
                    flag = true;
                } else if (ele.type === 'clock') {
                    this.clock_id = null;
                    flag = true;
                }
                if (flag) {
                    delete this.cir_ele_map[id];
                    if (this.cir_ele.indexOf(id) >= 0) {
                        this.cir_ele.splice(this.cir_ele.indexOf(id), 1);
                    }
                    break;
                }
            }
        }
        return flag;
    }

    simulate() {
        //console.log("Simulation for - Name: " + this.name + " label: " + this.label + " type: " + this.type);
        var already_evaluated = [];

        var no_of_chips = this.chips.length;
        var no_of_comps = this.components.length;
        var no_of_devices = no_of_chips + no_of_comps;


        for (let inbit_pt_id of this.inbit_pts) {
            var inbit_pt = this.cir_ele_map[inbit_pt_id];
            for (let id of inbit_pt.association) {
                var conn = this.cir_ele_map[id];
                conn.val = inbit_pt.val;
                //console.log("1.1. intbit id: " + inbit_pt.id + " inbit_pt val: " + inbit_pt.val + " conn id: " + conn.id + " conn val: " + conn.val);
                for (let assoc_id of conn.association) {
                    var assoc = this.cir_ele_map[assoc_id];
                    //console.log("Assoc id: " + assoc_id + " Assoc Type: " + assoc.type);
                    if (assoc.type === 'InPin' || assoc.type === 'outbit' || assoc.type === 'memory') {
                        assoc.val = conn.val;
                    }
                    //console.log("Assoc val: " + assoc.val);
                }
                conn.val = -1;
            }
        }

        //console.log("this.label: " + this.label + " Circuit Memory: " + this.memory);
//        if (this.memory === 1) {
//            for (let outbit_pt_id of this.outbit_pts) {
//                var outbit_pt = this.cir_ele_map[outbit_pt_id];
//                for (let id of outbit_pt.association) {
//                    var conn = this.cir_ele_map[id];
//                    conn.val = outbit_pt.val;
//                    for (let assoc_id of conn.association) {
//                        var assoc = this.cir_ele_map[assoc_id];
//                        if (assoc.type === 'outbit') {
//                            assoc.val = conn.val;
//                        } else if (assoc.type === 'InPin') {
//                            var chip_comp_id = assoc.chip_id;
//                            var chip_comp = this.cir_ele_map[chip_comp_id];
//                            if (chip_comp.label === 'D-FF') {
//                                console.log("memory: " + chip_comp.memory + " pin val: " + assoc.val + " conn val: " + conn.val);
//                            }
//                            if (chip_comp.memory === 1) {
//                                assoc.val = conn.val;
//                            }
//                        }
//                    }
//                    conn.val = -1;
//                }
//            }
//        }

        for (let bit_id of this.memory_bits) {
            var bit = this.cir_ele_map[bit_id];
            for (let id of bit.association) {
                var conn = this.cir_ele_map[id];
                conn.val = bit.val;
                for (let assoc_id of conn.association) {
                    var assoc = this.cir_ele_map[assoc_id];
                    if (assoc.type === 'InPin' || assoc.type === 'outbit' || assoc.type === 'memory') {
                        assoc.val = conn.val;
                    }
                }
                conn.val = -1;
            }
        }

        if (this.clock_id !== null) {
            var clock = this.cir_ele_map[this.clock_id];
            for (let id of clock.association) {
                var conn = this.cir_ele_map[id];
                conn.val = clock.val;
                for (let assoc_id of conn.association) {
                    var assoc = this.cir_ele_map[assoc_id];
                    if (assoc.type === 'InPin' || assoc.type === 'outbit' || assoc.type === 'memory') {
                        assoc.val = conn.val;
                    }
                }
                conn.val = -1;
            }
        }

        var loop_cnt = 0;
        var max_loop = 10;
        var pending_devices = [];
        pending_devices = this.chips.concat(this.components);
        var done_flag = false;

        while (already_evaluated.length < no_of_devices && loop_cnt <= max_loop) {
            loop_cnt++;
            var executed_devices = [];
            var tmp_devices = [];
            //console.log("loop: " + loop_cnt + "pending device: " + pending_devices);
            for (let device_id of pending_devices) {
                var device = this.cir_ele_map[device_id];
                var eval_ele = false;
                //console.log("device id: " + device_id + " type: " + device.type);
                if (device.type === 'chip') {
                    eval_ele = device.chip_evaluate();
                } else {
                    eval_ele = device.comp_evaluate();
                }
//                if (device.label === 'D-FF') {
//                    console.log("Loop: " + loop_cnt + " device id: " + device_id + " eval_ele: " + eval_ele);
//                }
                if (eval_ele) {
                    already_evaluated.push(device_id);
                    executed_devices.push(device_id);
                } else {
                    tmp_devices.push(device_id);
                }
            }
            pending_devices = tmp_devices;

            //set outputs from the executed devices
            for (let device_id of executed_devices) {
                var device = this.cir_ele_map[device_id];
                for (let pin of device.out_pins) {
                    for (let id of pin.association) {
                        var conn = this.cir_ele_map[id];
                        conn.val = pin.val;
                        for (let assoc_id of conn.association) {
                            var assoc = this.cir_ele_map[assoc_id];
                            if (assoc.type === 'InPin' || assoc.type === 'outbit' || assoc.type === 'memory') {
                                assoc.val = conn.val;
                            }
                        }
                    }
                }
            }

            //set outputs from the memory if any
//            for (let id of this.memory_bits) {
//                var memory = this.cir_ele_map[id];
//                for (let conn_id of memory.association) {
//                    var conn = this.cir_ele_map[conn_id];
//                    conn.val = memory.val;
//                    for (let assoc_id of conn.association) {
//                        var assoc = this.cir_ele_map[assoc_id];
//                        if (assoc.type === 'InPin' || assoc.type === 'outbit' || assoc.type === 'memory') {
//                            assoc.val = conn.val;
//                        }
//                    }
//                }
//            }
        }

        if (loop_cnt < max_loop) {
            done_flag = true;
        }

        return done_flag;
    }

    save_as_component_old(name, pin_desc) {
//        var remove_ele = [];
//        for (let key of this.cir_ele_map.keys()) {
//            var ele = this.cir_ele_map.get(key);
//            if (ele.type === 'linesegment' || ele.type === 'jumper' || ele.type === 'InPin' || ele.type === 'OutPin') {
//                remove_ele.push(key);
//            }
//        }
//        for (let key of remove_ele) {
//            this.cir_ele_map.delete(key);
//            this.cir_ele.splice(this.cir_ele.indexOf(key), 1);
//        }

        var jsonObject = {};
        jsonObject ["type"] = "component";
        jsonObject ["name"] = name;
        jsonObject ["pin_desc"] = pin_desc;
        jsonObject ["memory"] = this.memory;
        jsonObject ["memory_bits"] = this.memory_bits;
        jsonObject ["cir_ele_map"] = this.cir_ele_map;
        jsonObject ["cir_ele"] = this.cir_ele;
        jsonObject ["chips"] = this.chips;
        jsonObject ["components"] = this.components;
        jsonObject ["connections"] = this.connections;
        jsonObject ["bits"] = this.bits;
        jsonObject ["in_bits"] = this.inbit_pts;
        jsonObject ["out_bits"] = this.outbit_pts;
        if (this.clock_id !== null) {
            jsonObject ["clock_id"] = this.clock_id;
        }
        jsonObject["layer_wise_connections"] = JSON.stringify(Object.fromEntries(this.layer_wise_conns));
        jsonObject["layer_wise_devices"] = JSON.stringify(Object.fromEntries(this.layer_wise_devices));
        var inpin_json = {};
        var outpin_json = {};
        var pin_id = 1;
        for (var i = 0; i < this.inbit_pts.length; i++) {
            var bit_id = this.inbit_pts[i];
//            let bit = this.cir_ele_map.get(bit_id);
            inpin_json[pin_id] = bit_id;
            pin_id = pin_id + 1;
        }
        if (this.clock_id !== null) {
            inpin_json[pin_id] = this.clock_id;
            pin_id = pin_id + 1;
        }
        for (var i = 0; i < this.outbit_pts.length; i++) {
            let bit_id = this.outbit_pts[i];
            outpin_json[pin_id] = bit_id;
            pin_id = pin_id + 1;
        }
        jsonObject ["inpin_map"] = inpin_json;
        jsonObject ["outpin_map"] = outpin_json;
//        //console.log("jsonobject: " + JSON.stringify(jsonObject));
        var blob = new Blob([JSON.stringify(jsonObject)],
                {type: "text/plain;charset=utf-8"});
        saveAs(blob, name + ".json");
    }

    save_as_component(name, pin_desc) {
        alert("name: " + name + " pin_desc: " + pin_desc);
        this.name = name;
        this.pin_desc = pin_desc;
        var inpin_json = {};
        var outpin_json = {};
        var pin_id = 1;
        for (var i = 0; i < this.inbit_pts.length; i++) {
            var bit_id = this.inbit_pts[i];
            inpin_json[pin_id] = bit_id;
            pin_id = pin_id + 1;
        }
        if (this.clock_id !== null) {
            inpin_json[pin_id] = this.clock_id;
            pin_id = pin_id + 1;
        }
        for (var i = 0; i < this.outbit_pts.length; i++) {
            let bit_id = this.outbit_pts[i];
            outpin_json[pin_id] = bit_id;
            pin_id = pin_id + 1;
        }
        this.inpin_map = inpin_json;
        this.outpin_map = outpin_json;
        var blob = new Blob([JSON.stringify(this)],
                {type: "text/plain;charset=utf-8"});
        saveAs(blob, name + ".json");
    }
}


class Component extends Circuit {
    pins = [];
    left_pins = [];
    in_pins = [];
    out_pins = [];
    right_pins = [];
    sel_flag = false;
    map = new Map();
    inpin_map = {};
    outpin_map = {};
    chip_map = new Map();
    clock_id = null;
    dependency = [];
    type = 'component';
    constructor(id, ctx, json, x, y) {
        super(ctx);
        this.id = id;
        const conn_map = new Map();

        if (json.cir_ele_map !== undefined) {
            //console.log("creating cir_ele_map");
            for (let key of Object.keys(json.cir_ele_map)) {
                var ele_data = json.cir_ele_map[key];
                var id = ele_data.id;
                var type = ele_data.type;
                //console.log("id: " + id + " type: " + type);
                if (type !== 'InPin' && type !== 'OutPin') {
                    let ele = null;
                    if (type === 'chip') {
                        ele = new Chip(id, ele_data.x, ele_data.y, ele_data.inputs, ele_data.outputs, ele_data.label);
                        for (let dep_id of ele_data.dependency) {
                            ele.dependency.push(dep_id);
                        }
                        //ele.layer = ele_data.layer;
                        for (let pin of ele.in_pins) {
                            for (let j = 0; j < ele_data.in_pins.length; j++) {
                                var json_pin = ele_data.in_pins[j];
                                //console.log("json_pin.number: " + json_pin.number + " pin.number: " + pin.number + " pin: " + JSON.stringify(pin));
                                //console.log("this.cir_ele_map.size: " + Object.keys(this.cir_ele_map).length);
                                if (json_pin.number === pin.number) {
                                    pin.id = json_pin.id;
                                    this.cir_ele_map[pin.id] = pin;
                                    pin.association = json_pin.association;
                                    //console.log("this.cir_ele_map.size: " + Object.keys(this.cir_ele_map).length);
                                    break;
                                }

                            }
                        }
                        for (let pin of ele.out_pins) {
                            for (let json_pin of ele_data.out_pins) {
                                if (json_pin.number === pin.number) {
                                    pin.id = json_pin.id;
                                    this.cir_ele_map[pin.id] = pin;
                                    pin.association = json_pin.association;
                                    break;
                                }
                            }
                        }
                        this.chips.push(id);
                    } else if (type === 'component') {
                        //var obj = JSON.parse(ele_data);
                        ele = new Component(id, ctx, ele_data, init_x, init_y);
                        ele.dependency = ele_data.dependency;
                        //ele.layer = ele_data.layer;
                        for (let pin of ele.in_pins) {
                            for (let json_pin of ele_data.in_pins) {
                                //console.log("json_pin.number: " + json_pin.number + " pin.number: " + pin.number);
                                //console.log("this.cir_ele_map.size: " + Object.keys(this.cir_ele_map).length);
                                if (json_pin.number === pin.number) {
                                    pin.id = json_pin.id;
                                    this.cir_ele_map[pin.id] = pin;
                                    pin.association = json_pin.association;
                                    //console.log("this.cir_ele_map.size: " + Object.keys(this.cir_ele_map).length);
                                    break;
                                }
                            }
                        }
                        for (let pin of ele.out_pins) {
                            for (let json_pin of ele_data.out_pins) {
                                if (json_pin.number === pin.number) {
                                    pin.id = json_pin.id;
                                    this.cir_ele_map[pin.id] = pin;
                                    pin.association = json_pin.association;
                                    break;
                                }
                            }
                        }
                        this.components.push(id);
                    } else if (type === 'connection') {
                        let ls = [];
                        ele = new Connection(ls);
                        ele.id = ele_data.id;
                        ele.last_flag = ele_data.last_flag;
                        ele.association = ele_data.association;
                        this.connections.push(id);
                    } else if (type === 'outbit') {
                        ele = new Out_Bit(id, ele_data.x, ele_data.y);
                        ele.val = ele_data.val;
                        ele.association = ele_data.association;
                        this.outbit_pts.push(id);
                        this.bits.push(id);
                    } else if (type === 'inbit') {
                        ele = new In_Bit(id, ele_data.x, ele_data.y);
                        ele.association = ele_data.association;
                        this.inbit_pts.push(id);
                        this.bits.push(id);
                    } else if (type === 'memory') {
                        ele = new Memory(id, ele_data.inpt.x, ele_data.inpt.y);
                        ele.val = ele_data.val;
                        ele.association = ele_data.association;
                        this.memory_bits.push(id);
                    } else if (type === 'clock') {
                        ele = new Clock(id, ele_data.x, ele_data.y, ele_data.high, ele_data.low, ele_data.trigger);
                        ele.association = ele_data.association;
                        this.clock_id = id;
                    }
                    if (type !== 'linesegment' && ele !== null) {
                        //console.log("new component ele_id: " + id + " ele: " + ele.type);
                        if (this.cir_ele.indexOf(id) === -1 && type !== 'connection') {
                            this.cir_ele.push(id);
                        }
                        this.cir_ele_map[id] = ele;
                    }
                }
            }
        }

        if (json.name !== undefined) {
            this.name = json.name;
        }
        if (json.pin_desc !== undefined) {
            this.pin_desc = json.pin_desc;
        }

//        if (json.layer_wise_connections !== undefined) {
//            this.layer_wise_conns = new Map(Object.entries(JSON.parse(json.layer_wise_connections)));
//        }
//        //console.log("load this.layer_wise_conns: " + this.layer_wise_conns.size);
//        for (let key of this.layer_wise_conns.keys()) {
//            var conn_layer = this.layer_wise_conns.get(key);
//            //console.log("key: " + key + " conns: " + conn_layer);
//        }
//        //console.log(" conns: " + this.layer_wise_conns.get("1"));
//        if (json.layer_wise_devices !== undefined) {
//            this.layer_wise_devices = new Map(Object.entries(JSON.parse(json.layer_wise_devices)));
//        }
//        //console.log("load this.layer_wise_devices: " + this.layer_wise_devices.size);
//        for (let key of this.layer_wise_devices.keys()) {
//            var dev_layer = this.layer_wise_devices.get(key);
//            //console.log("key: " + key + " conns: " + dev_layer);
//        }

//        if (json.bits !== undefined) {
//            for (let i = 0; i < json.in_bits.length; i++) {
//                let bit_data = json.in_bits[i];
//                let in_bit = new In_Bit(available_id, bit_data.x, bit_data.y);
//                available_id = available_id + 1;
//                in_bit.id = bit_data.id;
//                for (let j = 0; j < bit_data.association.length; j++) {
//                    let assoc_ele = bit_data.association[j];
//                    in_bit.association.push(conn_map.get(assoc_ele.id));
//                }
//                this.inbit_pts.push(in_bit);
//                this.bits.push(in_bit);
//            }
//        }

        for (let i = 0; i < this.chips.length; i++) {
            let chip_id = this.chips[i];
            let chip = this.cir_ele_map[chip_id];
            for (let i = 0; i < json.cir_ele_map.length; i++) {
                var ele_data = json.cir_ele_map[i];
                if (ele_data.id === chip_id) {
                    let json_chip = ele_data;
                    let json_chip_inpins = json_chip.in_pins;
                    for (let in_pin of chip.in_pins) {
//                        //console.log("chip id: " + chip.id + " out_pin id: " + out_pin.id);
                        for (let json_pin of json_chip_inpins) {
//                            //console.log("json chip id: " + json_chip.id + " json_pin id: " + json_pin.id);
                            for (let assoc of json_pin.association) {
                                in_pin.association.push(assoc);
                            }
                        }
                    }
                    let json_chip_outpins = json_chip.out_pins;
                    for (let out_pin of chip.out_pins) {
//                        //console.log("chip id: " + chip.id + " out_pin id: " + out_pin.id);
                        for (let json_pin of json_chip_outpins) {
//                            //console.log("json chip id: " + json_chip.id + " json_pin id: " + json_pin.id);
                            for (let assoc of json_pin.association) {
                                out_pin.association.push(assoc);
                            }
                        }
                    }
                    break;
                }
            }
        }

//        for (let bit of this.bits) {
//            this.map.set(bit.id, bit);
//        }

        if (json.inpin_map !== undefined) {
            this.inpin_map = JSON.parse(JSON.stringify(json.inpin_map));
            //console.log("this.inpin_map: " + JSON.stringify(this.inpin_map));
        }
        if (json.outpin_map !== undefined) {
            this.outpin_map = JSON.parse(JSON.stringify(json.outpin_map));
            //console.log("this.outpin_map: " + JSON.stringify(this.outpin_map));
        }

        var pin_id = 1;
        for (var i = 0; i < this.inbit_pts.length; i++) {
            var bit_id = this.inbit_pts[i];
            this.inpin_map[pin_id] = bit_id;
            pin_id = pin_id + 1;
        }
        if (this.clock_id !== null) {
            this.inpin_map[pin_id] = this.clock_id;
            pin_id = pin_id + 1;
        }
        for (var i = 0; i < this.outbit_pts.length; i++) {
            let bit_id = this.outbit_pts[i];
            this.outpin_map[pin_id] = bit_id;
            pin_id = pin_id + 1;
        }

        var nr_pt = nearest_dot(x, y);
        this.x = nr_pt.x + (dot_width / 2);
        this.y = nr_pt.y - ((dot_height / 2) + chip_padding);
        this.w = (2 * dot_gap) - dot_width;
        var left_pins = Object.keys(this.inpin_map).length;
        var right_pins = Object.keys(this.outpin_map).length;
        var max_pin = Math.max(left_pins, right_pins);
        if (max_pin === 1) {
            this.h = pin_height + (4 * chip_padding);
        } else {
            this.h = (dot_gap * (max_pin - 1)) + (2 * chip_padding) + pin_height;
        }

        this.color = chip_color;
        if (json.label !== undefined && json.label !== '') {
            this.label = json.label;
        } else {
            this.label = json.name;
        }
        if (this.label === 'Latch') {
            this.memory = 0;
        } else {
            this.memory = json.memory;
        }

        var pin_x = this.x - pin_width;
        var pin_y = this.y + chip_padding;
        let pin_num = 1;
        for (var i = 0; i < left_pins; i++) {
            available_id = available_id + 1;
            var pin = new Pin(available_id, pin_x, pin_y);
            pin.chip_id = this.id;
            pin.number = pin_num;
            pin.label = this.inpin_map[pin_num];
            pin_num = pin_num + 1;
            pin.type = 'InPin';
            this.pins.push(pin);
            this.left_pins.push(pin);
            this.in_pins.push(pin);
            pin_y += dot_gap;
        }

        pin_x = this.x + this.w;
        pin_y = this.y + chip_padding;
        for (var i = right_pins; i > 0; i--) {
            available_id = available_id + 1;
            var pin = new Pin(available_id, pin_x, pin_y);
            pin.chip_id = this.id;
            pin.number = pin_num;
            pin.label = this.outpin_map[pin_num];
            pin_num = pin_num + 1;
            pin.type = 'OutPin';
            this.pins.push(pin);
            this.right_pins.push(pin);
            this.out_pins.push(pin);
            pin_y += dot_gap;
        }
        available_id = available_id + 1;
//        //console.log("Component: " + this.id + " left_pins:" + left_pins + " right_pins:" + right_pins);
    }

    draw_component(ctx) {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.beginPath();
        var text_x = this.x + 4;
        var text_y = this.y + this.h / 2;
        ctx.fillStyle = labelColor;
        ctx.fillText(this.label, text_x, text_y);
        ctx.fill();

        ctx.fillStyle = "black";
        ctx.font = "20px sans-serif";
        ctx.fillText(this.id, this.x + 1, this.y - 1);
        ctx.font = "10px sans-serif";

        for (let pin of this.pins) {
            pin.draw_pin(ctx);
        }

//        //console.log("this selected: " + this.sel_flag);
        if (this.sel_flag) {
            drawStar(ctx, this.x, this.y);
            drawStar(ctx, this.x + this.w, this.y);
            drawStar(ctx, this.x, this.y + this.h);
            drawStar(ctx, this.x + this.w, this.y + this.h);
        }
    }

    comp_evaluate() {
        var flag = false;
        for (let in_pin of this.in_pins) {
            let pin_num = in_pin.number;
            let bit_clock_id = this.inpin_map[pin_num];
            this.cir_ele_map[bit_clock_id].val = in_pin.val;
//            if (this.label === 'D-FF') {
//                console.log("D-FF id: " +  this.id + " inpin_num: " + pin_num + " inpin_val: " + in_pin.val + " bit val: " + this.cir_ele_map[bit_clock_id].val);
//            }
        }
        flag = this.simulate();
        for (let out_pin of this.out_pins) {
            let pin_num = out_pin.number;
            let bit_id = this.outpin_map[pin_num];
            out_pin.val = this.cir_ele_map[bit_id].val;
        }
        return flag;
    }
}

var bb = new Breadboard(bb_ctx, 500, 500);
bb.draw_breadboard();
var dc = new Circuit(dc_ctx);
$("#curr_memory").val(dc.memory);

function getMousePos(evt) {
    var rect = dc_canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}


let mouse_down = function (e) {
    let pos = getMousePos(e);
    var x = pos.x;
    var y = pos.y;
    if (e.ctrlKey) {
        select_element(pos, x, y);
    } else {
        if (!is_dragging && dc.clicked_in_chip(x, y)) {
            e.preventDefault();
            start_x = x;
            start_y = y;
            dragging_chip = true;
            is_dragging = true;
        } else if (!is_dragging && dc.clicked_on_component(x, y)) {
            e.preventDefault();
            start_x = x;
            start_y = y;
            dragging_component = true;
            is_dragging = true;
        } else if (!is_dragging && dc.clicked_in_bit(x, y)) {
            e.preventDefault();
            start_x = x;
            start_y = y;
            dragging_bit = true;
            is_dragging = true;
        } else if (!is_dragging && dc.clicked_on_memory(x, y)) {
            e.preventDefault();
            start_x = x;
            start_y = y;
            dragging_memory = true;
            is_dragging = true;
        } else if (!is_dragging && dc.clicked_on_clock(x, y)) {
            e.preventDefault();
            start_x = x;
            start_y = y;
            dragging_clock = true;
            is_dragging = true;
        } else if (!is_connecting && dc.position_in_dot(x, y)) {
            e.preventDefault();
            start_dot.x = nr_dot.x;
            start_dot.y = nr_dot.y;
            is_connecting = true;
            if (e.shiftKey) {
                l_jumper = true;
            } else if (e.altKey) {
                r_jumper = true;
            }
        }
        nr_dot = {};
    }
};
let mouse_up = function (e) {
    if (!is_dragging && !is_connecting) {
        return;
    }
    e.preventDefault();
    if (is_dragging && dragging_chip) {
        var chip = dc.cir_ele_map[drag_chip_index];
        var x = chip.x;
        var y = chip.y;
        var nr_pt = nearest_dot(x, y);
        chip.x = nr_pt.x + (dot_width / 2);
        chip.y = nr_pt.y - ((dot_height / 2) + chip_padding);
        var dx = chip.x - x;
        var dy = chip.y - y;
        for (let in_pin of chip.in_pins) {
            in_pin.x = in_pin.x + dx;
            in_pin.y = in_pin.y + dy;
        }

        for (let out_pin of chip.out_pins) {
            out_pin.x = out_pin.x + dx;
            out_pin.y = out_pin.y + dy;
        }
        dc.redraw();
    } else if (is_dragging && dragging_component) {
        var comp = dc.cir_ele_map[drag_comp_index];
        var x = comp.x;
        var y = comp.y;
        var nr_pt = nearest_dot(x, y);
        comp.x = nr_pt.x + (dot_width / 2);
        comp.y = nr_pt.y - ((dot_height / 2) + chip_padding);
        var dx = comp.x - x;
        var dy = comp.y - y;
        for (let pin of comp.pins) {
            pin.x = pin.x + dx;
            pin.y = pin.y + dy;
        }
        dc.redraw();
    } else if (is_dragging && dragging_bit) {
        var bit = dc.cir_ele_map[sel_bit_index];
        var x = bit.x;
        var y = bit.y;
        var nr_pt = nearest_dot(x, y);
        bit.x = nr_pt.x;
        bit.y = nr_pt.y;
        dc.redraw();
    } else if (is_dragging && dragging_memory) {
        var bit = dc.cir_ele_map[sel_memory_index];
        var x = bit.inpt.x;
        var y = bit.inpt.y;
        var nr_pt = nearest_dot(x, y);
        bit.inpt.x = nr_pt.x;
        bit.inpt.y = nr_pt.y;
        bit.outpt.x = bit.inpt.x + dot_gap;
        bit.outpt.y = bit.inpt.y;
        dc.redraw();
    } else if (is_dragging && dragging_clock) {
        var clock = dc.cir_ele_map[dc.clock_id];
        var x = clock.x;
        var y = clock.y;
        var nr_pt = nearest_dot(x, y);
        clock.x = nr_pt.x;
        clock.y = nr_pt.y;
        dc.redraw();
    } else if (is_connecting) {
        var new_pos = getMousePos(e);
        var new_x = new_pos.x;
        var new_y = new_pos.y;
        if (dc.position_in_dot(new_x, new_y) && (!(nr_dot.x === start_dot.x && nr_dot.y === start_dot.y))
                && ((nr_dot.x === start_dot.x && nr_dot.y !== start_dot.y) || (nr_dot.x !== start_dot.x && nr_dot.y === start_dot.y))) {
            var end_pt = {};
            end_pt.x = nr_dot.x;
            end_pt.y = nr_dot.y;
            if ((l_jumper || r_jumper) && (start_dot.x === end_pt.x && Math.abs(start_dot.y - end_pt.y) >= 2 * dot_gap)) {
                if (start_dot.y > end_pt.y) {
                    var tmp;
                    tmp = start_dot.y;
                    start_dot.y = end_pt.y;
                    end_pt.y = tmp;
                }
                var jumper;
                if (l_jumper) {
                    jumper = new Jumper(available_id, start_dot.x, start_dot.y, end_pt.x, end_pt.y, 'V', 'L');
                    jumper.type = 'jumper';
                } else {
                    jumper = new Jumper(available_id, start_dot.x, start_dot.y, end_pt.x, end_pt.y, 'V', 'R');
                    jumper.type = 'jumper';
                }
                available_id = available_id + 1;
                dc.add_line_segment(jumper);
                dc.add_jumper(jumper);
                var flag = dc.add_to_connection(jumper);
            } else if ((l_jumper || r_jumper) && (start_dot.y === end_pt.y && Math.abs(start_dot.x - end_pt.x) >= 2 * dot_gap)) {
                if (start_dot.x > end_pt.x) {
                    var tmp;
                    tmp = start_dot.x
                    start_dot.x = end_pt.x;
                    end_pt.x = tmp;
                }
                var jumper;
                if (l_jumper) {
                    jumper = new Jumper(available_id, start_dot.x, start_dot.y, end_pt.x, end_pt.y, 'H', 'L');
                    jumper.type = 'jumper';
                } else {
                    jumper = new Jumper(available_id, start_dot.x, start_dot.y, end_pt.x, end_pt.y, 'H', 'R');
                    jumper.type = 'jumper';
                }
                available_id = available_id + 1;
                dc.add_line_segment(jumper);
                dc.add_jumper(jumper);
                var flag = dc.add_to_connection(jumper);
            } else {
                var ln_segment = new LineSegment(available_id, start_dot, end_pt);
                ln_segment.type = 'linesegment';
                available_id = available_id + 1;
                if (ln_segment.direction === 'H') {
                    if (ln_segment.start_pt.x > ln_segment.end_pt.x) {
                        var tmp = ln_segment.start_pt.x;
                        ln_segment.start_pt.x = ln_segment.end_pt.x;
                        ln_segment.end_pt.x = tmp;
                    }
                } else {
                    if (ln_segment.start_pt.y > ln_segment.end_pt.y) {
                        var tmp = ln_segment.start_pt.y;
                        ln_segment.start_pt.y = ln_segment.end_pt.y;
                        ln_segment.end_pt.y = tmp;
                    }
                }
                dc.add_line_segment(ln_segment);
                var flag = dc.add_to_connection(ln_segment);
            }
            dc.redraw();
        }
    }
    l_jumper = false;
    r_jumper = false;
    is_dragging = false;
    dragging_chip = false;
    dragging_component = false;
    dragging_clock = false;
    dragging_bit = false;
    dragging_mouse = false;
    dragging_memory = false;
    drag_chip_index = -1;
    drag_comp_index = -1;
    sel_bit_index = -1;
    sel_memory_index = -1;
    start_x = undefined;
    start_y = undefined;
    start_dot = {};
    nr_dot = {};
    is_connecting = false;
//    //console.log("isConnecting: " + is_connecting);
};
let mouse_out = function (e) {
    if (!is_dragging && !is_connecting) {
        return;
    }
    e.preventDefault();
    start_x = undefined;
    start_y = undefined;
    start_dot = {};
    nr_dot = {};
    is_connecting = false;
    is_dragging = false;
    is_connecting = false;
    dragging_chip = false;
    dragging_bit = false;
    dragging_memory = false;
};
let mouse_move = function (e) {
    if (!is_dragging && !is_connecting) {
        return;
    }
    e.preventDefault();
    if (is_dragging && dragging_chip) {
        var dx = e.movementX;
        var dy = e.movementY;
        dc.move_chip(dx, dy);
        start_x = start_x + dx;
        start_y = start_y + dy;
    } else if (is_dragging && dragging_component) {
        var dx = e.movementX;
        var dy = e.movementY;
        dc.move_component(dx, dy);
        start_x = start_x + dx;
        start_y = start_y + dy;
    } else if (is_dragging && dragging_bit) {
        var dx = e.movementX;
        var dy = e.movementY;
        dc.move_bit(dx, dy);
        start_x = start_x + dx;
        start_y = start_y + dy;
    } else if (is_dragging && dragging_memory) {
        var dx = e.movementX;
        var dy = e.movementY;
        dc.move_memory(dx, dy);
        start_x = start_x + dx;
        start_y = start_y + dy;
    } else if (is_dragging && dragging_clock) {
        var dx = e.movementX;
        var dy = e.movementY;
        dc.move_clock(dx, dy);
        start_x = start_x + dx;
        start_y = start_y + dy;
    }
};

function select_element(pos, x, y) {
    if (dc.clicked_in_chip(x, y)) {
        var chip = dc.cir_ele_map[drag_chip_index];
        if (chip.sel_flag) {
            chip.sel_flag = false;
            drag_chip_index = -1;
            $("#curr_memory").val(dc.memory);
        } else {
            chip.sel_flag = true;
            $("#curr_memory").val(chip.memory);
        }
        dc.redraw();
    } else if (dc.clicked_on_component(x, y)) {
        var comp = dc.cir_ele_map[drag_comp_index];
        if (comp.sel_flag) {
            comp.sel_flag = false;
            drag_comp_index = -1;
            $("#curr_memory").val(dc.memory);
        } else {
            comp.sel_flag = true;
            $("#curr_memory").val(comp.memory);
        }
        dc.redraw();
    } else if (dc.clicked_in_bit(x, y)) {
        var bit = dc.cir_ele_map[sel_bit_index];
        if (bit.sel_flag) {
            bit.sel_flag = false;
            sel_bit_index = -1;
        } else {
            bit.sel_flag = true;
        }
        dc.redraw();
    } else if (dc.clicked_on_memory(x, y)) {
        var bit = dc.cir_ele_map[sel_memory_index];
        if (bit.sel_flag) {
            bit.sel_flag = false;
            sel_memory_index = -1;
            $("#conn_id").val("");
            $("#conn_val").val("");
        } else {
            bit.sel_flag = true;
            $("#conn_id").val(bit.id);
            $("#conn_val").val(bit.val);
        }
        dc.redraw();
    } else if (dc.clicked_on_clock(x, y)) {
        var clock = dc.cir_ele_map[dc.clock_id];
        if (clock.sel_flag) {
            clock.sel_flag = false;
        } else {
            clock.sel_flag = true;
        }
        dc.redraw();
    } else if (dc.position_on_conn(x, y)) {
        var conn = dc.cir_ele_map[sel_conn_index];
        if (conn.sel_flag) {
            conn.sel_flag = false;
            sel_conn_index = -1;
            $("#conn_id").val("");
            $("#conn_val").val("");
        } else {
            conn.sel_flag = true;
            $("#conn_id").val(conn.id);
            $("#conn_val").val(conn.val);
        }
        dc.redraw();
    }
}
;

let mouse_dblClick = function (e) {
    e.preventDefault();
    var pos = getMousePos(e);
    var x = pos.x;
    var y = pos.y;
    if (dc.clicked_on_component(x, y)) {
        var comp = dc.cir_ele_map[drag_comp_index];
        var com_name = comp.name;
        alert("com_name: " + com_name);
        var pin_desc = comp.pin_desc;
        var inpin_map = comp.inpin_map;
        var outpin_map = comp.outpin_map;
        $("#comp_name_out").val(com_name);
        $("#pin_desc_out").val(pin_desc);
        $("#pin_map").val(JSON.stringify(inpin_map) + '\n' + JSON.stringify(outpin_map));
    } else if (dc.clicked_in_bit(x, y)) {
        dc.toggle_clicked_bit();
        dc.redraw();
    }
};

let key_down = function (e) {
    if (e.keyCode === 46) {
        var flag = dc.delete_selected();
        if (flag) {
            dc.redraw();
        }
    } else if (e.ctrlKey && e.key === 'z') {
        var flag = dc.delete_last();
        if (flag) {
            dc.redraw();
        }
    }
};
function load_component(json, x, y) {
    var component = new Component(available_id, dc_ctx, json, x, y);
    available_id = available_id + 1;
    dc.add_component(component);
    for (let pin of component.in_pins) {
        dc.cir_ele_map[pin.id] = pin;
        var pin_number = pin.number;
        var bit_clock_id = component.inpin_map[pin_number];
        if (component.cir_ele_map[bit_clock_id].type === 'clock') {
            pin.clock_flag = true;
        }
    }
    for (let pin of component.out_pins) {
        dc.cir_ele_map[pin.id] = pin;
    }
    dc.redraw();
}

function load_circuit(json) {
    available_id = Math.max(...json.cir_ele);
    dc.memory = json.memory;
    dc.name = json.name;
    console.log("Object.keys(json.cir_ele_map): " + Object.keys(json.cir_ele_map).length);
    if (json.cir_ele_map !== undefined) {
        for (let key of Object.keys(json.cir_ele_map)) {
            var ele_data = json.cir_ele_map[key];
            var id = ele_data.id;
            var type = ele_data.type;
            if (type !== 'InPin' && type !== 'OutPin') {
                let ele = null;
                if (type === 'chip') {
                    ele = new Chip(id, ele_data.x, ele_data.y, ele_data.inputs, ele_data.outputs, ele_data.label);
                    for (let pin of ele.in_pins) {
                        for (let j = 0; j < ele_data.in_pins.length; j++) {
                            var json_pin = ele_data.in_pins[j];
                            if (json_pin.number === pin.number) {
                                pin.id = json_pin.id;
                                dc.cir_ele_map[pin.id] = pin;
                                pin.association = json_pin.association;
                                //console.log("this.cir_ele_map.size: " + Object.keys(dc.cir_ele_map).length);
                                break;
                            }

                        }
                    }
                    for (let pin of ele.out_pins) {
                        for (let json_pin of ele_data.out_pins) {
                            if (json_pin.number === pin.number) {
                                pin.id = json_pin.id;
                                dc.cir_ele_map[pin.id] = pin;
                                pin.association = json_pin.association;
                                break;
                            }
                        }
                    }
                    dc.chips.push(id);
                } else if (type === 'component') {
                    ele = new Component(id, dc_ctx, ele_data, ele_data.x, ele_data.y);
                    for (let pin of ele.in_pins) {
                        for (let j = 0; j < ele_data.in_pins.length; j++) {
                            var json_pin = ele_data.in_pins[j];
                            if (json_pin.number === pin.number) {
                                pin.id = json_pin.id;
                                dc.cir_ele_map[pin.id] = pin;
                                pin.association = json_pin.association;
                                //console.log("this.cir_ele_map.size: " + Object.keys(dc.cir_ele_map).length);
                                break;
                            }

                        }
                    }
                    for (let pin of ele.out_pins) {
                        for (let json_pin of ele_data.out_pins) {
                            if (json_pin.number === pin.number) {
                                pin.id = json_pin.id;
                                dc.cir_ele_map[pin.id] = pin;
                                pin.association = json_pin.association;
                                break;
                            }
                        }
                    }
                    dc.components.push(id);
                } else if (type === 'connection') {                    
                    let ls = [];
                    ele = new Connection(ls);
                    ele.id = ele_data.id;
                    var ls_list = ele_data.line_segments;
                    for (let ls of ls_list) {
                        var ls_start_pt = ls.start_pt;
                        var ls_end_pt = ls.end_pt;
                        var ls_id = ls.id;
                        var ls_obj = null;
                        if (ls.type === 'linesegment') {
                            ls_obj = new LineSegment(ls_id, ls_start_pt, ls_end_pt);
                            ls_obj.con_id = ele.id;
                            dc.ln_segs.push(ls_id);
                        } else {
                            ls_obj = new Jumper(ls_id, ls_start_pt.x, ls_start_pt.y, ls_end_pt.x, ls_end_pt.y, ls.direction, ls.orientation);
                            ls_obj.con_id = ele.id;
                            dc.ln_segs.push(ls_id);
                            dc.jumpers.push(ls_id);
                        }
                        ele.line_segments.push(ls_obj);
                        ele.terminal_pts = ele_data.terminal_pts;
                    }
//                    var terminal_pts = ele_data.terminal_pts;
//                    for (let pt of terminal_pts) {
//                        ele.terminal_pts.push(pt);
//                    }
                    dc.connections.push(id);
                } else if (type === 'outbit') {
                    ele = new Out_Bit(id, ele_data.x, ele_data.y);
                    dc.outbit_pts.push(id);
                    dc.bits.push(id);
                } else if (type === 'inbit') {
                    ele = new In_Bit(id, ele_data.x, ele_data.y);
                    dc.inbit_pts.push(id);
                    dc.bits.push(id);
                } else if (type === 'memory') {
                    ele = new Memory(id, ele_data.inpt.x, ele_data.inpt.y);
                    ele.val = ele_data.val;
                    ele.association = ele_data.association;
                    dc.memory_bits.push(id);
                } else if (type === 'clock') {
                    ele = new Clock(id, ele_data.x, ele_data.y, ele_data.high, ele_data.low, ele_data.trigger);
                    dc.clock_id = id;
                }

                if (ele !== null) {
                    console.log("type: " + type + " id: " + id);
                    if (dc.cir_ele.indexOf(id) === -1 && type !== 'connection') {
                        dc.cir_ele.push(id);
                    }
                    dc.cir_ele_map[id] = ele;
                }
                console.log("size: " + dc.cir_ele.length);
            }
        }
    }
    dc.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    dc.redraw();
}

//function load_circuit(json) {
//    dc.load_from_json(json);
//    dc.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
//    dc.redraw();
//}

$(document).ready(function () {
    $(".node").on('click', function () {
        var in_pin;
        var out_pin = 1;
        var label;
        if (this.id === "NOT") {
            label = 'NOT';
            in_pin = 1;
        } else if (this.id === "AND") {
            label = 'AND';
            in_pin = 2;
        } else if (this.id === "OR") {
            label = 'OR';
            in_pin = 2;
        } else if (this.id === "NOR") {
            label = 'NOR';
            in_pin = 2;
        } else if (this.id === "XOR") {
            label = 'XOR';
            in_pin = 2;
        } else if (this.id === "XNOR") {
            label = 'XNOR';
            in_pin = 2;
        } else if (this.id === "NAND") {
            label = 'NAND';
            in_pin = 2;
        } else {
            label = 'CHIP';
            in_pin = 3;
            out_pin = 3;
        }
        var chip1 = new Chip(available_id, init_x, init_y, in_pin, out_pin, label);
        available_id = available_id + 1;
        dc.add_chip(chip1);
        for (let pin of chip1.in_pins) {
            dc.cir_ele_map[pin.id] = pin;
        }
        for (let pin of chip1.out_pins) {
            dc.cir_ele_map[pin.id] = pin;
        }
        dc.redraw();
    });
    $(".switch").on('click', function () {
        var bit;
        if (this.id === "BITSwitch") {
            bit = new In_Bit(available_id, init_x, init_y);
            available_id = available_id + 1;
            dc.add_inbit_pt(bit);
        } else if (this.id === "BITDisplay") {
            bit = new Out_Bit(available_id, init_x, init_y);
            available_id = available_id + 1;
            dc.add_outbit_pt(bit);
        } else if (this.id === "Memory") {
            bit = new Memory(available_id, init_x, init_y);
            available_id = available_id + 1;
            dc.add_memory(bit);
        }
        dc.redraw();
    });
    $("#add_clock").on('click', function () {
        var high = $("#high_period").val();
        var low = $("#low_period").val();
        var trigger = document.querySelector('input[name="trigger"]:checked').value;
        //alert("trigger: " + trigger);
        if (high === '' || low === '' || trigger === '') {
            alert("Please enter high and low period and trigger type for clock");
        } else {
            var clock = new Clock(available_id, init_x, init_y, high, low, trigger);
            available_id = available_id + 1;
            dc.add_clock(clock);
            dc.redraw();
        }
    });
    $("#add_memory").on('click', function () {
        var memory = document.querySelector('input[name="memory"]:checked').value;
        if (memory === '1' || memory === '0') {
            var flag = false;
            for (let id of dc.cir_ele) {
                var ele = dc.cir_ele_map[id];
                if (ele.sel_flag) {
                    if (ele.type === 'chip' || ele.type === 'component') {
                        ele.memory = parseInt(memory);
                        $("#curr_memory").val(ele.memory);
                        flag = true;
                        break;
                    }
                }
            }
            if (!flag) {
                dc.memory = parseInt(memory);
                $("#curr_memory").val(dc.memory);
            }
        }
    });
    $("#set_val_btn").on('click', function () {
        dc.updateElementAssociation();
        var val = $("#init_val").val();
        val = parseInt(val);
        for (let conn_id of dc.connections) {
            var conn = dc.cir_ele_map[conn_id];
            if (conn.sel_flag === true) {
                conn.val = val;
                for (let id of conn.association) {
                    var assoc = dc.cir_ele_map[id];
                    if (assoc.type === 'InPin' || assoc.type === 'outbit' || assoc.type === 'memory') {
                        assoc.val = conn.val;
                    }
                }
            }
        }
        dc.redraw();
    });
    $("#reset_val_btn").on('click', function () {
        dc.reset_circuit();
        dc.redraw();
    });
    function loop_clock(clock, count, i, val) {
        setTimeout(function () {
            if (i <= count * 2) {
                //console.log('cycle: ' + i);
                clock.val = val;
                dc.redraw();
                if (((clock.trigger === '1' || clock.trigger === '3') && val === '1') || ((clock.trigger === '2' || clock.trigger === '4') && val === 0)) {
                    dc.simulate();
                    dc.redraw();
                    dc.reset_circuit();
                }
                i++;
                val = val === 0 ? 1 : 0;
                loop_clock(clock, count, i, val);
            } else {
                clock.val = -1;
                dc.redraw();
            }
        }, 1000);
    }


    $("#start_clock").on('click', function () {
//var cycles = $("#no_of_cycles").val();
        var cycles = 1;
        dc.updateElementAssociation();
        //dc.updateElementDependency();
        //dc.updateCircuitLayerInfo();

        var clock = dc.cir_ele_map[dc.clock_id];
        clock.val = 1;
        dc.redraw();
        if (clock.trigger === '1' || clock.trigger === '3') {
            dc.simulate();
            dc.redraw();
            dc.reset_circuit();
        }
        setTimeout(function () {
            clock.val = 0;
            dc.redraw();
            if (clock.trigger === '2' || clock.trigger === '4') {
                dc.simulate();
                dc.redraw();
                dc.reset_circuit();
            }
            var next_cycle = 3;
            var next_val = 1;
            loop_clock(clock, cycles, next_cycle, next_val);
        }, 1000);
    });
    $("#sim_btn").on('click', function () {
        stop_simulation_flag = false;
        dc.updateElementAssociation();
//        for (let id of dc.connections) {
//            var conn = dc.cir_ele_map[id];
//            for (let assoc_id of conn.association) {
//                var assoc = dc.cir_ele_map[assoc_id];
//                console.log(" conn_id: " + id + " assoc id: " + assoc_id + " type: " + assoc.type);
//            }
//        }
        //return 0;
        //dc.updateElementDependency();
        //dc.updateCircuitLayerInfo();
        dc.simulate();
        dc.redraw();
        dc.reset_circuit();
    });
    $("#stop_btn").on('click', function () {
        stop_simulation_flag = true;
    });
    $("#save_dc_btn").on('click', function () {
        var name = $("#comp_name").val();
        var pin_desc = $("#pin_desc").val();
        dc.updateElementAssociation();
        dc.updateElementDependency();
        dc.updateCircuitLayerInfo();
        dc.save_as_component(name, pin_desc);
    });
    $("#add-component-button").on('click', function () {
        const json = JSON.parse(document.getElementById("data").value);
        load_component(json, init_x, init_y);
    });
    $("#load-circuit-button").on('click', function () {
        const json = JSON.parse(document.getElementById("data").value);
        load_circuit(json);
    });
});
dc_canvas.addEventListener('mousedown', mouse_down);
dc_canvas.addEventListener('mouseup', mouse_up);
dc_canvas.addEventListener('mousemove', mouse_move);
dc_canvas.addEventListener('mouseout', mouse_out);
dc_canvas.addEventListener('dblclick', mouse_dblClick);
window.addEventListener('keydown', key_down);

