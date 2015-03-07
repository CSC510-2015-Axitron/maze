// mazeMenu test file for nodejs mocha and chai
// use jsdom for browser simulation
// Internal mock objects are creted to test mazeMenu

var assert = require('chai').assert;
//var jsdom = require('jsdom');
//window = jsdom.jsdom().parentWindow;
//$ = require('jquery')(window);

// Use cheerio because of its better Jquery like selectors!
//var cheerio = require('cheerio');
//$ = cheerio.load('<ul id = "dsp_levels"></ul><ul id = "dsp_time"></ul><ul id = "dsp_steps"></ul><ul id = "dsp_lives"></ul>');

//document mock object
document = {
	width: function() {return 640;},
	height: function() {return 400;}
};

//window mock object
window = {
	width: function() {return 700;},
	height: function() {return 500;}
};

//tell Node.js to forget jQuery because it won't work here!
//delete require.cache[require.resolve('jquery.js')];

//jQuery simulator
$ = function(obj) {

	var components = {
		0: {
			width: function() {return 40;},
			height: function() {return 10;}
		},
		css: function(a,b) {
			//set css here
		},
		text: function(a) {
			this.dummpyDsp = a;
		}
	}
	
	if (typeof obj == 'string') {
		return components;
	}
	else
	{
		return obj;
	}
}


//Amaze model mock object
AMaze = {};
AMaze.model = {
	N_CONST:1,E_CONST:2,S_CONST:4,W_CONST:8,
	Maze: function() {
		this.movePlayer = function(dir) {
			return dir;
		};
	},
	load: function(filename, func) {
		var load = new AMaze.model.Maze();
		func(load);
	}
};
AMaze.render = function() {};
AMaze.render.MazeRenderer = function(a) {
	this.refresh = function() {};
	this.createTrailModel = function() {};
	this.drawMaze = function() {};
};


//Keyboard input mock object
Input = {id: "the input",Up: "up", Bottom: "bottom", Left: "left", Right: "right"};

//CE Canvas Engine mock object
CE = {content: {}};
CE.defines = function(name) {

	//parameterize CE.defines() object!
	var a = {id: name}

	//prepare CE.defines().extend() mock object
	a.extend = function(input) {

		//prepare CE.defines().extend().Scene object
		input.Scene = {
			new: function(d){CE.content = d;},
		};

		//prepare CE.defines().extend().ready() object
		input.ready = function() {
			var d = {};
			d.Scene = {
				call: function(e) {this.content = e;}
			}
			return d;
		};

		input.Input = {
			keyUp: function (a, func) {
				this.cursor = a;
				func(a);
			}
		}
		
		return input;
	}

	return a;
}

//JS confirm mock object
confirm = function(a){return true;}


var menu = require('./../mazeMenu.js');


