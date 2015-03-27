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
			this.HTTPGetAsync("/keepalive", function(e) {
				if (e.response != true) {
					this.logout();
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