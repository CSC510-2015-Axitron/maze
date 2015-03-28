//
// Amazing mazes menu
//

//
// Global parameters & constants
//
currentMazeFile = '';
currentLevel = 0; //small, medium, large, huge, etc...
currentMaze = -1;  //the order of maze in which they appear in the directory

//
// Enter maze json files here
// Please leave out '.json' file extension
//
mazeDirectory =
{
	'small': ['maze1_2x3','maze2_3x3','maze3_10x10','maze4_10x10','maze5_8x5','maze6_10x5','maze7_4x7','maze8_10x10'],
	'medium': [],
	'large': [],
	'huge': []
};

var categories =[
    {
        "id": 1,
        "name": "Small Mazes (5-10)"
    },
    {
        "id": 101,
        "name": "Medium Mazes (10-20)"
    },
    {
        "id": 201,
        "name": "Large Mazes (20-30)"
    },
    {
        "id": 301,
        "name": "Huge Mazes (30+)"
    }
];

var localDB = false; //change to false to access remoteDB
var inputLock = false; //input device lock
var mouseAction = {};

//
// Unified interface for remote DB
//
var remoteDB = {
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
			success: function(data) {console.log(data); func(data);},
			error: function(data) {func(JSON.parse(data.responseText));}
		});
	},

	login: function(email, token, userID) {
		this.user = email;
		this.token = token;
		this.userID = userID;
		this.isLogon = true;
		this.sessionHandler = setInterval(function() {
			this.HTTPGetAsync("/keepalive", function(e) {
				if (e.response != true) {
					this.logout();
				}
			});
		}, this.sessionTimeout*60*1000);

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
		this.currentMaze = JSON.parse(obj.mazeJSON);
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
		this.currentMaze = JSON.parse(obj.mazeJSON);
		currentMazeFile = obj.displayName;

		return this.currentMaze;
	},

	getCurrentMaze: function() {
		return this.currentMaze;
	},

	updateStatus: function(time, steps) {
		if (this.isLogon)
		{
			this.HTTPPostAsync("/play/"+this.currMazeID.toString()+"/"+this.userID.toString(), {time: time, steps: steps}, function(){});
		}
	}
}

// store data per game!
var gameData = new function() {
	this.totalStep = 0;
	this.totalTime = 0;
	this.totalScore = 0;
	this.currentSteps;
	this.currentTime;

	this.keepStep = function(a) {this.totalStep += (this.currentSteps = a);}
	this.keepTime = function(a) {this.totalTime += (this.currentTime = a);}

	// score formula
	this.getScore = function() {
		var a = Math.round(50 * (1 + currentMaze * 0.6) - this.currentSteps - this.currentTime * 3);
		this.totalScore += ((a < 0)? 0:a);
		return this.totalScore;
	}
}


//Enter current level and maze number
//Return the next maze json file
function getNextMaze() {

	var mazeKeyArray = Object.keys(mazeDirectory);
	var mazeArray = [];

	while (currentLevel < mazeKeyArray.length) {

		mazeArray = mazeDirectory[mazeKeyArray[currentLevel]];

		if (currentMaze < mazeArray.length - 1)
		{
			++currentMaze;
			return "./levels/"+mazeKeyArray[currentLevel]+"/"+mazeArray[currentMaze]+".json";
		}

		++currentLevel;
		currentMaze = -1;
	}

	currentLevel = 0

	return getNextMaze(); //return a maze anyway
}

