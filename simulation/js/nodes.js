var COAVLD = COAVLD || {};
COAVLD.simpleLogic = COAVLD.simpleLogic || {};
COAVLD.simpleLogic.nodes = {
	AND: {
		inputs: 2,
		outputs: 1,
		defaultOutputs: [false],
		update: function (node, inputs, time) {
			node.outputs[0] = inputs[0] && inputs[1];
		},
		getImage: function (node) {
			if (!node.image) {
				node.image = COAVLD.simpleLogic.port.getImage("AND");
			}
			return node.image;
		}
	},
	NAND: {
		inputs: 2,
		outputs: 1,
		defaultOutputs: [false],
		update: function (node, inputs, time) {
			node.outputs[0] = !(inputs[0] && inputs[1]);
		},
		getImage: function (node) {
			if(!node.image) {
				node.image = COAVLD.simpleLogic.port.getImage("NAND");
			}
			return node.image;
		}
	},
	OR: {
		inputs: 2,
		outputs: 1,
		defaultOutputs: [false],
		update: function (node, inputs, time) {
			node.outputs[0] = inputs[0] || inputs[1];
		},
		getImage: function (node) {
			if (!node.image) {
				node.image = COAVLD.simpleLogic.port.getImage("OR");
			}
			return node.image;
		}
	},
	NOR: {
		inputs: 2,
		outputs: 1,
		defaultOutputs: [false],
		update: function (node, inputs, time) {
			node.outputs[0] = !(inputs[0] || inputs[1]);
		},
		getImage: function (node) {
			if(!node.image) {
				node.image = COAVLD.simpleLogic.port.getImage("NOR");
			}
			return node.image;
		}
	},
	XOR: {
		inputs: 2,
		outputs: 1,
		defaultOutputs: [false],
		update: function (node, inputs, time) {
			node.outputs[0] = inputs[0] ? !inputs[1] : inputs[1];
		},
		getImage: function (node) {
			if(!node.image) {
				node.image = COAVLD.simpleLogic.port.getImage("XOR");
			}
			return node.image;
		}
	},
	XNOR: {
		inputs: 2,
		outputs: 1,
		defaultOutputs: [false],
		update: function (node, inputs, time) {
			node.outputs[0] = inputs[0] ? inputs[1] : !inputs[1];
		},
		getImage: function (node) {
			if(!node.image) {
				node.image = COAVLD.simpleLogic.port.getImage("XNOR");
			}
			return node.image;
		}
	},
	NOT: {
		inputs: 1,
		outputs: 1,
		defaultOutputs: [false],
		update: function (node, inputs, time) {
			node.outputs[0] = !inputs[0];
		},
		getImage: function (node) {
			if (!node.image) {
				node.image = COAVLD.simpleLogic.port.getImage("NOT");
			}
			return node.image;
		}
	},
	BITSwitch: {
		inputs:0,
		outputs: 1,
		defaultOutputs: [false],
		update: function (node, inputs, time) {
		},
		getImage: function (node) {
			if (!node.image) {
				var ctx = COAVLD.simpleLogic.node.getBackground(40, 40, 5);
				ctx.beginPath();
				ctx.arc(20, 20, 15, 0, 2 * Math.PI);
				ctx.fillStyle = "rgb(219, 43, 64)";
				ctx.fill();
				node.image = ctx.canvas;
				node.ctx = ctx;
				// this.outputs = false;
			}
			node.image.addEventListener("mousemove", function (event) {
				var relX = event.clientX - Math.floor(event.target.getBoundingClientRect().left),
				relY = event.clientY - Math.floor(event.target.getBoundingClientRect().top);
				if ((relX - 25) * (relX - 25) + (relY - 25) * (relY - 25) < 225) {
					event.target.style.cursor = "pointer";
				} else {
					event.target.style.cursor = "auto";
				}
			});
			node.image.addEventListener("click", function (event) {
				var relX = event.clientX - Math.floor(event.target.getBoundingClientRect().left),
				relY = event.clientY - Math.floor(event.target.getBoundingClientRect().top);
				if ((relX - 25) * (relX - 25) + (relY - 25) * (relY - 25) < 225) {
					event.target.node.outputs[0] = !event.target.node.outputs[0];
					event.target.node.pressed = false;
					event.target.node.ctx.beginPath();
					event.target.node.ctx.arc(20, 20, 15, 0, 2 * Math.PI);
					if (event.target.node.outputs[0] == false){
						event.target.node.ctx.fillStyle = "rgb(219, 43, 64)";
						// this.ctx.fillText("0", border + border, height / 2 + 8);
					}
					else{
						event.target.node.ctx.fillStyle = "rgb(43, 219, 64)";
						// this.ctx.fillText("1", border + border, height / 2 + 8);
					}
					event.target.node.ctx.fill();
					// if (this.outputs[0] == false){
					// 	this.ctx.fillText("0", border + border, height / 2 + 8);
					// }
					// else{
					// 	this.ctx.fillText("1", border + border, height / 2 + 8);
					// }
				}
			});
			return node.image;
		},
		mousemove: function (event, nodeDiv) {
			if (nodeDiv.node.pressed) {
				return true;
			}
			return false;
		},
		// mousedown: function (event) {
		// 	var relX = event.clientX - Math.floor(event.target.getBoundingClientRect().left),
		// 		relY = event.clientY - Math.floor(event.target.getBoundingClientRect().top);
		// 	if ((relX - 25) * (relX - 25) + (relY - 25) * (relY - 25) < 225) {
		// 		event.target.node.pressed = true;
		// 		// event.target.node.outputs[0] = true;
		// 		// event.target.node.ctx.beginPath();
		// 		// event.target.node.ctx.arc(25, 25, 15, 0, 2 * Math.PI);
		// 		// event.target.node.ctx.fillStyle = "rgb(165, 26, 43)";
		// 		// event.target.node.ctx.fill();
		// 	}
		// }
	},
	BITDisplay: {
		inputs: 1,
		outputs: 0,
		update: function (node, inputs, time) {
			if (!node.ctx) {
				node.propertys.getImage(node);
			}
			node.lastInput = inputs[0];
			if (inputs[0] == true){ //!== inputs[0]) {
				// if (inputs[0]) {
				node.ctx.beginPath();
				node.ctx.arc(20, 20, 15, 0, 2 * Math.PI);
				node.ctx.fillStyle = "rgb(43, 219, 64)";
				node.ctx.fill();
			} else {
				node.ctx.beginPath();
				node.ctx.arc(20, 20, 15, 0, 2 * Math.PI);
				node.ctx.fillStyle = "rgb(219, 43, 64)";
				node.ctx.fill();
			}
			// }
		},
		getImage: function (node) {
			if (!node.image) {
				var ctx = COAVLD.simpleLogic.node.getBackground(40, 40, 5);
				ctx.beginPath();
				ctx.arc(20, 20, 15, 0, 2 * Math.PI);
				ctx.fillStyle = "rgb(255, 255, 255)";
				ctx.fill();
				node.image = ctx.canvas;
				node.ctx = ctx;
			}
			return node.image;
		}
	},
};
