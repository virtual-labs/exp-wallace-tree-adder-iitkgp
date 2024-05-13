var COAVLD = COAVLD || {};
COAVLD.simpleLogic = COAVLD.simpleLogic || {};
COAVLD.simpleLogic.port = COAVLD.simpleLogic.port || {};
COAVLD.simpleLogic.node = COAVLD.simpleLogic.node || {};

COAVLD.simpleLogic.SimpleLogic = function SimpleLogic(canvas, overlayDiv) {
    var nodes = [];
    this.nodes = nodes;
    var dots = [];
    this.dots = dots;
    this.bb_x = 50;
    this.bb_y = 20;
    var canvasCtx = canvas.getContext("2d");
    this.overlayDiv = overlayDiv;
    var settings = {};
    settings.connectionWidth = 8;
    settings.connectionHeight = 10;
    if ('ontouchstart' in window || 'onmsgesturechange' in window) {
        settings.connectionWidth = 20;
        settings.connectionHeight = 20;
    }

    this.canvasWidth = 2000;
    this.canvasHeight = 400;

    this.eventHandlers = {};

    this.eventHandlers.mousedown = function mousedown(event) { // move object
        if (typeof event.target.connectingInput === "number") {
            this.connecting = {node: event.target.node, input: event.target.connectingInput};
            event.preventDefault();
        } else if (typeof event.target.connectingOutput === "number") {
            this.connecting = {node: event.target.node, output: event.target.connectingOutput};
            event.preventDefault();
        } else if (!this.draggingNode && event.target.node && (typeof event.target.node.propertys.mousedown !== "function" || !event.target.node.propertys.mousedown(event))) {
            this.draggingNode = event.target;
            document.getElementById("menu").style.opacity = "0.3";
            event.target.draggingStartX = event.clientX - Math.floor(event.target.getBoundingClientRect().left);
            event.target.draggingStartY = event.clientY - Math.floor(event.target.getBoundingClientRect().top);
            event.target.dragStartTime = Date.now();
            event.preventDefault();
        } else {
            this.backStartX = event.clientX;
            this.backStartY = event.clientY;
            this.dragBackground = true;
            document.body.style.cursor = "move";
        }
    }.bind(this);

    this.eventHandlers.mouseup = function mouseup(event) {
        var currentX = -parseInt(overlayDiv.style.left.slice(0, -2)) + 20 || 0,
                currentY = -parseInt(overlayDiv.style.top.slice(0, -2)) + 20 || 0;
        if (this.connecting) {
            if (typeof this.connecting.input === "number") {
                if (typeof event.target.connectingOutput === "number") {
                    this.connecting.node.addInput(event.target.node, event.target.connectingOutput, this.connecting.input);
                }
            } else {
                if (typeof event.target.connectingInput === "number") {
                    event.target.node.addInput(this.connecting.node, this.connecting.output, event.target.connectingInput);
                }
            }
        } else if (this.draggingNode && (this.draggingNode.node.x < currentX || this.draggingNode.node.y < currentY)) {
            this.removeNode(this.draggingNode.node);
            delete this.draggingNode;
            document.getElementById("menu").style.opacity = "";
        }

        // Only stop dragging if we have been dragging for more than half a second
        if (this.draggingNode && Date.now() - this.draggingNode.dragStartTime > 200) {
            delete this.draggingNode;
            document.getElementById("menu").style.opacity = "";
        }
        this.dragBackground = false;
        document.body.style.cursor = "";
        delete this.connecting;
    }.bind(this);

    this.eventHandlers.mousemove = function mousemove(event) {
        var returntrue;
        if (this.draggingNode && (typeof this.draggingNode.node.propertys.mousemove !== "function" || !this.draggingNode.node.propertys.mousemove(event, this.draggingNode))) {
            var x = event.clientX - Math.floor(overlayDiv.getBoundingClientRect().left) - this.draggingNode.draggingStartX,
                    y = event.clientY - Math.floor(overlayDiv.getBoundingClientRect().top) - this.draggingNode.draggingStartY;
            x = Math.round(x / 10) * 10;
            y = Math.round(y / 10) * 10;
            this.draggingNode.node.x = x;
            this.draggingNode.node.y = y;
            event.preventDefault();
            returntrue = true;
        }

        if (this.connecting)
            returntrue = true;

        if (this.dragBackground && !this.draggingNode) {
            var currentX = parseInt(overlayDiv.style.left.slice(0, -2)) || 0,
                    currentY = parseInt(overlayDiv.style.top.slice(0, -2)) || 0;

            overlayDiv.style.left = currentX + (event.clientX - this.backStartX) + "px";
            overlayDiv.style.top = currentY + (event.clientY - this.backStartY) + "px";

            this.backStartX = event.clientX;
            this.backStartY = event.clientY;

            event.preventDefault();
        }

        this.mouseX = event.clientX - Math.floor(overlayDiv.getBoundingClientRect().left);
        this.mouseY = event.clientY - Math.floor(overlayDiv.getBoundingClientRect().top);
        return returntrue;
    }.bind(this);

    this.eventHandlers.touchstart = function touchstart(event) {
        var ev = event.changedTouches[0];
        ev.preventDefault = function () {};
        this.eventHandlers.mousedown(ev);
    }.bind(this);

    this.eventHandlers.touchend = function touchend(event) {
        var ev = {
            clientX: event.changedTouches[0].clientX,
            clientY: event.changedTouches[0].clientY
        };
        ev.preventDefault = function () {};
        ev.target = document.elementFromPoint(ev.clientX, ev.clientY);
        this.eventHandlers.mouseup(ev);
    }.bind(this);

    this.eventHandlers.touchmove = function touchmove(event) {
        var ev = event.changedTouches[0];
        ev.preventDefault = function () {};
        if (this.eventHandlers.mousemove(ev)) {
            event.preventDefault();
        }
    }.bind(this);
    ;

    document.addEventListener("mousedown", this.eventHandlers.mousedown);
    document.addEventListener("mouseup", this.eventHandlers.mouseup);
    document.addEventListener("mousemove", this.eventHandlers.mousemove);
    document.addEventListener("touchstart", this.eventHandlers.touchstart);
    document.addEventListener("touchend", this.eventHandlers.touchend);
    document.addEventListener("touchmove", this.eventHandlers.touchmove);


    this.update = function () {
        var updateTime = Date.now();
        for (var node = 0; node < nodes.length; node++) {
            if (!nodes[node].lastUpdate || nodes[node].lastUpdate < updateTime) {
                nodes[node].update(updateTime);
            }
        }
    };

    this.addDot = function (type, x, y, id) {
        var dot = new COAVLD.simpleLogic.Dot({
            type: type,
            x: x,
            y: y,
            id: id,
        });
        dots.push(dot);
        return dot;
    };


    this.addNode = function (type, x, y) {
        var node = new COAVLD.simpleLogic.Node({
            type: type,
            x: x,
            y: y
        });
        nodes.push(node);
        return node;
    };

    this.removeNode = function (node) {
        for (var k = 0; k < nodes.length; k++) {
            if (nodes[k] === node) {
                var div = document.getElementById(nodes[k].id);
                if (div) {
                    div.parentNode.removeChild(div);
                }
                nodes.splice(k, 1);
                k--;
            } else {
                nodes[k].removeInput(node);
            }
        }
        delete this.draggingNode;
    };

    this.inputCoords = function inputCoords(node, input) {
        var image = node.propertys.getImage(node);
        var height = (image.height - node.propertys.inputs * settings.connectionHeight) / (node.propertys.inputs + 1);
        var x = node.x - 2,
                y = node.y + height * (input + 1) + input * settings.connectionHeight + settings.connectionHeight / 2;
        return [x, y];
    };

    this.outputCoords = function outputCoords(node, output) {
        var image = node.propertys.getImage(node);
        var height = (image.height - node.propertys.outputs * settings.connectionHeight) / (node.propertys.outputs + 1);
        var x = node.x + image.width + 2,
                y = node.y + height * (output + 1) + output * settings.connectionHeight + settings.connectionHeight / 2;
        return [x, y];
    };

    this.breadboard_old = function () {
        canvas.width = this.canvasWidth;
        canvas.height = this.canvasHeight;
//        canvasCtx.lineWidth = "5";
//        canvasCtx.beginPath();
//        canvasCtx.arc(100, 75, 50, 0, 2 * Math.PI);
//        canvasCtx.stroke();
        canvasCtx.beginPath();
        var gap = 20;
        for (var i = 10; i < this.bb_x * gap; i += gap) {
            for (var j = 10; j < this.bb_y * gap; j += gap) {
                canvasCtx.moveTo(i, j);
//                canvasCtx.fillRect(i,j,1,1);
                canvasCtx.arc(i, j, 1, 0, 2 * Math.PI, true);
                canvasCtx.fillStyle = "rgb(255, 255, 200)";
//                this.canvasWidth = this.canvasWidth + gap; //Math.max(this.canvasWidth, i);
//                this.canvasHeight = this.canvasHeight + gap; //Math.max(this.canvasHeight, j); 
//                canvas.width = canvas.width + gap;
//                canvas.height = canvas.height + gap;                                
            }
        }
        canvasCtx.stroke();
    };

    this.breadboard = function () {
        canvas.width = this.canvasWidth;
        canvas.height = this.canvasHeight;
        canvasCtx.lineWidth = "5";
        var gap = 20;
        var id = 0;
        for (var i = 10; i < this.bb_x * gap; i += gap) {
            for (var j = 10; j < this.bb_y * gap; j += gap) {
                id += 1;
                this.addDot('DOT', i, j, id);
            }
        }
        for (var k = 0; k < this.dots.length; k++) {
            var div = document.getElementById(dots[k].id);
            if (!div) {
                div = overlayDiv.appendChild(this.domElementOfDot(dots[k]));
            }
            div.style.position = "absolute";
            div.style.left = dots[k].x + "px";
            div.style.top = dots[k].y + "px";

//            for (var i = 0; i < nodes[k].inputs.length; i++) {
//                if (nodes[k].inputs[i]) {
//                    var inputCoords = this.inputCoords(nodes[k], i);
//                    var outputCoords = this.outputCoords(nodes[k].inputs[i].node, nodes[k].inputs[i].number);
//                    canvasCtx.beginPath();
//                    canvasCtx.moveTo(inputCoords[0], inputCoords[1]);
//                    canvasCtx.lineTo(outputCoords[0], outputCoords[1]);
//                    this.canvasWidth = Math.max(this.canvasWidth, Math.max(inputCoords[0], outputCoords[0]));
//                    this.canvasHeight = Math.max(this.canvasHeight, Math.max(inputCoords[1], outputCoords[1]));
//                    canvasCtx.strokeStyle = (nodes[k].inputs[i].node.outputs[nodes[k].inputs[i].number]) ? "rgb(55, 173, 50)" : "rgb(75, 37, 37)";
//                    canvasCtx.stroke();
//                }
//            }
        }
    };

    this.draw = function () {
        canvas.width = this.canvasWidth;
        canvas.height = this.canvasHeight;
        canvasCtx.lineWidth = "5";
        for (var k = 0; k < nodes.length; k++) {
            var div = document.getElementById(nodes[k].id);
            if (!div) {
                div = overlayDiv.appendChild(this.domElementOfNode(nodes[k]));
            }
            div.style.position = "absolute";
            div.style.left = nodes[k].x + "px";
            div.style.top = nodes[k].y + "px";

            for (var i = 0; i < nodes[k].inputs.length; i++) {
                if (nodes[k].inputs[i]) {
                    var inputCoords = this.inputCoords(nodes[k], i);
                    var outputCoords = this.outputCoords(nodes[k].inputs[i].node, nodes[k].inputs[i].number);
                    canvasCtx.beginPath();
                    canvasCtx.moveTo(inputCoords[0], inputCoords[1]);
                    canvasCtx.lineTo(outputCoords[0], outputCoords[1]);
                    this.canvasWidth = Math.max(this.canvasWidth, Math.max(inputCoords[0], outputCoords[0]));
                    this.canvasHeight = Math.max(this.canvasHeight, Math.max(inputCoords[1], outputCoords[1]));
                    canvasCtx.strokeStyle = (nodes[k].inputs[i].node.outputs[nodes[k].inputs[i].number]) ? "rgb(55, 173, 50)" : "rgb(75, 37, 37)";
                    canvasCtx.stroke();
                }
            }
        }

        if (this.connecting) {
            canvasCtx.beginPath();
            if (typeof this.connecting.output === "number") {
                var coords = this.outputCoords(this.connecting.node, this.connecting.output);
            } else {
                var coords = this.inputCoords(this.connecting.node, this.connecting.input);
            }
            canvasCtx.moveTo(coords[0], coords[1]);
            canvasCtx.lineTo(this.mouseX, this.mouseY);
            this.canvasWidth = Math.max(this.canvasWidth, Math.max(coords[0], this.mouseX));
            this.canvasHeight = Math.max(this.canvasHeight, Math.max(coords[1], this.mouseY));
            canvasCtx.lineWidth = "5";
            canvasCtx.strokeStyle = "rgb(44, 156, 143)";
            canvasCtx.stroke();
        }
    };

    this.domElementOfDot = function (dot) {
        var div = document.createElement("div");
        div.id = dot.id;
        div.className = "dotContainer";

        image = div.appendChild(dot.propertys.getImage(dot));
        image.dot = dot;
        image.className = "draw_dot position_dot";
        image.id = dot.id + "_image";

        return div;
    };


    this.domElementOfNode = function (node) {
        var div = document.createElement("div");
        div.id = node.id;
        div.className = "nodeContainer";

        image = div.appendChild(node.propertys.getImage(node));
        image.node = node;
        image.className = "draw_node position_node";
        image.id = node.id + "_image";

        var height = (image.height - node.propertys.inputs * settings.connectionHeight) / (node.propertys.inputs + 1);
        for (var i = 0; i < node.propertys.inputs; i++) {
            var input = document.createElement("div");
            input.className = "draw_connect_div";
            input.style.position = "absolute";
            input.style.height = settings.connectionHeight + "px";
            input.style.width = settings.connectionWidth + "px";
            input.style.left = -settings.connectionWidth + "px";
            input.style.top = height * (i + 1) + i * settings.connectionHeight + "px";
            input.node = node;
            input.connectingInput = i;
            input.addEventListener("click", function (number, event) {
                event.target.node.removeInput(number);
            }.bind(this, i));
            div.appendChild(input);
        }

        var height = (image.height - node.propertys.outputs * settings.connectionHeight) / (node.propertys.outputs + 1);
        for (var i = 0; i < node.propertys.outputs; i++) {
            var input = document.createElement("div");
            input.className = "draw_connect_div";
            input.style.position = "absolute";
            input.style.height = settings.connectionHeight + "px";
            input.style.width = settings.connectionWidth + "px";
            input.style.left = image.width + 2 + "px";
            input.style.top = height * (i + 1) + i * settings.connectionHeight + "px";
            input.node = node;
            input.connectingOutput = i;
            input.addEventListener("click", function (number, event) {
                this.removeConnectionsFromOutput(event.target.node, number);
            }.bind(this, i));
            div.appendChild(input);
        }

        return div;
    };

    this.removeConnectionsFromOutput = function removeConnections(node, number) {
        for (var k = 0; k < nodes.length; k++) {
            nodes[k].removeInput(node, number);
        }
    };

    this.tick = function () {
        // this.update();
        this.draw();
        requestAnimationFrame(this.tick);
    }.bind(this);
//
//    requestAnimationFrame(this.tick);

    this.play = function play() {
//        alert('hello!');
//        this.update();
        this.draw();
//        requestAnimationFrame(this.tick);
    }.bind(this);

    // function myFunction(element) {
    // 	// lstcolor = element.style.color;
    //  //  	if (lstcolor == 'red'){
    //  //  		element.style.color = 'green';
    //  //  	}
    //  //  	else{

    //  //  		element.style.color = 'red';
    //  //  	}
    //   	alert('hello!');
    // 	// this.play();
    // };

    btnElm = document.getElementById("play");
    // if (btnElm.addEventListener)
    btnElm.addEventListener("click", this.play);
    // else if (btnElm.attachEvent)
    // btnElm.attachEvent('onclick', this.play);
    // btnElm.onclick = function() {myFunction(btnElm)};

    // document.addEventListener("touchmove", this.eventHandlers.touchmove);

};