//
// Tasks should be done at each step
// 1. update step counts
// 2. check if player has won
// 3. if play has won, display high score
// Here parameter maze is the maze object created in setGameCanvas
//
function updateStatus(maze) {

	if (maze.hasPlayerWon()) {

		soundWizzard.stopMusic();
		soundWizzard.playWinner();
		maze.userData.TimerOff(); //stop the timer
		inputLock = mouseAction.inputLock = true; //lock input device
		remoteDB.updateStatus(gameData.currentTime, gameData.currentSteps);

		setTimeout(function() {

			$("#dsp_score").text(maze.gameData.getScore());

		//if (confirm("Congratulations!\nYou have completed this level!\nProceed to next maze?"))
		//{
			if (localDB) AMaze.model.load(currentMazeFile = getNextMaze(), setGameCanvas);
			else AMaze.model.inject(remoteDB.getNextMaze(), setGameCanvas);

			soundWizzard.playMusic();
			inputLock = mouseAction.inputLock = false; //unlock input device
		//}
		}, soundWizzard.winnerPause);
	}

	soundWizzard.playStep();
	maze.userData.keepStep();
	$("#dsp_steps").text(maze.userData.step);

	//additional status check goes here
}

// reset status at the beginning of each level
// step = 0;
// time = 0:0
// maybe others?
function resetStatus() {
	$("#dsp_steps").text(0);
	$("#dsp_time").text("00:00");
	$("#dsp_level").text(currentMaze);
}

// user data per level
// initTime should be Date.now()
// by default timer is on
var theUserData = new userData(0);
function userData(initTime){

        var startTime = initTime;
        var counter = 0; //internal counter, default timer is on
        var minSec;

        this.step = 0;
        this.pad = function(num, size) {
		    var s = num+"";
		    while (s.length < size) s = "0" + s;
		    return s;
		}

        var getTime = function() {
                return ((Date.now() - startTime)/1000);
        }

        this.getMinSec = function() {
        	var totalSeconds = Math.floor(getTime());
  			var minutes = Math.floor(totalSeconds/60);
  			var seconds = totalSeconds - minutes * 60;
  			return this.pad(minutes, 2) + ':' + this.pad(seconds, 2);
        }

        this.resetTimer = function() {
        	startTime = Date.now();
        	counter = 0;
        }

        this.TimerOff = function() {
        	counter = -1;
        	gameData.keepStep(this.step);
        	gameData.keepTime(getTime());
        }

        this.TimerOn = function() {
        	counter = 0;
        }

        this.keepStep = function() {
        	this.step++;
        	if (this.step > 999) this.step = 999;
        }

        this.displayMinSec = function() {
        	if (counter == -1)
        	{
        		return;
        	}
        	else if (counter > 10)
        	{
        		counter = 0;

        		if (minSec != (minSec = this.getMinSec())) $("#dsp_time").text(minSec); //update index.html

        	}
        	else ++counter;
        }
}

// Sound wizzard based on buzz.min.js
var soundWizzard = {

	isActive: false,
	currSong: 0,

	musicFiles: [
		"sound/Anguish.mp3",
		"sound/Mellowtron.mp3"
	],

	//[filename, duration in ms]
	soundFiles: {
		intro: ["sound/intro.mp3", 1000],
		winner: ["sound/winner.mp3", 4214],
		step: ["sound/step.mp3", 470],
		block: ["sound/nogo.mp3", 287],
		finale: ""
	},

	playList: [],

	initiate: function() {
		if (buzz.isSupported()) {
			this.isActive = true;
			this.playList.push(new buzz.sound(this.musicFiles[1]));
		}
		else this.isActive = false;

		if (this.soundFiles.intro != "") {
				this.intro = new buzz.sound(this.soundFiles.intro[0], {preload: true});
				this.introPause = this.soundFiles.intro[1];
		}

		if (this.soundFiles.winner != "") {
				this.winner = new buzz.sound(this.soundFiles.winner[0], {preload: true, volumne: 90}); //volumne doesn't work on some browsers
				this.winnerPause = this.soundFiles.winner[1];
		}

		if (this.soundFiles.step != "") {
				this.step = new buzz.sound(this.soundFiles.step[0], {preload: true, volumne: 90}); //volumne doesn't work on some browsers
				this.stepPause = this.soundFiles.step[1];
		}

		if (this.soundFiles.block != "") {
				this.block = new buzz.sound(this.soundFiles.block[0], {preload: true, volumne: 90}); //volumne doesn't work on some browsers
				this.blockPause = this.soundFiles.block[1];
		}

		if (this.soundFiles.finale != "") {
				this.finale = new buzz.sound(this.soundFiles.finale[0], {preload: true});
				this.finalePause = this.soundFiles.finale[1];
		}

	},

	playMusic: function() {
		if (!this.isActive) return;
		this.playList[soundWizzard.currSong].play();
		this.playList[soundWizzard.currSong].loop();
	},

	stopMusic: function() {
		if (!this.isActive) return;
		this.playList[soundWizzard.currSong].stop();
	},

	pauseMusic: function() {
		if (!this.isActive) return;
		this.playList[soundWizzard.currSong].pause();
	},

	playIntro: function() {
		if (this.intro !== undefined) this.intro.play();
	},

	playWinner: function() {
		if (this.winner !== undefined) this.winner.play();
	},

	playfinale: function() {
		if (this.finale !== undefined) this.finale.play();
	},

	playStep: function() {
		if (this.step !== undefined) {
			this.step.play();
		}
	},

	playObstacle: function() {
		if (this.block !== undefined) {
			this.block.play();
		}
	}

}