describe('Maze menu test', function() {
	before (function () {
		menu.resetStatus();
	});
	describe('Load maze menu', function() {
		it ('should load global parameters', function() {
			assert.equal(currentLevel, 0); 
		});
	});
	describe('Maze directory', function() {
		it ('should have four sizes', function() {
			assert.equal(Object.keys(mazeDirectory).length, 4);
		});
		it ('maze no. should be -1', function() {
			assert.equal(currentMaze, -1);
		});
	});
	describe('When loading AMaze model', function() {
		it ('should load Canvas', function() {

			AMaze.model.load(currentMazeFile, function(obj) {menu.setGameCanvas(obj)});
			AMaze.model.userData = new menu.userData(Date.now());

			assert.equal(CE.content.name, "MyScene");
		});
	});
	describe('Execute jQuery callback function', function() {

		it ('maze no. should be 0', function() {

			currentMazeFile =  menu.getNextMaze();
			assert.equal(currentMaze, 0);
		});

		it ('should load first maze', function() {
			var mazeKeyArray = Object.keys(mazeDirectory);
			var mazeArray = mazeDirectory[mazeKeyArray[currentLevel]];
			assert.equal(currentMazeFile, "./levels/"+mazeKeyArray[currentLevel]+"/"+mazeArray[currentMaze]+".json");
		});

		it ('should load second maze', function() {

			currentMazeFile = menu.getNextMaze();

			var mazeKeyArray = Object.keys(mazeDirectory);
			var mazeArray = mazeDirectory[mazeKeyArray[currentLevel]];
			assert.equal(currentMazeFile, "./levels/"+mazeKeyArray[currentLevel]+"/"+mazeArray[1]+".json");
		});

		it ('should load each maze', function() {

			currentMazeFile = menu.getNextMaze();
			currentMazeFile = menu.getNextMaze();
			currentMazeFile = menu.getNextMaze();
			currentMazeFile = menu.getNextMaze();
			currentMazeFile = menu.getNextMaze();
			currentMazeFile = menu.getNextMaze();
			currentMazeFile = menu.getNextMaze();
			currentMazeFile = menu.getNextMaze();
			currentMazeFile = menu.getNextMaze();

			var mazeKeyArray = Object.keys(mazeDirectory);
			var mazeArray = mazeDirectory[mazeKeyArray[currentLevel]];
			assert.equal(currentMazeFile, "./levels/"+mazeKeyArray[currentLevel]+"/"+mazeArray[currentMaze]+".json");
		});
	});
	
	describe('When proceed for 2 second', function() {
		it ('timer should display 00:02', function() {
			setTimeout(function(){

				AMaze.model.userData.displayMinSec();
				assert.equal(AMaze.model.userData.getMinSec(), '00:02');
			
			}, 2000);
		});
		it ('shuld only check timer every 10 cycles', function() {

			AMaze.model.userData.displayMinSec();
			AMaze.model.userData.displayMinSec();
			AMaze.model.userData.displayMinSec();
			AMaze.model.userData.displayMinSec();
			AMaze.model.userData.displayMinSec();
			AMaze.model.userData.displayMinSec();
			AMaze.model.userData.displayMinSec();
			AMaze.model.userData.displayMinSec();
			AMaze.model.userData.displayMinSec();
			AMaze.model.userData.displayMinSec();
			AMaze.model.userData.displayMinSec();
			AMaze.model.userData.displayMinSec();

			assert.equal(AMaze.model.userData.getMinSec(), '00:00');
		});
	});

	describe('When proceed 2 sptes', function() {
		it ('steps should be 2', function() {

			AMaze.model.hasPlayerWon = function() {return 0;}

			menu.updateStatus(AMaze.model);
			menu.updateStatus(AMaze.model);

			assert.equal(AMaze.model.userData.step, 2);
		});
		it ('shuld not exceed 999', function() {

			AMaze.model.userData.step = 999;
			menu.updateStatus(AMaze.model);
			menu.updateStatus(AMaze.model);

			assert.equal(AMaze.model.userData.step, 999);
		});
	});

	describe('When player wins', function() {

		it ('window should popu up', function() {

			AMaze.model.hasPlayerWon = function() {return 1;}

			menu.updateStatus(AMaze.model);
			AMaze.model.userData.TimerOn();
			AMaze.model.userData.TimerOff();
			AMaze.model.userData.displayMinSec();

			assert.equal(AMaze.model.hasPlayerWon(),true);
		});

		it ('timer should stop at 00:02', function() {
			setTimeout(function(){
				assert.equal(AMaze.model.userData.getMinSec(), '00:02');
			}, 2000);
		});
	});

	describe('Test canvas function', function() {

		it ('canvas scene should be ready', function() {

			var testModel;
			menu.setGameCanvas(testModel = new AMaze.model.Maze());

			testModel.hasPlayerWon = function() {return 1;}

			CE.content.ready(null);

			assert.equal(AMaze.model.hasPlayerWon(),true);
		});

		it ('should process key strokes', function() {

			var testModel;
			menu.setGameCanvas(testModel = new AMaze.model.Maze());

			testModel.hasPlayerWon = function() {return 1;}

			//simulate key pressed
			AMaze.model.N_CONST = 0;
			AMaze.model.S_CONST = 1;
			AMaze.model.E_CONST = 1;
			AMaze.model.W_CONST = 1;

			CE.content.ready(null);

			//simulate key pressed
			AMaze.model.N_CONST = 1;
			AMaze.model.S_CONST = 0;
			AMaze.model.E_CONST = 1;
			AMaze.model.W_CONST = 1;

			CE.content.ready(null);

			//simulate key pressed
			AMaze.model.N_CONST = 1;
			AMaze.model.S_CONST = 1;
			AMaze.model.E_CONST = 0;
			AMaze.model.W_CONST = 1;

			CE.content.ready(null);

			//simulate key pressed
			AMaze.model.N_CONST = 1;
			AMaze.model.S_CONST = 1;
			AMaze.model.E_CONST = 1;
			AMaze.model.W_CONST = 0;

			CE.content.ready(null);

			assert.equal(AMaze.model.hasPlayerWon(),true);

		});

		it ('canvas scene should render', function() {

			var testModel;
			menu.setGameCanvas(testModel = new AMaze.model.Maze());

			testModel.hasPlayerWon = function() {return 1;}

			var stage = {

				refresh: function() {
					this.result = true;
				}
			}

			CE.content.ready(null);
			CE.content.render(stage)

			assert.equal(stage.result,true);
		});

	});


	//release AMaze model and CE mock object otherwise tests files would fail!
	after(function() {

		AMaze = {};
		CE = {};
		window = {};
	});
});