COAVLD.simpleLogic.Dot = function Dot(settings) {
    settings = settings || {};
    this.propertys = COAVLD.simpleLogic.dots[settings.type];
    this.propertys.type = settings.type;
    this.x = settings.x;
    this.y = settings.y;
    this.id = settings.id;
};

COAVLD.simpleLogic.Node = function Node(settings) {
    settings = settings || {};
    if (!COAVLD.simpleLogic.nodes[settings.type]) {
        throw "Unknown node type";
    }

    this.propertys = COAVLD.simpleLogic.nodes[settings.type];
    this.propertys.type = settings.type;

    this.inputNodes = {length: this.propertys.inputs};
    this.inputs = this.inputNodes;
    this.outputs = [];
    for (var k = 0; k < this.propertys.defaultOutputs; k++) {
        this.outputs[k] = this.propertys.defaultOutputs[k];
    }

    this.lastUpdated = Date.now();
    this.x = settings.x;
    this.y = settings.y;
    this.id = settings.type + "_" + Date.now();

    this.getInputs = function getInputs(time) {
        var inputs = [];
        for (var k = 0; k < this.propertys.inputs; k++) {
            if (this.inputNodes[k]) {
                if (this.inputNodes[k].lastUpdate < time) {
                    this.inputNodes[k].update(time);
                }
                inputs[k] = this.inputNodes[k].node.outputs[this.inputNodes[k].number];
            } else {
                inputs[k] = false;
            }
        }
        return inputs;
    };

    this.update = function (time) {
        this.lastUpdated = time;
        var inputs = this.getInputs(time);
        this.propertys.update(this, inputs, time);
    };

    this.addInput = function (node, nodeOutputNumber, inputNodeNumber) {
        this.inputNodes[inputNodeNumber] = {
            node: node,
            number: nodeOutputNumber
        };
    };

    this.removeInput = function (node, outputNumber) {
        if (typeof node !== "number") {
            for (var k = 0; k < this.inputNodes.length; k++) {
                if (this.inputNodes[k] && this.inputNodes[k].node == node && (typeof outputNumber !== "number" || this.inputNodes[k].number === outputNumber)) {
                    delete this.inputNodes[k];
                }
            }
        } else {
            delete this.inputNodes[node];
        }
    };
};