//
// MouseWork engine, based on HTML5 not Canvas Engine.
// 1. Instantiate it before use!
// 2. Send mazeModel via setMazeModel()
// 3. Use your mouse like the joystick!
//
var mouseWorkEngine = function(canvas) {

	this.inputLock = false; //input device lock
	var theMazeModel;
	var threshold = 8; // threshold size (px), lower for higher sensitivity & higher errors!
	var interval = 500; //shortest movement interval (ms)!
	var interval_max = 1000; //max movement interval
	var accelerator = 3; //mouse accelerator

	var mouseDownHook = false, mouseDblClickHook = false, handler;
	var lastX = -1, lastY = -1, lastMove = 0, lastTime = 0, currX, currY, offsetX, offsetY;
	var mouseDblClickHook, mouseUpTime; //variable for double click

	//object constructor! Don't overload the event listeners!
	canvas.addEventListener("mousedown", function(e) {canvas_mouse_down(e);});
	canvas.addEventListener("mousemove", function(e) {canvas_mouse_move(e);});
	canvas.addEventListener("mouseup", function(e) {canvas_mouse_up(e);});
	//canvas.addEventListener("mouseout", canvas_mouse_out);  //commented out to keep mouse focused

	this.setMazeModel = function(mazeModel) {
		theMazeModel = mazeModel;
	}

	function moveMaze(a) {
		//console.log(offsetX, offsetY);

		if (this.inputLock) return false;
		var flag = true;

		//recalibrate mouse center if move fail
		switch(a) {
			case 2:
				if (flag = theMazeModel.movePlayer(AMaze.model.E_CONST)) updateStatus(theMazeModel);
				break;

			case 4:
				if (flag = theMazeModel.movePlayer(AMaze.model.W_CONST)) updateStatus(theMazeModel);
				break;

			case 3:
				if (flag = theMazeModel.movePlayer(AMaze.model.S_CONST)) updateStatus(theMazeModel);
				break;

			case 1:
				if (flag = theMazeModel.movePlayer(AMaze.model.N_CONST)) updateStatus(theMazeModel);
				break;
		}

		return flag;

	}

	function canvas_mouse_down(e) {
		//console.log("down");
		mouseDownHook = true;
		lastX = get_mouse_x(e);
		lastY = get_mouse_y(e);
	}

	function canvas_mouse_move(e) {

		// acquire mouseXY each 0.1 s to reduce error
		if (mouseDownHook && Date.now() - lastTime > 100) {
			offsetX = (currX = get_mouse_x(e)) - lastX;
			offsetY = (currY = get_mouse_y(e)) - lastY;
			var x = Math.abs(offsetX);
			var y = Math.abs(offsetY);
			var currMove;
			var adj_interval;
			lastTime = Date.now();

			if(x > threshold || y > threshold)
			{

				//not allow diagonal movement, recalibrate mouse center
				if (x > y) {
					offsetY = 0;
					if (offsetX > 0) currMove = 2; else currMove = 4;
					adj_interval = Math.max(0, (interval_max - interval)*(1- (x-threshold)/accelerator/threshold));
				}
				else {
					offsetX = 0;
					if (offsetY > 0) currMove = 3; else currMove = 1;
					adj_interval = Math.max(0, (interval_max - interval)*(1- (y-threshold)/accelerator/threshold));
				}

				lastX = currX;
				lastY = currY;

				//trigger movement if dir changes
				//if (currMove != lastMove) { //commented out for linear acceleration

					clearInterval(handler);
					handler = 0;

					if (moveMaze(currMove)) {
						lastMove = currMove; //register dir only maze move is successful

						handler = setInterval(function() { //allow momentum
							if (!moveMaze(currMove)) {
								clearInterval(handler);
								handler = 0;
							}
						}, interval + adj_interval); //avoid overloading!
					}
				//}
			}
		}
	}

	function canvas_mouse_out(e) {
		//console.log("out");
		mouseDownHook = false;
		cleanInterval(handler);
		handler = 0;
		lastTime = 0;
		lastMove = 0;
	}

	function canvas_mouse_up(e) {
		//console.log("up");
		mouseDownHook = false;
		clearInterval(handler);
		handler = 0;
		lastTime = 0;
		lastMove = 0;
	}

	function get_mouse_x(e) {return Math.floor(e.clientX - canvas.offsetLeft);}
	function get_mouse_y(e) {return Math.floor(e.clientY - canvas.offsetTop);}
}

