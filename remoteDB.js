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
	url: "https://axemaze-db.herokuapp.com",

	categories: [], 		// url/categories
	mazeCategory: [,,,],    // url/mazes/category/:id
	mazeTotal: 0,			// url/mazes
	defMazeTotal: 0,		// number of official mazes

	currMazeID: -1,			// current maze ID
	currMazeObj: {},		// url/maze/:id

	userMazeCategory: [],	// user-created mazes

	sessionHandler: 0,

	HTTPGet: function(path) {
            var toReturn = 
		$.ajax({
			type: "GET",
			url: this.url+path,
			async: false,
			headers: {
				"authorization":remoteDB.token,
				"content-type":"application/json"
			}
		});
            return JSON.parse(toReturn.responseText);

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
	//Special use for case where data should not be stringified.
	HTTPPostGen: function(path, datas) {
		return JSON.parse($.ajax({
			type: "POST",
			data: datas,
			url: this.url+path,
			async: false,
			headers: {
				"authorization":remoteDB.token,
				"content-type":"application/json"
			}
		}).responseText);

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
		this.defMazeTotal = this.mazeCategory[0].mazes.length;

		//use AJAX to load the rest of categories
		for (var i = 1; i < this.categories.length; ++i)
		{
			this.HTTPGetAsync("/mazes/category/"+this.categories[i].id.toString(), function(e){
				remoteDB.mazeCategory[parseInt(e.category.toString().substring(0,1))] = e;
				remoteDB.defMazeTotal += e.mazes.length;
			});
		}

	},

	// get maze by maze no and start the level, will not check maze availability, assume chosen from predefined mazeno array
	getMazeByMazeno: function(mazeno) {
		var obj = this.HTTPGet("/maze/"+(mazeno).toString());
		if (obj.response != "maze not found") {
			this.currMazeID = mazeno;
			this.currMazeObj = JSON.parse(obj.mazeJSON);
			currentMazeFile = "Size: "+this.currMazeObj.width+"x"+this.currMazeObj.height; //global parameters!
			AMaze.model.inject(remoteDB.currMazeObj, setGameCanvas);
			return true;
		}
		else return false;
	},

	getCategoryByUserID: function(id) {
		this.HTTPGetAsync("/mazes/user/"+id.toString(), function(e) {
			if (e.response !== "Not Found") {
				userMazeCategory = e;
			}
		});
	},

	getNextMaze: function() {

		var order = this.findCurrentMazeOrder();
		currentMaze = (order == -1? currentMaze: order); //if maze order is -1 use existing counter
		++currentMaze;

		if (currentMaze >= this.defMazeTotal)
		{
			//Final winning thing goes here!
			this.currMazeID = this.mazeCategory[currentLevel = 0].mazes[currentMaze = 0].mazeno;
		}
		else
		{

			var notFound = true;

			// Do not check integrity of remote DB here!
			while (notFound) {
				var count = 0;
				for (var i = 0; i < currentLevel; ++i) {
					count += this.mazeCategory[i].mazes.length;
				}

				if (currentMaze < count + this.mazeCategory[currentLevel].mazes.length) {
					this.currMazeID = this.mazeCategory[currentLevel].mazes[currentMaze - count].mazeno;
					notFound = false;
				}
				else ++currentLevel;
			}
		}

		var obj = this.HTTPGet("/maze/"+this.currMazeID.toString());
		this.currMazeObj = JSON.parse(obj.mazeJSON);
		currentMazeFile = "Size: "+this.currMazeObj.width+"x"+this.currMazeObj.height; //global parameters!

		return this.currMazeObj;
	},

	findCurrentMazeOrder: function() {
		if (this.currMazeID < 0) return -1; //skip uninitialized maze
		var notFound = true;
		var obj;
		var idx = -1;
		for (var i=0; i < this.mazeCategory.length; ++i) {
			for (var j=0; j < (obj = this.mazeCategory[i].mazes).length; ++j) {
				++idx;
				if (this.currMazeID == obj[j].mazeno) {
					this.currMazeID = obj[j].mazeno;
					currentLevel = i;
					return idx;
				}
			}
		}
		return -1; //not found
	},

	getUserId: function(){
		return this.userID;
	},

	getIsLogon: function(){
		return this.isLogon;
	},

	updateStatus: function(time, steps) {
		if (this.isLogon)
		{
			this.HTTPPostAsync("/play/"+this.currMazeID.toString()+"/"+this.userID.toString(), {time: time, steps: steps}, function(){});
		}
	}
}
