// mazeMenu test file for nodejs mocha and chai
// this file should be executed after test-mazeModel
// mock objects are created for AMaze, jQuery, and Canvas Engine
// expand document, window and $() to test css and other html components 

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
	height: function() {return 400;},
	getElementById: function () {return {addEventListener: function() {}};}
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

	this.components = {
		0: {
			width: function() {return 40;},
			height: function() {return 10;}
		},
		css: function(a,b) {
			//set css here
		},
		text: function(a) {
			this.dummpyDsp = a;
		},
		on: function(a, func) {
			//event object
			var event = {
				preventDefault: function() {this.preventDefaultStatus = true;}
			}
			func(event);
		}
	}
	
	if (typeof obj == 'string') {

		if (obj.match(/^#.+/)) //check if obj is html components
		{
			components.removeClass = function(a) {this.removeclassStatus = "a";} //add to the status 
			components.val = function() {return "input string";}
			components.click = function(a) {
				a();
			}
			components.show = function() {
				this.status = "showed";
			}
			components.hide = function() {
				this.status = "hidden";
			}
			components.dialog = function(obj) {
				this.dialogContent = obj; 
				return this;
			}
			components.find = function(obj) {
				//assume obj is found
				return this;
			}
			return components;
		}
		else
			return components;
	}
	else if (typeof obj == 'function')
	{
		obj();
	}
	else
	{
		obj.on = function() {return obj;}
		obj.scrollTop = function(a) {return obj;}
		obj.scrollLeft = function(a) {return obj;}

		return obj;
	}
}

$.getJSON = function(filename, options, func) {
        var obj = require(filename);        
        func(obj);
}

// ajax mock object, do not test remote db, assume it works
$.ajax = function(obj) {

		var url = "http://axemaze-db.herokuapp.com";
		var responseText;
		
		if (obj.url == url+"/categories")
		{
			responseText = '[{"id": 1,"name": "Small Mazes (5-10)"},{"id": 101,"name": "Medium Mazes (10-20)"},{"id": 201,"name": "Large Mazes (20-30)"},{"id": 301,"name": "Huge Mazes (30+)"}]';
		}
		else if (obj.url == url+"/mazes/category/1")
		{
			responseText = '{"category": 1,"categoryName": "Small Mazes (5-10)","mazes": [{"mazeno": 19,"displayName": "Dungeon of Smallness"}]}';
		}
		else if (obj.url == url+"/mazes/category/101")
		{
			responseText = '{"category": 101,"categoryName": "Medium Mazes (10-20)","mazes": []}';
		}
		else if (obj.url == url+"/mazes/category/201")
		{
			responseText = '{"category": 201,"categoryName": "Large Mazes (20-30)","mazes": []}';
		}
		else if (obj.url == url+"/mazes/category/301")
		{
			responseText = '{"category": 301,"categoryName": "Huge Mazes (30+)","mazes": []}';
		}
		else if (obj.url == url+"/mazes")
		{
			responseText = '1';
		}
		else if (obj.url == url+"/maze/19")
		{
			responseText = '{"mazeno": 19,"displayName": "Dungeon of Smallness","userForMaze": null,"height": 3,"width": 2,"mazeJSON": "{\\\"width\\\":2,\\\"height\\\":3,\\\"start\\\":[0,1],\\\"end\\\":[1,2],\\\"board\\\":[[6,5,6],[12,1,8]]}","category": 1}';
		}
		else responseText = '{"response": "none"}';

		var httpObj = {responseText: responseText};
		return httpObj;
}

// jquery cookie
$.cookie = function(name, cookie, params) {this.cookieStatus = "created";this.name = name; this.cookie = cookie, this.params = params;}
$.removeCookie = function(name, params){this.cookieStatus = 'removed';}

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
	},
	inject: function(obj, func) {
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

		input.Sound = {
			file: "",
			playLoop: function(a) {
				input.Sound.file = a;
			}
		}
		
		return input;
	}

	return a;
}

//buzz.js mock object
buzz = {
	soundFile: '',
	status: '',
	isLoop: false
}
buzz.isSupported = function() {return true;}
buzz.sound = function(a) {this.soundFile = a;}
buzz.sound.prototype.play = function() {buzz.status = "played";}
buzz.sound.prototype.loop = function() {buzz.isLoop = true;}
buzz.sound.prototype.stop = function() {buzz.status = "stopped";}
buzz.sound.prototype.pause = function() {buzz.status = "paused";}


//JS confirm mock object
confirm = function(a){return true;}

