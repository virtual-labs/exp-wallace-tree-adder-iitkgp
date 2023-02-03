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
dragging_bit = false;

drag_chip_index = -1;
sel_bit_index = -1;

nr_dot = {};
start_dot = {};
end_dot = {};

star_spikes = 5;
star_outerRadius = 2;
star_innerRadius = 1;

l_jumper = false;
r_jumper = false;

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

var nearest_dot = function (x, y) {
    var nr_x = (Math.floor(x / dot_gap) * dot_gap);
    console.log("nr_x:" + nr_x);
    var mod_x = x % dot_gap;
    console.log("mod_x:" + mod_x);
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

class Breadboard {

    dots = [];

    constructor(ctx, v_dots, h_dots) {
        this.ctx = ctx;
        this.v_dots = v_dots;
        this.h_dots = h_dots;
    }

    draw_breadboard() {
        for (var i = dot_gap; i < this.v_dots * dot_gap; i += dot_gap) {
            for (var j = dot_gap; j < this.h_dots * dot_gap; j += dot_gap) {
                var dot = new Dot(i - (dot_width / 2), j - (dot_height / 2), dot_width, dot_height, dot_color);
                dot.draw_dot(this.ctx);
                this.dots.push(dot);
            }
        }
    }
}

class Bit {
    color = 'grey';
    val = -1;
    id = 0;

    constructor(x, y) {
        var nr_pt = nearest_dot(x, y);
        this.x = nr_pt.x;
        this.y = nr_pt.y;
    }

    mouse_in_bit(x, y) {
        var flag = false;
        var d_from_centre = (x - this.x) * (x - this.x) + (y - this.y) * (y - this.y);
        if (d_from_centre <= (bit_r * bit_r)) {
            flag = true;
        }
        console.log("Bit Clicked: " + flag);
        return flag;
    }

    draw_bit(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, bit_r, 0, 2 * Math.PI);
        if (this.val === 0) {
            ctx.fillStyle = "red";
        } else if (this.val === 1) {
            ctx.fillStyle = "green";
        } else {
            ctx.fillStyle = "grey";
        }
        ctx.fill();
        ctx.fillStyle = "black";
        ctx.font = "20px sans-serif";
        ctx.fillText(this.id, this.x + bit_r + 1, this.y + bit_r);
        ctx.font = "10px sans-serif";
    }
}

class In_Bit extends Bit {
    association = [];

