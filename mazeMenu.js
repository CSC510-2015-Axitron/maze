//
// Amazing mazes menu
//

//
// Global parameters & constants
//
currentMazeFile = '';
currentLevel = 0; //small, medium, large, huge, etc...
currentMaze = -1;  //the order of maze in which they appear in the directory
currentCatID = 0;
var theGameCanvas; // Use one variable to prevent overloading
var eventTracker = 0; //event tracker for keyboard & renderer event!
var lastKeyDn; 
var FPS_count = 0;


//Keen stuff.
var KeenOn;
if (typeof Keen == "undefined") {  //workaround to prevent localsite without Node.js from failing
	Keen = function(){}; 
	KeenOn = false;
}
else KeenOn = true;
var client = new Keen({
    projectId: "551ad76c59949a707edddefa",   // String (required always)
    writeKey: "007d73a3fcca63fa1571ad9ffc0060b88623515ca1d2a42b8b466b20f11fa1f95fb5317ebf8ac3d1d1b392f6c98a8b36904524f4acd686179e82283c7b4aec7aac824a2fa66803f815451e287f6c92f054808d4901510d9f7d4277d6e542047bca663b35fdacb8a5358ee0faf6ece937",     // String (required for sending data)
    protocol: "https",              // String (optional: https | http | auto)
    host: "api.keen.io/3.0",        // String (optional)
    requestType: "jsonp"            // String (optional: jsonp, xhr, beacon)
  });


//
// Enter maze json files here (for local JSON files ONLY!)
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
],
likedMazeDialog,
mazeTitleDisplay = "";

var localDB = false; //change to false to access remoteDB
var inputLock = false; //input device lock
var mouseAction = {};
var soundOn = true; //turn the background music on/off


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
		var a = Math.round(50 * (1 + currentLevel * 2) - this.currentSteps - this.currentTime * 3);
		this.totalScore += ((a < 0)? 0:a);
		return this.totalScore;
	}
}

