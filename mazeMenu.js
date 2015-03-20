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
}

var mouseAction = {};

// store data per game!
var gameData = new function() {
	this.totalStep = 0;
	this.totalTime = 0;
	this.totalScore = 0;
	var currentStep;
	var currentTime;

	this.keepStep = function(a) {this.totalStep += (currentStep = a);}
	this.keepTime = function(a) {this.totalTime += (currentTime = a);}

	// score formula
	this.getScore = function() {
		var a = Math.round(50 * (1 + currentMaze * 0.6) - currentStep - currentTime * 3);
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

		setTimeout(function() {
			maze.userData.TimerOff(); //stop the timer
			$("#dsp_score").text(maze.gameData.getScore());

		//if (confirm("Congratulations!\nYou have completed this level!\nProceed to next maze?"))
		//{
			AMaze.model.load(currentMazeFile = getNextMaze(), setGameCanvas);
			soundWizzard.playMusic();
		//}
		}, soundWizzard.winnerPause);
	}

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

	soundFiles: {
		intro: ["sound/intro.mp3", 1000],
		winner: ["sound/winner.mp3", 4214],
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
				this.winner = new buzz.sound(this.soundFiles.winner[0], {preload: true, volumne: 50}); //volumne doesn't work on some browsers
				this.winnerPause = this.soundFiles.winner[1];
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

	},

	playObstacle: function() {
		
	}

}

//
// MouseWork engine, based on HTML5 not Canvas Engine.
// 1. Instantiate it before use!
// 2. Send mazeModel via setMazeModel()
// 3. Use your mouse like the joystick!
//
var mouseWorkEngine = function(canvas) {

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
				modelTest.userData = new userData(Date.now());
				modelTest.gameData = gameData; //make gameData testable
				resetStatus();

				canvas.Input.keyUp(Input.Up, function(e) {
					if (modelTest.movePlayer(AMaze.model.N_CONST)) updateStatus(modelTest);
				});

				canvas.Input.keyUp(Input.Bottom, function(e) {
					if (modelTest.movePlayer(AMaze.model.S_CONST)) updateStatus(modelTest);
				});

				canvas.Input.keyUp(Input.Left, function(e) {
					if (modelTest.movePlayer(AMaze.model.W_CONST)) updateStatus(modelTest);
				});

				canvas.Input.keyUp(Input.Right, function(e) {
					if (modelTest.movePlayer(AMaze.model.E_CONST)) updateStatus(modelTest);
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

	soundWizzard.initiate();
	soundWizzard.playMusic();

	mouseAction = new mouseWorkEngine(document.getElementById("canvas_id"));
	currentMazeFile = getNextMaze();

	//not testing the model here, assume it works
	AMaze.model.load(currentMazeFile, setGameCanvas);

	$(window).on('keydown', function(e) {
		if([32,37,38,39,40].indexOf(e.keyCode) > -1) {
			e.preventDefault();
		}
	}).scrollTop(0).scrollLeft(0);

	//restart level
	$("#menu_new").click(function() {
		if (confirm("Are you sure you want to restart this level?")) AMaze.model.load(currentMazeFile, setGameCanvas);
	});

	$("#menu_goto").click(function() {
		console.log("goto button is pressed.");
	});

	$("#menu_level").click(function() {
		console.log("level button is pressed.");
	});

	$("#menu_save").click(function() {
		console.log("save button is pressed.");
	});

	$("#menu_load").click(function() {
		console.log("load button is pressed.");
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
}