    constructor(x, y) {
        super(x, y);
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
    constructor(x, y) {
        super(x, y);
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

class Pin {
    val = -1;
    association = [];

    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = pin_width;
        this.h = pin_height;
        this.color = pin_color;
    }

    draw_pin(ctx) {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

class Chip {
    in_pins = [];
    out_pins = [];
    sel_flag = false;

    constructor(x, y, inputs, outputs, label) {
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
        for (var i = 0; i < this.inputs; i++) {
            var pin = new Pin(pin_x, pin_y);
            this.in_pins.push(pin);
            pin_y += dot_gap;
        }

        pin_x = this.x + this.w;
        pin_y = this.y + chip_padding;
        for (var i = 0; i < this.outputs; i++) {
            var pin = new Pin(pin_x, pin_y);
            this.out_pins.push(pin);
            pin_y += dot_gap;
        }
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

        for (let in_pin of this.in_pins) {
            in_pin.draw_pin(ctx);
        }

        for (let out_pin of this.out_pins) {
            out_pin.draw_pin(ctx);
        }

        console.log("this selected: " + this.sel_flag);
        if (this.sel_flag) {
            drawStar(ctx, this.x, this.y);
            drawStar(ctx, this.x + this.w, this.y);
            drawStar(ctx, this.x, this.y + this.h);
            drawStar(ctx, this.x + this.w, this.y + this.h);
        }
    }

    evaluate() {
        if (this.label === 'NOT') {
            if (this.in_pins[0].val === 0) {
                this.out_pins[0].val = 1;
            } else if (this.in_pins[0].val === 1) {
                this.out_pins[0].val = 0;
            } else {
                this.out_pins[0].val = -1;
            }
        } else if (this.label === 'AND') {
            if (this.in_pins[0].val === 1 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 1;
            } else if (this.in_pins[0].val === 1 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 0;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 0;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 0;
            } else {
                this.out_pins[0].val = -1;
            }
        } else if (this.label === 'OR') {
            if (this.in_pins[0].val === 1 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 1;
            } else if (this.in_pins[0].val === 1 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 1;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 1;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 0;
            } else {
                this.out_pins[0].val = -1;
            }
        } else if (this.label === 'XOR') {
            if (this.in_pins[0].val === 1 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 0;
            } else if (this.in_pins[0].val === 1 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 1;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 1;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 0;
            } else {
                this.out_pins[0].val = -1;
            }
        } else if (this.label === 'NOR') {
            if (this.in_pins[0].val === 1 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 0;
            } else if (this.in_pins[0].val === 1 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 0;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 0;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 1;
            } else {
                this.out_pins[0].val = -1;
            }
        } else if (this.label === 'XNOR') {
            if (this.in_pins[0].val === 1 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 1;
            } else if (this.in_pins[0].val === 1 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 0;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 0;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 1;
            } else {
                this.out_pins[0].val = -1;
            }
        } else if (this.label === 'NAND') {
            if (this.in_pins[0].val === 1 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 0;
            } else if (this.in_pins[0].val === 1 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 1;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 1) {
                this.out_pins[0].val = 1;
            } else if (this.in_pins[0].val === 0 && this.in_pins[1].val === 0) {
                this.out_pins[0].val = 1;
            } else {
                this.out_pins[0].val = -1;
            }
        }
    }
}

class LineSegment {
    orientation = '';
    start_pt = {};
    end_pt = {};

    constructor(start_pt, end_pt) {
        this.start_pt = start_pt;
        this.end_pt = end_pt;
        if (start_pt.x === end_pt.x) {
            this.orientation = 'V';
        } else {
            this.orientation = 'H';
        }
    }

    checkPtOnLine(pt) {
        var flag = false;
        var x = pt.x;
        var y = pt.y;
        var ln_start_pt = this.start_pt;
        var ln_end_pt = this.end_pt;
        if ((this.orientation === 'H' && y === ln_start_pt.y && x >= ln_start_pt.x && x <= ln_end_pt.x)
                || (this.orientation === 'V' && x === ln_start_pt.x && y >= ln_start_pt.y && y <= ln_end_pt.y)) {
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

class Jumper {
    start_pt = {};
    arc_start_pt = {};
    arc_center_pt = {};
    arc_end_pt = {};
    end_pt = {};
    radius = dot_gap / 2;
    direction = 'V';
    orientation = 'L';
    constructor(x, y, direction, orientation) {
        this.start_pt.x = x;
        this.start_pt.y = y;
        this.direction = direction;
        this.orientation = orientation;

        if (this.direction === 'V') {
            this.arc_center_pt.x = x;
            this.arc_center_pt.y = y + dot_gap;
            this.arc_start_pt.x = x;
            this.arc_start_pt.y = y + dot_gap / 2;
            this.end_pt.x = x;
            this.end_pt.y = y + 2 * dot_gap;
            this.arc_end_pt.x = x;
            this.arc_end_pt.y = this.arc_start_pt.y + dot_gap;
        } else if (this.direction === 'H') {
            this.arc_center_pt.x = this.start_pt.x + dot_gap;
            this.arc_center_pt.y = this.start_pt.y;
            this.arc_start_pt.x = this.start_pt.x + dot_gap / 2;
            this.arc_start_pt.y = this.start_pt.y;
            this.end_pt.x = x + 2 * dot_gap;
            this.end_pt.y = y;
            this.arc_end_pt.x = this.arc_start_pt.x + dot_gap;
            this.arc_end_pt.y = y;
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

    draw_jumper(ctx) {
        ctx.lineWidth = conn_width;
        ctx.strokeStyle = conn_color;
        ctx.beginPath();
        ctx.moveTo(this.start_pt.x, this.start_pt.y);
        ctx.lineTo(this.arc_start_pt.x, this.arc_start_pt.y);
        ctx.stroke();
        ctx.beginPath();
        if (this.direction === 'V' && this.orientation === 'L') {
            ctx.arc(this.arc_center_pt.x, this.arc_center_pt.y, this.radius, 0.5 * Math.PI, 1.5 * Math.PI);
        } else if (this.direction === 'V' && this.orientation === 'R') {
            ctx.arc(this.arc_center_pt.x, this.arc_center_pt.y, this.radius, 1.5 * Math.PI, 0.5 * Math.PI);
        } else if (this.direction === 'H' && this.orientation === 'L') {
            ctx.arc(this.arc_center_pt.x, this.arc_center_pt.y, this.radius, Math.PI, 2 * Math.PI);
        } else if (this.direction === 'H' && this.orientation === 'R') {
            ctx.arc(this.arc_center_pt.x, this.arc_center_pt.y, this.radius, 0, Math.PI);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.arc_end_pt.x, this.arc_end_pt.y);
        ctx.lineTo(this.end_pt.x, this.end_pt.y);
        ctx.stroke();
    }
}

class Connection {
    val;
    terminal_pts = [];
    line_segments = [];
    sel_flag = false;
    association = [];

    constructor(start_pt, end_pt, line_segments) {
        this.val = -1;
        this.start_pt = start_pt;
        this.end_pt = end_pt;
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
                segment.draw_jumper(ctx);
            }
        }
    }
}

class Circuit {
    chips = [];
    connections = [];
    ln_segs = [];
    bits = [];
    inbit_pts = [];
    outbit_pts = [];
    jumpers = [];

    constructor(ctx) {
        this.ctx = ctx;
    }

    add_chip(chip) {
        this.chips.push(chip);
    }

    draw_chips() {
        for (let chip of this.chips) {
            chip.draw_chip(this.ctx);
        }
    }

    add_line_segment(line_segment) {
        this.ln_segs.push(line_segment);
    }

    add_inbit_pt(bit) {
        var bit_id = this.bits.length + 1;
        bit.id = bit_id;
        this.inbit_pts.push(bit);
        this.add_bit(bit);
    }

    add_outbit_pt(bit) {
        var bit_id = this.bits.length + 1;
        bit.id = bit_id;
        this.outbit_pts.push(bit);
        this.add_bit(bit);
    }

    add_bit(bit) {
        this.bits.push(bit);
    }

    draw_bits() {
        for (let bit of this.bits) {
            bit.draw_bit(this.ctx);
        }
    }

    updateConnAssocation(conn, x, y) {
        var flag = false;
        for (let bit of this.bits) {
            if (x === bit.x && y === bit.y) {
                if (bit instanceof In_Bit) {
                    bit.association.push(conn);
                    flag = true;
                } else {
                    conn.association.push(bit);
                    flag = true;
                }
                break;
            }
        }

        if (!flag) {
            for (let chip of this.chips) {
                for (let pin of chip.in_pins) {
                    var left = pin.x;
                    var right = pin.x + pin_width;
                    var top = pin.y;
                    var bottom = pin.y + pin_height;
                    if (x >= left && x <= right && y >= top && y <= bottom) {
                        conn.association.push(pin);
                        flag = true;
                        break;
                    }
                }

                if (!flag) {
                    for (let pin of chip.out_pins) {
                        var left = pin.x;
                        var right = pin.x + pin_width;
                        var top = pin.y;
                        var bottom = pin.y + pin_height;
                        if (x >= left && x <= right && y >= top && y <= bottom) {
                            pin.association.push(conn);
                            flag = true;
                            break;
                        }
                    }
                }
            }
        }
        return flag;
    }

    updateAssociation() {
        for (let inbit_pt of this.inbit_pts) {
            inbit_pt.association = [];
        }
        for (let chip of this.chips) {
            for (let pin of chip.out_pins) {
                pin.association = [];
            }
        }
        for (let conn of this.connections) {
            conn.association = [];
            for (let pt of conn.terminal_pts) {
                var x = pt.x;
                var y = pt.y;
                this.updateConnAssocation(conn, x, y);
            }
        }
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
        if (line_segment.orientation === 'H') {
            loop_start = s_start_pt.x;
            loop_end = s_end_pt.x;
            y = s_start_pt.y;
        } else {
            x = s_start_pt.x;
            loop_start = s_start_pt.y;
            loop_end = s_end_pt.y;
        }

        if (line_segment instanceof Jumper) {
            step = 2 * dot_gap;
        }
        var conn_index = 0;
        var conn_match_index = -1;
        for (let conn of this.connections) {
            flag = false;
            for (let line of conn.line_segments) {
                var c_start_pt = line.start_pt;
                var c_end_pt = line.end_pt;
                for (i = loop_start; i <= loop_end; i += step) {
                    if (line_segment.orientation === 'H') {
                        x = i;
                    } else {
                        y = i;
                    }
                    if ((line instanceof LineSegment && ((line.orientation === 'H' && y === c_start_pt.y && x >= c_start_pt.x && x <= c_end_pt.x)
                            || (line.orientation === 'V' && x === c_start_pt.x && y >= c_start_pt.y && y <= c_end_pt.y)))
                            || (line instanceof Jumper && ((x === c_start_pt.x && y === c_start_pt.y)
                                    || (x === c_end_pt.x && y === c_end_pt.y)))) {
                        flag = true;
                        gflag = true;
                        if (conn_match_index === -1) {
                            conn_match_index = conn_index;
                            conn.line_segments.push(line_segment);
                            conn.updateTerminalPts();
                        } else {
                            this.connections[conn_match_index].line_segments.push(...conn.line_segments); //add current conn to last match
                            this.connections[conn_match_index].updateTerminalPts();
                            this.connections.splice(conn_index, 1); //remove current conn                                
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

        if (!gflag) {
            var line_segments = [];
            line_segments.push(line_segment);
            var connection = new Connection(s_start_pt, s_end_pt, line_segments);
            connection.updateTerminalPts();
            dc.add_new_connection(connection);
            flag = true;
        }
        return flag;
    }

    add_new_connection(conn)
    {
        this.connections.push(conn);
    }

    draw_connections()
    {
        for (let conn of this.connections) {
            conn.draw_connection(this.ctx);
        }
    }

    add_jumper(jumper) {
        this.jumpers.push(jumper);
    }

    draw_jumper() {
        for (let jumper of this.jumpers) {
            jumper.draw_jumper(this.ctx);
        }
    }

    redraw() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.draw_chips();
        this.draw_connections();
        this.draw_bits();
    }

    inside_rec(x, y, left, right, top, bottom) {
        var flag = false;
        if (x >= left && x <= right && y >= top && y <= bottom) {
            flag = true;
        }
        return flag;
    }

    clicked_in_chip(x, y) {
        for (var i = this.chips.length - 1; i >= 0; i--) {
            var chip = this.chips[i];
            let left = chip.x;
            let right = chip.x + chip.w;
            let top = chip.y;
            let bottom = chip.y + chip.h;
            if (this.inside_rec(x, y, left, right, top, bottom)) {
                drag_chip_index = i;
                return true;
            }
        }
        return false;
    }

    position_in_dot(x, y) {
        var near_pt = nearest_dot(x, y);
        var nr_x = near_pt.x - (dot_width / 2);
        var nr_y = near_pt.y - (dot_height / 2);

        let left = nr_x;
        let right = nr_x + dot_gap;
        let top = nr_y;
        let bottom = nr_y + dot_gap;

        if (this.inside_rec(x, y, left, right, top, bottom)) {
            nr_dot.x = near_pt.x;
            nr_dot.y = near_pt.y;
            is_connecting = true;
            return true;
        }

        return false;
    }

    position_on_conn(x, y) {
        var flag = false;
        for (var i = 0; i < this.connections.length; i++) {
            var conn = this.connections[i];
            for (let seg of conn.line_segments) {
                var start_pt = seg.start_pt;
                var end_pt = seg.end_pt;
                var l, r, t, b;
                if (seg.orientation === 'H') {
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
                    break;
                }
            }
            if (flag) {
                if (this.connections[i].sel_flag) {
                    this.connections[i].sel_flag = false;
                } else {
                    this.connections[i].sel_flag = true;
                }
                break;
            }
        }

        return flag;
    }

    clicked_in_bit(x, y) {
        var flag = false;
        for (var i = this.bits.length - 1; i >= 0; i--) {
            var bit = this.bits[i];
            if (bit.mouse_in_bit(x, y)) {
                sel_bit_index = i;
                flag = true;
                break;
            }
        }
        return flag;
    }

    toggle_clicked_bit() {
        console.log("sel_bit_index:" + sel_bit_index);
        if (sel_bit_index >= 0 && (this.bits[sel_bit_index] instanceof In_Bit)) {
            this.bits[sel_bit_index].toggle_bit();
            sel_bit_index = -1;
        }
    }

    move_chip(dx, dy) {
        var last_x = this.chips[drag_chip_index].x;
        var last_y = this.chips[drag_chip_index].y;
        this.chips[drag_chip_index].x = last_x + dx;
        this.chips[drag_chip_index].y = last_y + dy;
        for (let in_pin of this.chips[drag_chip_index].in_pins) {
            in_pin.x = in_pin.x + dx;
            in_pin.y = in_pin.y + dy;
        }
        for (let out_pin of this.chips[drag_chip_index].out_pins) {
            out_pin.x = out_pin.x + dx;
            out_pin.y = out_pin.y + dy;
        }
        this.redraw();
    }

    move_bit(dx, dy) {
        var last_x = this.bits[sel_bit_index].x;
        var last_y = this.bits[sel_bit_index].y;
        this.bits[sel_bit_index].x = last_x + dx;
        this.bits[sel_bit_index].y = last_y + dy;
        this.redraw();
    }

    delete_selected() {
        var flag = false;
        for (var i = 0; i < this.connections.length; i++) {
            var conn = this.connections[i];
            if (conn.sel_flag) {
                this.connections.splice(i, 1);
                flag = true;
            }
        }

        for (var i = 0; i < this.chips.length; i++) {
            let chip = this.chips[i];
            if (chip.sel_flag) {
                this.chips.splice(i, 1);
                flag = true;
            }
        }
        return flag;
    }

    simulate() {

        for (let conn of this.connections) {
            conn.val = -1;
        }

        this.updateAssociation();

        for (let inbit_pt of this.inbit_pts) {
            for (let conn of inbit_pt.association) {
                conn.val = inbit_pt.val;
            }
        }

        var flag = false;
        do {
            flag = false;
            for (let conn of this.connections) {
                for (let assoc of conn.association) {
                    if (assoc instanceof Pin) {
                        assoc.val = conn.val;
                    }
                }
            }

            for (let chip of this.chips) {
                var eval_flag = true;
                for (let in_pin of chip.in_pins) {
                    if (!(in_pin.val === 0 || in_pin.val === 1)) {
                        eval_flag = false;
                    }
                }
                if (eval_flag) {
                    chip.evaluate();
                }
            }


            for (let chip of this.chips) {
                for (let pin of chip.out_pins) {
                    for (let conn of pin.association) {
                        if (conn.val !== pin.val) {
                            conn.val = pin.val;
                            flag = true;
                        }
                    }
                }
            }
        } while (flag === true);

        for (let conn of this.connections) {
            for (let assoc of conn.association) {
                if (assoc instanceof Bit) {
                    assoc.val = conn.val;
                }
            }
        }

        dc.redraw();
    }

    save_as_component(name, pin_desc) {
        var jsonObject = {};
        jsonObject ["type"] = "component";
        jsonObject ["name"] = name;
        jsonObject ["pin_desc"] = pin_desc;
        jsonObject ["chips"] = this.chips;
        jsonObject ["connections"] = this.connections;
        jsonObject ["bits"] = this.bits;
        jsonObject ["in_bits"] = this.inbit_pts;
        jsonObject ["out_bits"] = this.outbit_pts;
        console.log("jsonobject: " + JSON.stringify(jsonObject));
        var blob = new Blob([JSON.stringify(jsonObject)],
                {type: "text/plain;charset=utf-8"});
        saveAs(blob, name + ".json");
    }
}

class Component extends Circuit {
    constructor(json) {
        fetch(json)
                .then((response) => response.json())
                .then((json) => console.log(json));
    }
}

var bb = new Breadboard(bb_ctx, 500, 500);
bb.draw_breadboard();

var dc = new Circuit(dc_ctx);

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
        }else if (this.id === "NAND") {
            label = 'NAND';
            in_pin = 2;
        } else {
            label = 'CHIP';
            in_pin = 3;
            out_pin = 3;
        }
        var chip1 = new Chip(init_x, init_y, in_pin, out_pin, label);
        dc.add_chip(chip1);
        dc.redraw();
    });

    $(".switch").on('click', function () {
        var bit;
        if (this.id === "BITSwitch") {
            bit = new In_Bit(init_x, init_y);
            dc.add_inbit_pt(bit);
        } else if (this.id === "BITDisplay") {
            bit = new Out_Bit(init_x, init_y);
            dc.add_outbit_pt(bit);
        }
        dc.redraw();
    });

    $("#sim_btn").on('click', function () {
        dc.simulate();
    });

    $("#save_dc_btn").on('click', function () {
        var name = $("#comp_name").val();
        var pin_desc = $("#pin_desc").val();
        dc.save_as_component(name, pin_desc);
    });



    $("#comp1").on('click', function () {
        printJSON();

//        fetch('../comps/NOT_GATE.json')
//                .then(res => res.json())
//                .then(data => console.log(data));
    });

});

function printJSON() {
    var json = $.getJSON("../comps/NOT_GATE.json");
    console.log("json.responseText: " + json.responseText);
    json = JSON.parse(json.responseText);
    document.write(json.a);
    console.log(json);
}

function getMousePos(evt) {
    var rect = dc_canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}


let mouse_down = function (e) {
    console.log("isConnecting: " + is_connecting);
    let pos = getMousePos(e);
    var x = pos.x;
    var y = pos.y;
    //x = x - 9;
    //y = y - 9;
    console.log("pos: " + x + "," + y);
    if (!is_dragging && dc.clicked_in_chip(x, y)) {
        e.preventDefault();
        start_x = x;
        start_y = y;
        dragging_chip = true;
        is_dragging = true;
    } else if (!is_dragging && dc.clicked_in_bit(x, y)) {
        e.preventDefault();
        start_x = x;
        start_y = y;
        dragging_bit = true;
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
    console.log("isConnecting: " + is_connecting + "l_jumper:" + l_jumper + " r_jumper:" + r_jumper);
};

let mouse_up = function (e) {
    console.log("isConnecting: " + is_connecting + " isDragging:" + is_dragging);
    if (!is_dragging && !is_connecting) {
        return;
    }
    e.preventDefault();
    if (is_dragging && dragging_chip) {
        var x = dc.chips[drag_chip_index].x;
        var y = dc.chips[drag_chip_index].y;
        console.log(" up_x: " + x + " up_y: " + y);
        var nr_pt = nearest_dot(x, y);
        dc.chips[drag_chip_index].x = nr_pt.x + (dot_width / 2);
        dc.chips[drag_chip_index].y = nr_pt.y - ((dot_height / 2) + chip_padding);
        var dx = dc.chips[drag_chip_index].x - x;
        var dy = dc.chips[drag_chip_index].y - y;

        for (let in_pin of dc.chips[drag_chip_index].in_pins) {
            in_pin.x = in_pin.x + dx;
            in_pin.y = in_pin.y + dy;
        }

        for (let out_pin of dc.chips[drag_chip_index].out_pins) {
            out_pin.x = out_pin.x + dx;
            out_pin.y = out_pin.y + dy;
        }
        dc.redraw();
    } else if (is_dragging && dragging_bit) {
        var x = dc.bits[sel_bit_index].x;
        var y = dc.bits[sel_bit_index].y;
        console.log(" up_x: " + x + " up_y: " + y);
        var nr_pt = nearest_dot(x, y);
        dc.bits[sel_bit_index].x = nr_pt.x;
        dc.bits[sel_bit_index].y = nr_pt.y;
        dc.redraw();
    } else if (is_connecting) {
        var new_pos = getMousePos(e);
        var new_x = new_pos.x;
        var new_y = new_pos.y;
        //var new_x = new_pos.x - 9;
        //var new_y = new_pos.y - 9;
        if (dc.position_in_dot(new_x, new_y) && (!(nr_dot.x === start_dot.x && nr_dot.y === start_dot.y))
                && ((nr_dot.x === start_dot.x && nr_dot.y !== start_dot.y) || (nr_dot.x !== start_dot.x && nr_dot.y === start_dot.y))) {
            console.log("end position");
            var end_pt = {};
            end_pt.x = nr_dot.x;
            end_pt.y = nr_dot.y;
            if ((l_jumper || r_jumper) && (start_dot.x === end_pt.x && Math.abs(start_dot.y - end_pt.y) === 2 * dot_gap)) {
                if (start_dot.y > end_pt.y) {
                    var tmp;
                    tmp = start_dot.y;
                    start_dot.y = end_pt.y;
                    end_pt.y = tmp;
                }
                var jumper;
                if (l_jumper) {
                    jumper = new Jumper(start_dot.x, start_dot.y, 'V', 'L');
                } else {
                    jumper = new Jumper(start_dot.x, start_dot.y, 'V', 'R');
                }
                dc.add_line_segment(jumper);
                dc.add_jumper(jumper);
                var flag = dc.add_to_connection(jumper);
                console.log("jumper add_to_connection flag:" + flag);
            } else if ((l_jumper || r_jumper) && (start_dot.y === end_pt.y && Math.abs(start_dot.x - end_pt.x) === 2 * dot_gap)) {
                if (start_dot.x > end_pt.x) {
                    var tmp;
                    tmp = start_dot.x
                    start_dot.x = end_pt.x;
                    end_pt.x = tmp;
                }
                var jumper;
                if (l_jumper) {
                    jumper = new Jumper(start_dot.x, start_dot.y, 'H', 'L');
                } else {
                    jumper = new Jumper(start_dot.x, start_dot.y, 'H', 'R');
                }
                dc.add_line_segment(jumper);
                dc.add_jumper(jumper);
                var flag = dc.add_to_connection(jumper);
                console.log("jumper add_to_connection flag:" + flag);
            } else {
                var ln_segment = new LineSegment(start_dot, end_pt);
                if (ln_segment.orientation === 'H') {
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
                console.log("line segment start_pt: " + ln_segment.start_pt.x + "," + ln_segment.start_pt.y);
                console.log("line segment end_pt: " + ln_segment.end_pt.x + "," + ln_segment.end_pt.y);
//                console.log("start_dot: " + start_dot.x + "," + start_dot.y);
//                console.log("end_dot: " + end_pt.x + "," + end_pt.y);
                dc.add_line_segment(ln_segment);
                var flag = dc.add_to_connection(ln_segment);
                console.log("ln_segment add_to_connection flag: " + flag);
            }
            dc.redraw();
        }
    }
    l_jumper = false;
    r_jumper = false;
    is_dragging = false;
    dragging_chip = false;
    dragging_bit = false;
    drag_chip_index = -1;
    sel_bit_index = -1;
    start_x = undefined;
    start_y = undefined;
    start_dot = {};
    nr_dot = {};
    is_connecting = false;
    console.log("isConnecting: " + is_connecting);
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
    } else if (is_dragging && dragging_bit) {
        var dx = e.movementX;
        var dy = e.movementY;
        dc.move_bit(dx, dy);
        start_x = start_x + dx;
        start_y = start_y + dy;
    }
};

let mouse_dblClick = function (e) {
    console.log(e);
    e.preventDefault();
    var pos = getMousePos(e);
    var x = pos.x;
    var y = pos.y;
    //var x = pos.x - 9;
    //var y = pos.y - 9;
    if (dc.position_on_conn(x, y)) {
        dc.redraw();
    }
    if (dc.clicked_in_chip(x, y)) {
        if (dc.chips[drag_chip_index].sel_flag) {
            dc.chips[drag_chip_index].sel_flag = false;
        } else {
            dc.chips[drag_chip_index].sel_flag = true;
        }
        dc.redraw();
    }
    if (dc.clicked_in_bit(x, y)) {
        dc.toggle_clicked_bit();
        dc.redraw();
    }
};

let key_down = function (e) {
    console.log(e);
    if (e.keyCode === 46) {
        e.preventDefault();
        var flag = dc.delete_selected();
        if (flag) {
            dc.redraw();
        }
    }
};

dc_canvas.addEventListener('mousedown', mouse_down);
dc_canvas.addEventListener('mouseup', mouse_up);
dc_canvas.addEventListener('mousemove', mouse_move);
dc_canvas.addEventListener('mouseout', mouse_out);
dc_canvas.addEventListener('dblclick', mouse_dblClick);
window.addEventListener('keydown', key_down);

