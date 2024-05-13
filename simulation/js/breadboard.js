var COAVLD = COAVLD || {};
COAVLD.simpleLogic = COAVLD.simpleLogic || {};
COAVLD.simpleLogic.dots = {
	DOT: {
		x: -1,
		y: -1,
		defaultOutputs: 'none',
		getImage: function (dot) {
			if (!dot.image) {
				dot.image = COAVLD.simpleLogic.getDotImage(30,30,1);
			}
			return dot.image;
		}
	}
};