//remoteDB mock object
remoteDB = {
	user: "anonymous",
	pass: "",
	token:"",
	userID:0,
	sessionTimeout: 20, //20 mins, should be close enough < 30
	isLogon: false,
	url: "http://axemaze-db.herokuapp.com",

	categories: [], 		// url/categories
	mazeCategory: [,,,],    // url/mazes/category/:id
	mazeTotal: 0,			// url/mazes

	currMazeID: 0,			// current maze ID
	currMazeObj: {},		// url/maze/:id

	userMazeCategory: [],	// user-created mazes

	sessionHandler: 0,

	HTTPGet: function(path) {
		return JSON.parse($.ajax({
			type: "GET",
			url: this.url+path,
			async: false,
			headers: {
				"authorization":remoteDB.token,
				"content-type":"application/json"
			}
		}).responseText);

	},
	HTTPGetAsync: function(path, func) {
		$.ajax({
			type: "GET",
			url: this.url+path,
			headers: {
				"authorization":remoteDB.token,
				"content-type":"application/json"
			},
			success: function(data) {func(data);},
			error: function(data) {func(JSON.parse(data.responseText));}
		});
	},
	HTTPPost: function(path, datas) {
		return JSON.parse($.ajax({
			type: "POST",
			data: JSON.stringify(datas),
			url: this.url+path,
			async: false,
			headers: {
				"authorization":remoteDB.token,
				"content-type":"application/json"
			}
		}).responseText);

	},
	HTTPPostAsync: function(path, datas, func) {
		$.ajax({
			type: "POST",
			data: JSON.stringify(datas),
			url: this.url+path,
			headers: {
				"authorization":remoteDB.token,
				"content-type":"application/json"
			},
			success: function(data) {func(data);},
			error: function(data) {func(JSON.parse(data.responseText));}
		});
	},

	verifyCookie: function(cookie) {
		if (typeof cookie == "undefined") return false;
		this.token = cookie.token; //check in token first
		if (this.HTTPGet("/keepalive").response == true) {
			this.user = cookie.email;
			this.userID = cookie.userID;
			this.isLogon = true;
			this.startSession();
			return true;
		}
		else {
			remoteDB.user = "anonymous";
			remoteDB.token = "";
			remoteDB.userID = 0;
			remoteDB.isLogon = false;
			clearInterval(this.sessionHandler);
			return false;
		}
	},

	startSession: function() {
		this.sessionHandler = setInterval(function() {
			remoteDB.HTTPGetAsync("/keepalive", function(e) {
				if (e.response != true) {
					remoteDB.logout();
				}
			});
		}, this.sessionTimeout*60*1000);
	},

	login: function(email, token, userID) {
		this.user = email;
		this.token = token;
		this.userID = userID;
		this.isLogon = true;
		this.startSession();

		//retrieve user owned mazes
		this.getCategoryByUserID(this.userID);
	},

	logout: function() {

		if (this.HTTPGet("/logout").response === "logged out") {
			remoteDB.user = "anonymous";
			remoteDB.token = "";
			remoteDB.userID = 0;
			remoteDB.isLogon = false;
			clearInterval(this.sessionHandler);
			return true;
		}
		else return false;
	},

	initiate: function() {

		//fetch categories
		this.categories = this.HTTPGet("/categories");

		//fetch maze count
		this.mazeTotal = this.HTTPGet("/mazes").mazes;

		//load first level
		this.mazeCategory[0] = this.HTTPGet("/mazes/category/1");

		//use async AJAX to load the rest of categories
		for (var i = 1; i < this.categories.length; ++i)
		{
			this.HTTPGetAsync("/mazes/category/"+this.categories[i].id.toString(), function(e){remoteDB.mazeCategory[i] = e;});
		}

	},

	// get maze by maze no and start the level, will not check maze availability, assume chosen from predefined mazeno array
	getMazeByMazeno: function(mazeno) {
		maze.userData.TimerOff(); //stop the timer
		var obj = this.HTTPGet("/maze/"+(this.currMazeID=mazeno).toString());
		this.currMazeObj = JSON.parse(obj.mazeJSON);
		AMaze.model.inject(remoteDB.getCurrentMaze(), setGameCanvas);
	},

	getCategoryByUserID: function(id) {
		this.HTTPGetAsync("/mazes/user/"+id.toString(), function(e) {
			if (e.response !== "Not Found") {
				userMazeCategory = e;
			}
		});
	},

	getNextMaze: function() {

		++currentMaze;

		if (currentMaze >= this.mazeTotal)
		{
			//Final winning thing goes here!
			this.currMazeID = this.mazeCategory[currentLevel = 0].mazes[currentMaze = 0].mazeno;
		}
		else
		{

			var notFound = true;
			var count = 0;

			// Do not check integrity of remote DB here!
			while (notFound) {
				for (var i = 0; i < currentLevel; ++i) {
					count += this.mazeCategory[i].mazes.length;
				}

				if (currentMaze < count + this.mazeCategory[currentLevel].mazes.length) {
					this.currMazeID = this.mazeCategory[currentLevel].mazes[currentMaze - count].mazeno;;
					notFound = false;
				}
				else ++currentLevel;
			}
		}

		var obj = this.HTTPGet("/maze/"+this.currMazeID.toString());
		this.currMazeObj = JSON.parse(obj.mazeJSON);
		currentMazeFile = obj.displayName;

		return this.currMazeObj;
	},

	getCurrentMaze: function() {
		return this.currMazeObj;
	},

	updateStatus: function(time, steps) {
		if (this.isLogon)
		{
			this.HTTPPostAsync("/play/"+this.currMazeID.toString()+"/"+this.userID.toString(), {time: time, steps: steps}, function(){});
		}
	}
}

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
		it ('after callback maze no. should be 0', function() {
			assert.equal(currentMaze, 0);
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

		it ('maze no. should be 1', function() {

			currentMazeFile =  menu.getNextMaze();
			assert.equal(currentMaze, 1);
		});

		it ('should load second maze file', function() {
			var mazeKeyArray = Object.keys(mazeDirectory);
			var mazeArray = mazeDirectory[mazeKeyArray[currentLevel]];
			assert.equal(currentMazeFile, "./levels/"+mazeKeyArray[currentLevel]+"/"+mazeArray[currentMaze]+".json");
		});

		it ('proceeding to next level should load third maze file', function() {

			currentMazeFile = menu.getNextMaze();

			var mazeKeyArray = Object.keys(mazeDirectory);
			var mazeArray = mazeDirectory[mazeKeyArray[currentLevel]];
			assert.equal(currentMazeFile, "./levels/"+mazeKeyArray[currentLevel]+"/"+mazeArray[2]+".json");
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
		it ('should only check timer every 10 cycles', function() {

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

	describe('When proceed 2 steps', function() {
		it ('steps should be 2', function() {

			AMaze.model.hasPlayerWon = function() {return 0;}

			menu.updateStatus(AMaze.model);
			menu.updateStatus(AMaze.model);

			assert.equal(AMaze.model.userData.step, 2);
		});
		it ('should not exceed 999', function() {

			AMaze.model.userData.step = 999;
			menu.updateStatus(AMaze.model);
			menu.updateStatus(AMaze.model);

			assert.equal(AMaze.model.userData.step, 999);
		});
	});

	describe('When player wins', function() {

		it ('window should pop up if enabled', function() {

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

		it ('should update score', function() {

			var testModel  = new AMaze.model.Maze();

			testModel.hasPlayerWon = function() {return 1;}

			testModel.userData = new menu.userData(Date.now());
			testModel.gameData = menu.gameData;

			currentMaze = 2;
			testModel.userData.TimerOff();
			menu.updateStatus(testModel);

			assert.equal(testModel.gameData.getScore() > 0, true);
		});
	});

	describe('Before cavnas is ready', function() {

		it ('music should not play', function() {
			assert.equal(Input.Sound.file == '', true);
		});
	});

	describe('When canvas is ready', function() {

		it ('canvas scene should be ready', function() {

			var testModel;
			menu.setGameCanvas(testModel = new AMaze.model.Maze());

			testModel.hasPlayerWon = function() {return 1;}

			CE.content.ready(null);

			assert.equal(AMaze.model.hasPlayerWon(),true);
		});

		it ('Canvas music should not play', function() {

			assert.equal(Input.Sound.file == '', true);
		});

		it ('buzz music should play', function() {

			assert.equal(buzz.status == 'played', true);
		});

		it ('should process key strokes', function() {

			var testModel;
			menu.setGameCanvas(testModel = new AMaze.model.Maze());

			testModel.hasPlayerWon = function() {return 0;}

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

			testModel.hasPlayerWon = function() {return 0;}

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

	describe('soundWizzard Test', function() {

		describe('when browser does not support sound', function() {

			before(function() {
				buzz.isSupported = function() {return false;}
				buzz.status = '';
				menu.soundWizzard.initiate();
			});

			it('sound feature should be disabled', function() {
				assert.equal(menu.soundWizzard.isActive,false);
			});

			it('should not play music', function() {

				menu.soundWizzard.playMusic();
				assert.equal(buzz.status == '',true);
			});

			it('stopMusic() function should have no effect', function() {

				menu.soundWizzard.stopMusic();
				assert.equal(buzz.status == '',true);
			});

			it('pauseMusic() function should have no effect', function() {

				menu.soundWizzard.pauseMusic();
				assert.equal(buzz.status == '',true);
			});
		});

		describe('when browser supports sound', function() {
			before(function() {
				buzz.isSupported = function() {return true;}
				buzz.status = '';
				menu.soundWizzard.initiate();
			});

			it('Buzz sound engine should be on', function() {
				assert.equal(menu.soundWizzard.isActive,true);
			});

			it('pauseMusic() function should pause music', function() {
				menu.soundWizzard.playMusic();
				menu.soundWizzard.pauseMusic();
				assert.equal(buzz.status == 'paused',true);
			});
		});
	});


	//release AMaze model and CE mock object otherwise tests files would fail!
	after(function() {

		AMaze = {};
		CE = {};
		window = {};
	});
});