//For local JSON files only
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

			afterLiked = function() {if (localDB) AMaze.model.load(currentMazeFile = getNextMaze(), setGameCanvas);
			else getRandomLevelInCat(currentCatID);
			soundWizzard.playMusic();
			inputLock = mouseAction.inputLock = false; //unlock input device
			}
			
			likedMazeDialog.dialog("open"); 
		}, (soundWizzard.winnerPause == 0 ? 500: soundWizzard.winnerPause)); // must larger than stepTime;

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
	$("#dsp_level").text(currentMazeFile);
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
        	this.step = 0;
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
	winnerPause: 0,

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
		finale: ["sound/MoveForward.mp3", 70000]
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
				this.finale = new buzz.sound(this.soundFiles.finale[0], {preload: false}); //don't preload because this song is 1:09 long
				this.finalePause = this.soundFiles.finale[1];
		}

	},

	musicOn: function() {
		if (!this.isActive) {
			this.initiate();
			this.playMusic();
		}
	},

	musicOff: function() {
		this.stopMusic();
		this.isActive = false;
		this.winnerPause = 0;
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
		if (this.intro !== undefined && this.isActive) this.intro.play();
	},

	playWinner: function() {
		if (this.winner !== undefined && this.isActive) this.winner.play();
	},

	playFinale: function() {
		if (this.finale !== undefined && this.isActive) this.finale.play();
	},

	playStep: function() {
		if (this.step !== undefined && this.isActive) {
			this.step.play();
		}
	},

	playObstacle: function() {
		if (this.block !== undefined && this.isActive) {
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
	var interval = 300; //shortest movement interval (ms)!
	var interval_max = 800; //max movement interval
	var accelerator = 2; //mouse accelerator

	var mouseDownHook = false, mouseDblClickHook = false, handler;
	var lastX = -1, lastY = -1, lastMove = 0, lastTime = 0, currX, currY, offsetX, offsetY;
	var mouseDblClickHook, mouseUpTime; //variable for double click

	//object constructor! Don't overload the event listeners!
	canvas.addEventListener("mousedown", function(e) {canvas_mouse_down(e);});
	canvas.addEventListener("mousemove", function(e) {canvas_mouse_move(e);});
	canvas.addEventListener("mouseup", function(e) {canvas_mouse_up(e);});
	canvas.addEventListener("mouseout", canvas_mouse_out);  //commented out to keep mouse focused

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
		clearInterval(handler);
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

				theGameCanvas = new AMaze.render.MazeRenderer({
					'bgcanvas':$('#bgcanvas')[0],
					'canvasEngine':canvas,
					'scene':this,
					'stage':stage,
					'maze':modelTest,
					'style':styleObj
				});

				// comment out to disable trail
				theGameCanvas.createTrailModel();

				theGameCanvas.drawMaze();

				//set mouse action
				mouseAction.setMazeModel(modelTest);

				//piggyback on Amaze model
				theUserData.resetTimer();
				modelTest.userData = theUserData;
				modelTest.gameData = gameData; //make gameData testable
				resetStatus();

				//canvas.Input.keyUp(Input.Up, function(e) {
				//	if (!inputLock && modelTest.movePlayer(AMaze.model.N_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
				//});

				//canvas.Input.keyUp(Input.Bottom, function(e) {
				//	if (!inputLock && modelTest.movePlayer(AMaze.model.S_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
				//});

				//canvas.Input.keyUp(Input.Left, function(e) {
				//	if (!inputLock && modelTest.movePlayer(AMaze.model.W_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
				//});

				//canvas.Input.keyUp(Input.Right, function(e) {
				//	if (!inputLock && modelTest.movePlayer(AMaze.model.E_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
				//});

				clearInterval(eventTracker);
				eventTracker = setInterval(function(){

					theGameCanvas.refresh();

					//display time
					modelTest.userData.displayMinSec();

					if (lastKeyDn != 0) {
						if ((canvas.Input.isPressed(Input.Up) && lastKeyDn == Input.Up) ||
							(canvas.Input.isPressed(Input.Bottom) && lastKeyDn == Input.Bottom) ||
							(canvas.Input.isPressed(Input.Left) && lastKeyDn == Input.Left) ||
							(canvas.Input.isPressed(Input.Right) && lastKeyDn == Input.Right)) {
							++FPS_count;
						}
						else {
							FPS_count = 0;
							lastKeyDn = 0;
						}
					}
					
					if (lastKeyDn != 0 && FPS_count < 15){} //only repeat keypress for every 15*20 ms
					else if (canvas.Input.isPressed(Input.Up)) {
						if (!inputLock && modelTest.movePlayer(AMaze.model.N_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
						lastKeyDn=Input.Up;
						FPS_count = 0;
					}

					else if (canvas.Input.isPressed(Input.Bottom)) {
						if (!inputLock && modelTest.movePlayer(AMaze.model.S_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
						lastKeyDn=Input.Bottom;
						FPS_count = 0;
					}

					else if (canvas.Input.isPressed(Input.Left)) {
						if (!inputLock && modelTest.movePlayer(AMaze.model.W_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
						lastKeyDn=Input.Left;
						FPS_count = 0;
					}

					else if (canvas.Input.isPressed(Input.Right)) {
						if (!inputLock && modelTest.movePlayer(AMaze.model.E_CONST)) updateStatus(modelTest); else soundWizzard.playObstacle();
						lastKeyDn=Input.Right;
						FPS_count = 0;
					}

				}, 20);

				canvas.Input.keyDown([Input.Left, Input.Right, Input.Up, Input.Bottom]);
				canvas.Input.keyUp([Input.Left, Input.Right, Input.Up, Input.Bottom]);
			}
			//render: function(stage) {
				//this.mazeRenderer.refresh();
			//	stage.refresh();

				//display time
				//modelTest.userData.displayMinSec();
				
			//}
		});
		canvas.ready().Scene.call("MyScene");
};

var buildUserList = function(){
	//console.log("remote id is " + remoteDB.getUserId());
	var usrMazes = remoteDB.HTTPGet('/mazes/user/' + remoteDB.getUserId());
	console.log(usrMazes.mazes);
	for(var j = 0; j < usrMazes.mazes.length; j++){
        if($('#' + usrMazes.mazes[j].mazeno).length){
        	//donothing
        }else{
        	var x = $('<li id=' + usrMazes.mazes[j].mazeno + '><a href="#">' + usrMazes.mazes[j].displayName + '</a></li>');
        	sub = $('#sub5');
        	sub.append(x);
        }
    }
}



/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 * Pilfered from this stack overflow post:  
 * http://stackoverflow.com/questions/1527803/generating-random-numbers-in-javascript-in-a-specific-range
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


//This function assumes that the numbers
//of the mazes in each category are actually in 
//numerical order, which is true for now.
var getRandomLevelInCat = function (catId){
        currentLevel = catId;
	var mazes = remoteDB.HTTPGet('/mazes/category/' + catId);
	var len = mazes.mazes.length;
	var min = mazes.mazes[0].mazeno;
	var max = mazes.mazes[len -1].mazeno;
	var rand = getRandomInt(min,max);
	var rand2 = Math.random();
	if(rand2+getBiasEffect() > 0.5) {
            console.log("getting maze "+rand);
            levelIsHand = true;
            remoteDB.getMazeByMazeno(rand);
	}else {
            levelIsHand = false;
            var algos = remoteDB.HTTPGet('/maze/gen/algorithms');
            var rand3 = getRandomInt(0, algos.length - 1);
            var req = JSON.stringify({"algorithm":algos[rand3].gen,"seed":10000*catId + Math.random()*10000});
            var gen = remoteDB.HTTPPostGen('/maze/gen', req);
            remoteDB.currMazeObj = gen.maze;
            currentMazeFile = "Size: "+gen.maze.width+"x"+gen.maze.height;
            console.log("getting maze from "+algos[rand3].gen);
            AMaze.model.inject(remoteDB.currMazeObj, setGameCanvas);
	}
},

levelIsHand = true,//should initially set this when we don't always start with the first level

//when bias +, more likely to get hand drawn mazes
//when bias -, more likely to get randomly generated mazes
//bias can extend infinitely in both +/-, but has most effect between -300,300
randomBias = 0,

//bias effect is added to cutoff for random choice
//max effect of -0.5,0.5
getBiasEffect = function() {
    return 1/Math.PI * Math.atan(randomBias/100);
};


$(function() {
        currentCatID = 1;//bad
	$.cookie.json = true;
	$('#user_info').hide();
	$('#menu_designer').hide();

	if (remoteDB.verifyCookie($.cookie('userAcc'))) {
		$('#menu_designer').show();
		$('#user_info').show();
		$('#user_id').text("USER: "+remoteDB.user);
		$('#menu_login').text('Logout');
	}
	else $.removeCookie('userAcc', {path: '/'});
	var loginEmailField = $('#login_email'),
	loginPasswordField = $('#login_password'),
	mazeNum = $('#maze_num'),
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
				$.cookie('userAcc', {email: email, token: data.token, userID: data.userid}, {expires: 1, path: '/'});
			});
		else
			if(email.length < 1)
				loginEmailField.addClass( "ui-state-error" );
			if(password.length < 1)
				loginPasswordField.addClass( "ui-state-error" );
	},
	load = function(){
		if(!remoteDB.getMazeByMazeno(mazeNum.val())){
			console.log('failed to load');
		}
		$("#dsp_level").text(currentMazeFile);		
		$('#load-form').dialog('close');
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
	loadDialog = $( "#load-form" ).dialog({
		autoOpen: false,
		height: 220,
		width: 275,
		modal: true,
		buttons: {
			"Load": load
		}
	}),
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


        likedMazeDialog = $('#liked-maze-dialog').dialog({
                autoOpen: false,
                dialogClass: 'no-close',
                modal: true,
                buttons: {
                    //randomBias + for liking hand crafted, - for procedural
                    Yes: function() {
                        randomBias+=10*(levelIsHand*2-1);
                        console.log(randomBias);
                        //keen related stuff
                        var levelType = null
                        if(levelIsHand){
                        	levelType = "Hand Written";
                        }else{
                        	levelType = "Procedurally Generated";
                        }
                        var clickEvent = {
			      			item: levelType,
      						liked: "Yes"
      					}
      					client.addEvent("sentiment", clickEvent, function(err,res){
      						if(err){
      							console.log("error occurred: " + err);
      						}else{
      							console.log("successful: " + res);
      						}
      					})
                        likedMazeDialog.dialog("close");
                        afterLiked();
                    },
                    No: function() {
                        randomBias-=10*(levelIsHand*2-1);
                        console.log(randomBias);
                        var levelType = null
                        if(levelIsHand){
                        	levelType = "Hand Written";
                        }else{
                        	levelType = "Procedurally Generated";
                        }
                        var clickEvent = {
			      			item: levelType,
      						liked: "No"
      					}
      					client.addEvent("sentiment", clickEvent, function(err,res){
      						if(err){
      							console.log("error occurred: " + err);
      						}else{
      							console.log("successful: " + res);
      						}
      					})
                        likedMazeDialog.dialog("close");
                        afterLiked();
                    }
                }
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
		//AMaze.model.inject(remoteDB.getNextMaze(), setGameCanvas);
		remoteDB.getNextMaze(); //set up first maze anyway,
		getRandomLevelInCat(remoteDB.categories[currentLevel].id); //enter first level maze
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
			else AMaze.model.inject(remoteDB.currMazeObj, setGameCanvas);
		}
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

    $('#menu_level').click(function(){
    	if(remoteDB.getIsLogon())
			buildUserList();
    })

    $('.sub-menu-sidr').hide();

    $("#sidr li:has(ul)").click(function(){
        var val = $('ul', this).attr('id');
        if(val == 'sub5'){
        	//Do nothing
        	$("ul",this).toggle('fast');
        }else{
                currentCatID = val;
        	getRandomLevelInCat(val);
        	$.sidr('toggle');
        }
        
    });

    $("ul.sub-menu-sidr").on('click', 'li', function(){
      console.log('user maze click');
      var curId = $(this).attr('id');
      remoteDB.getMazeByMazeno(curId);
      $("#dsp_level").text(currentMazeFile);
      $.sidr('toggle');
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
				$.removeCookie('userAcc', {path: '/'});
			}
		}
	});

	$("#menu_sound").click(function(){
		if (soundOn) {
			soundOn = false;
			soundWizzard.musicOff();
			$('#menu_sound').text("Sound");
		}
		else {
			soundOn = true;
			soundWizzard.musicOn();
			$('#menu_sound').text("Mute");
		}
	});
	 

	$("#menu_load").click(function() {
		loadDialog.dialog("open");

		//console.log("load button is pressed.");
	});
});

//Check to see if we are in node or the browser.
if (typeof exports !== 'undefined'){
	module.exports.getNextMaze = getNextMaze;
	module.exports.updateStatus = updateStatus;
	module.exports.resetStatus = resetStatus;
	module.exports.userData = userData;
	module.exports.setGameCanvas = setGameCanvas;
	module.exports.gameData = gameData;
	module.exports.soundWizzard = soundWizzard;
	module.exports.theGameCanvas = theGameCanvas;
}