// callback function for loading the game canvas & spritemap
function setGameCanvas(loaded) {

		var canvas = CE.defines("canvas_id")
			.extend(Input);

		var modelTest = loaded;

		canvas.Scene.new({
			name: "MyScene",
			materials: {
				images: {
					player: "images/knight.png",
					tileset: "images/grass_tileset_2x.png",

					trail1: "images/trail_dot1.png",
            		trail2: "images/trail_dot2.png",
            		trail3: "images/trail_dot3.png",
            		trail4: "images/trail_dot4.png"
				}
				//sounds: {
				//	theme1: "sound/Anguish.mp3"
				//}
			},
			ready: function(stage) {

				var docWidth = $(document).width(), windowHeight = $(window).height(), windowWidth = $(window).width();
				if(false)
				{

					$('#bgcanvas')[0].width = docWidth*0.9;
					$('#bgcanvas')[0].height = windowHeight*0.8;

					$('#canvas_id')[0].width = docWidth*0.9;
					$('#canvas_id')[0].height = windowHeight*0.8;
				}

				$('#bgcanvas').css('left', windowWidth/2-$('#bgcanvas')[0].width/2);
				$('#canvas_id').css('left', windowWidth/2-$('#canvas_id')[0].width/2);


				//making the huge spritemap object for the renderer (it's ridiculous)
				//{
				//	image:(materials string),
				//	size:[(number of gridbox lines), (number of gridbox columns)],
				//	tile:[(width of each gridbox),(height of each gridbox)],
				//	reg:[(x origin), (y origin)],
				//	set:[(1st identifier starting from top left), (2nd identifier), ...],
				//	cells:[
				//		[{x:0,y:0,width:0,height:0, tiles:["gridtile1","gridtile2",...]},... ],
				//		[{x:0,y:0,width:0,height:0, tiles:["gridtile1","gridtile2",...]},... ],...}
				//	],
				//	entrances: [
				//		...
				//	],
				//	exits: [
				//		...
				//	]
				//}

				var spritemap = {
					image: "tileset",
					size:[8,6],
					tile:[64,64],
					reg:[0,0],
					set:["none_0","n_0", "e_0", "ne_0", "s_0", "ns_0", "es_0", "nes_0",
						 "none_1","n_1", "e_1", "ne_1", "s_1", "ns_1", "es_1", "nes_1",
						 "none_2","n_2", "e_2", "ne_2", "s_2", "ns_2", "es_2", "nes_2",
						 "w_0",   "nw_0","ew_0","new_0","sw_0","nsw_0","esw_0","nesw_0",
						 "w_1",   "nw_1","ew_1","new_1","sw_1","nsw_1","esw_1","nesw_1",
						 "w_2",   "nw_2","ew_2","new_2","sw_2","nsw_2","esw_2","nesw_2"],
					cells:[
						//0: none
						[	{x:0,y:0, tiles:["none_0","none_1","none_2"]}
						],
						//1: n
						[	{x:0,y:0, tiles:["n_0","n_1","n_2"]}
						],
						//2: e
						[	{x:0,y:0, tiles:["e_0","e_1","e_2"]}
						],
						//3: n | e
						[	{x:0,y:0, tiles:["ne_0","ne_1","ne_2"]}
						],
						//4: s
						[	{x:0,y:0, tiles:["s_0","s_1","s_2"]}
						],
						//5: n | s
						[	{x:0,y:0, tiles:["ns_0","ns_1","ns_2"]}
						],
						//6: e | s
						[	{x:0,y:0, tiles:["es_0","es_1","es_2"]}
						],
						//7: n | e | s
						[	{x:0,y:0, tiles:["nes_0","nes_1","nes_2"]}
						],
						//8: w
						[	{x:0,y:0, tiles:["w_0","w_1","w_2"]}
						],
						//9: n | w
						[	{x:0,y:0, tiles:["nw_0","nw_1","nw_2"]}
						],
						//10: e | w
						[	{x:0,y:0, tiles:["ew_0","ew_1","ew_2"]}
						],
						//11: n | e | w
						[	{x:0,y:0, tiles:["new_0","new_1","new_2"]}
						],
						//12: s | w
						[	{x:0,y:0, tiles:["sw_0","sw_1","sw_2"]}
						],
						//13: n | s | w
						[	{x:0,y:0, tiles:["nsw_0","nsw_1","nsw_2"]}
						],
						//14: e | s | w
						[	{x:0,y:0, tiles:["esw_0","esw_1","esw_2"]}
						],
						//15: n | e | s | w
						[	{x:0,y:0, tiles:["nesw_0","nesw_1","nesw_2"]}
						]
					],
					entrances:this.cells,
					exits:this.cells
				},
				styleObj = {
					'bg':'#17d540',
					'spritemap':spritemap,
					'cellSize':[64,64]
				};

				this.mazeRenderer = new AMaze.render.MazeRenderer({
					'bgcanvas':$('#bgcanvas')[0],
					'canvasEngine':canvas,
					'scene':this,
					'stage':stage,
					'maze':modelTest,
					'style':styleObj
				});

				// comment out to disable trail
				this.mazeRenderer.createTrailModel();

				this.mazeRenderer.drawMaze();

				//set mouse action
				mouseAction.setMazeModel(modelTest);

				//piggyback on Amaze model
				theUserData.resetTimer();
				modelTest.userData = theUserData;
				modelTest.gameData = gameData; //make gameData testable
				resetStatus();

				canvas.Input.keyUp(Input.Up, function(e) {
					if (!inputLock && modelTest.movePlayer(AMaze.model.N_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
				});

				canvas.Input.keyUp(Input.Bottom, function(e) {
					if (!inputLock && modelTest.movePlayer(AMaze.model.S_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
				});

				canvas.Input.keyUp(Input.Left, function(e) {
					if (!inputLock && modelTest.movePlayer(AMaze.model.W_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
				});

				canvas.Input.keyUp(Input.Right, function(e) {
					if (!inputLock && modelTest.movePlayer(AMaze.model.E_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
				});
			},
			render: function(stage) {
				this.mazeRenderer.refresh();
				stage.refresh();

				//display time
				modelTest.userData.displayMinSec();
			}
		});
		canvas.ready().Scene.call("MyScene");
};

$(function() {
	$('#user_info').hide();
	$('#menu_designer').hide();
	var loginEmailField = $('#login_email'),
	loginPasswordField = $('#login_password'),
	login = function() {
		var email = loginEmailField.val() || "",
		password = loginPasswordField.val() || "";
		loginEmailField.removeClass( "ui-state-error" );
		loginPasswordField.removeClass( "ui-state-error" );

		if(email.length > 0 && password.length > 0)
			remoteDB.HTTPPostAsync("/login", {"email":email,"password":password}, function(data){
				if(!(data)) return console.log("error occurred");
				if(data.response && data.response === "user does not exist")
				{
					loginEmailField.addClass( "ui-state-error" );
					loginInvalidEmailDialog.dialog("open");
					return;
				}
				if(data.response && data.response === "invalid login credentials")
				{
					loginEmailField.addClass( "ui-state-error" );
					loginPasswordField.addClass( "ui-state-error" );
					loginInvalidLoginDialog.dialog("open");
					return;
				}
				if(!(data.userid && data.token)) return console.log(data || "error occurred");
				remoteDB.login(email, data.token, data.userid);
				loginDialog.dialog( "close" );
				loginLoggedInDialog.dialog("open");
				$('#menu_designer').show();
				$('#user_info').show();
				$('#user_id').text("USER: "+email);
				$('#menu_login').text('Logout');
			});
		else
			if(email.length < 1)
				loginEmailField.addClass( "ui-state-error" );
			if(password.length < 1)
				loginPasswordField.addClass( "ui-state-error" );
	},
	register = function() {
		var email = loginEmailField.val(),
		password = loginPasswordField.val();
		loginEmailField.removeClass( "ui-state-error" );
		loginPasswordField.removeClass( "ui-state-error" );

		if(email.length > 0 && password.length > 0)
			remoteDB.HTTPPostAsync("/register", {"email":email,"password":password}, function(data){
				if(!(data && data.response)) return console.log(data || "error occurred");
				if(data.response === "duplicate email address")
				{
					loginEmailField.addClass( "ui-state-error" );
					return registerDupEmailDialog.dialog("open");
				}
				registerRegisteredDialog.dialog("open");
				login();
			});
		else
			if(email.length < 1)
				loginEmailField.addClass( "ui-state-error" );
			if(password.length < 1)
				loginPasswordField.addClass( "ui-state-error" );
	},
	loginDialog = $( "#login-form" ).dialog({
		autoOpen: false,
		height: 300,
		width: 350,
		modal: true,
		buttons: {
			"Login": login,
			"Register": register,
			Cancel: function() {
				loginDialog.dialog( "close" );
			}
		},
		close: function() {
			form[ 0 ].reset();
			loginEmailField.removeClass( "ui-state-error" );
			loginPasswordField.removeClass( "ui-state-error" );
		}
	}),
	registerDupEmailDialog = $( "#message-registration-dup-email" ).dialog({
		autoOpen: false,
		modal: true,
		buttons: {
			Ok: function() {
				$( this ).dialog( "close" );
			}
		}
	}),
	registerRegisteredDialog = $( "#message-registration-registered" ).dialog({
		autoOpen: false,
		modal: true,
		buttons: {
			Ok: function() {
				$( this ).dialog( "close" );
			}
		}
	}),
	loginInvalidEmailDialog = $( "#message-login-invalid-email" ).dialog({
		autoOpen: false,
		modal: true,
		buttons: {
			Ok: function() {
				$( this ).dialog( "close" );
			}
		}
	}),
	loginInvalidLoginDialog = $( "#message-login-invalid-login" ).dialog({
		autoOpen: false,
		modal: true,
		buttons: {
			Ok: function() {
				$( this ).dialog( "close" );
			}
		}
	}),
	loginLoggedInDialog = $( "#message-login-loggedin" ).dialog({
		autoOpen: false,
		modal: true,
		buttons: {
			Ok: function() {
				$( this ).dialog( "close" );
			}
		}
	}),
	form = loginDialog.find( "form" ).on( "submit", function( event ) {
		event.preventDefault();
		login();
	});

	soundWizzard.initiate();
	soundWizzard.playMusic();

	mouseAction = new mouseWorkEngine(document.getElementById("canvas_id"));

	if (localDB)
	{
		currentMazeFile = getNextMaze();

		//not testing the model here, assume it works
		AMaze.model.load(currentMazeFile, setGameCanvas);
	}
	else
	{
		remoteDB.initiate();
		AMaze.model.inject(remoteDB.getNextMaze(), setGameCanvas);
	}

	$(window).on('keydown', function(e) {
		if([32,37,38,39,40].indexOf(e.keyCode) > -1) {
			e.preventDefault();
		}
	}).scrollTop(0).scrollLeft(0);

	//restart level
	$("#menu_new").click(function() {
		if (confirm("Are you sure you want to restart this level?")) {
			if (localDB) AMaze.model.load(currentMazeFile = getNextMaze(), setGameCanvas);
			else AMaze.model.inject(remoteDB.getCurrentMaze(), setGameCanvas);
		}
	});

	$("#menu_goto").click(function() {
		console.log("goto button is pressed.");
	});


	//Side menu related stuff starts here

	$('#menu_level').sidr({
      name: 'sidr', 
      speed: 200, 
      side: 'left',
      source: null, 
      renaming: true, 
      body: 'body'

    });

	buildCats();
    $('.sub-menu-sidr').hide();

    $("#sidr li:has(ul)").click(function(){
        $("ul",this).toggle('fast');
    });

    $("ul").on('click', 'li', function(){
      var curId = $(this).attr('id');
      if(curId !== undefined){
      	//console.log("curId is " + curId);
      	var obj = remoteDB.HTTPGet("/maze/"+(this.currMazeID=curId).toString());
      	console.log("object is " + obj.mazeJSON);
		this.currentMaze = JSON.parse(obj.mazeJSON);
		AMaze.model.inject(remoteDB.getCurrentMaze(), setGameCanvas);
      }
    });


    //Side menu related stuff ends here
	$("#menu_login").click(function() {
		if (!remoteDB.isLogon) loginDialog.dialog("open");
		else {
			if (remoteDB.logout()){
				$('#menu_login').text('Login');
				$('#user_info').hide();
				$('#user_id').text("");
				$('#menu_designer').hide();
			}
		}
	});

	 

	$("#menu_load").click(function() {
		console.log("load button is pressed.");
	});
});

//Side menu related function
var buildCats = function (){
    var sub
    var count = 0;
    for(var i = 0; i < categories.length; i++){  
        apiClient.getMazesInCategory(categories[i].id, function(resp){
            //console.log("resp is " + resp);
            count++;
            for(var j = 0; j < resp.mazes.length; j++){
                var x = $('<li id=' + resp.mazes[j].mazeno + '><a href="#">' + resp.mazes[j].displayName + '</a></li>');
                sub = $('#sub' + (count));
                sub.append(x);
                //console.log("count is  " + count);
            }
        });
    };
};

//Check to see if we are in node or the browser.
if (typeof exports !== 'undefined'){
	module.exports.getNextMaze = getNextMaze;
	module.exports.updateStatus = updateStatus;
	module.exports.resetStatus = resetStatus;
	module.exports.userData = userData;
	module.exports.setGameCanvas = setGameCanvas;
	module.exports.gameData = gameData;
	module.exports.soundWizzard = soundWizzard;
}