COAVLD.simpleLogic.getDotImage = function (width, height, border) {
    var ctx = COAVLD.utils.newCtx(width, height, "rgb(22, 112, 161)");
    ctx.beginPath();
    ctx.moveTo(width/2, height/2);
    ctx.arc(width/2, height/2, 1, 0, 2 * Math.PI, true);
    ctx.fillStyle = "rgb(255, 255, 200)";
    ctx.fill();
    return ctx.canvas;
};

COAVLD.simpleLogic.node.getBackground = function (width, height, border) {
    var ctx = COAVLD.utils.newCtx(width, height, "rgb(22, 112, 161)");
    ctx.beginPath();
    ctx.fillStyle = "rgb(22, 112, 161)";
    ctx.rect(border, border, width - border - border, height - border - border);
    ctx.fill();
    return ctx;
};

COAVLD.simpleLogic.port.getImage = function (text) {
    var width = 12 * text.length + 10, //32,
            height = 30; //50;
    var border = 1;
    var ctx = COAVLD.simpleLogic.node.getBackground(width, height, border);
    COAVLD.simpleLogic.port.textOnImage(ctx, text, border, height);
    return ctx.canvas;
};

COAVLD.simpleLogic.port.textOnImage = function (ctx, text, border, height) {
    ctx.beginPath();
    // var img = document.getElementById("image");
    // ctx.drawImage(img, 10, 10);
    ctx.font = "20px";
    ctx.fillStyle = "rgb(255, 255, 200)";
    ctx.fillText(text, border + border, height / 2 + 8);
};
