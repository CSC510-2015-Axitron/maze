/*
 * Node based api for axemaze db
 */

var rest = require("rest");
var mime = require('rest/interceptor/mime');
var pathPrefix = require('rest/interceptor/pathPrefix');
var apiClient = this;

/**
 * Function to edit a maze, sorry about the number of params.
 * Params:
 * - nm: name of the maze
 * - catNum: category number
 * - mapblock: block of information in this form:
 * {
 *  width:2,
 *  height:3,
 *  start:[0,1],
 *  end:[1,2],
 *  board:[[6,5,6],[12,1,8]]
 * }
 * - mazeno: number of the maze to be edited
 * - token: user authorization token
 * - func: callback returns new maze number if successful
 *   otherwise returns null.
 *	
 */
apiClient.editMaze = function(nm, catNum, mapBlock, mazeNo, token, func){
	var data = JSON.stringify({
		name: nm, 
		category: catNum,
		maze: mapBlock
	});
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var p = "maze/" + mazeNo;
	var request = { path: p, method:'POST', entity: data, headers: {'Content-Type': 'application/json', 'authorization': token}};
	client(request).then(function(response){
		var ps = JSON.parse(response.entity);
		if(ps.response === "maze updated"){
			func(true);
		}else{
			func(false);
		}
	});
}


/**
 * Function to add a new maze
 * Params:
 * - nm: name of the maze
 * - catNum: category number
 * - mapblock: block of information in this form:
 * {
 *  width:2,
 *  height:3,
 *  start:[0,1],
 *  end:[1,2],
 *  board:[[6,5,6],[12,1,8]]
 * }
 * - token: user authorization token
 * - func: callback returns new maze number if successful
 *   otherwise returns null.
 *	
 */
apiClient.newMaze = function(nm, catNum, mapBlock, token, func){
	var data = JSON.stringify({
		name: nm, 
		category: catNum,
		maze: mapBlock
	});
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var p = "maze";
	var request = { path: p, method:'POST', entity: data, headers: {'Content-Type': 'application/json', 'authorization': token}};
	client(request).then(function(response){
		var ps = JSON.parse(response.entity);
		if(ps.mazeno != null){
				func(ps.mazeno);
		}else{
			console.log(response);
			func(null);
		}
	});
}

/**
 * Function to get maze information
 * Params:
 * - mazeno: number of the maze to get
 * - func: call back that returns objects of this form:
 *{ mazeno: <mazenumber>,
 * 	displayName: <displayname>,
 *  userForMaze: <useridnum>,
 * 	height: <height>,
 *  width: <width>,
 *  mazeJSON: '{"width":2,"height":3,"start":[0,1],"end":[1,2],"board":[[6,5,6],[12,1,8]]}',
 *  category: <categorynum> }
 */
apiClient.getMaze = function(mazeno, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'})
				 .wrap(mime);
	var p = "maze/" + mazeno;
	var request = { path: p , method:'GET', headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response){	
		func(response.entity);
	});
}

/**
 * Function to get a list of user times.
 * Params:
 * - uid: user id number
 * - category: if category is all it returns all of the categories, 
 *   otherwise returns whatever category passed
 * - func: callback returns objects with this format:
 * 	 { userid: <useridnumber>, category: <categorynumber>, played: [array of times]}
 *   or error.
 */
apiClient.getUserTimes = function(uid, category, func){
	var p;
	if(category === "all"){
		p = "played/" + uid;
	}else{
		p = "played/" + uid + "/" + category;
	}
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'})
				 .wrap(mime);
	var request = { path: p , method:'GET', headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response){	
		func(response.entity);
	});
}

/**
 * Function to get a list of categories.
 * Params:
 * - func: callback returns an array of objects with this format:
 * { id: <category_id_number>, name: <category_name>}, or error object
 */
apiClient.getMazesInCategory = function(categoryID, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'})
				 .wrap(mime);
	var p = "mazes/category/" + categoryID;
	var request = { path: p , method:'GET', headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response){	
		func(response.entity);
	});
}

/**
 * Function to get a list mazes from a particular user
 * Params:
 * - userID: userIdNumber
 * - func: callback returns an array of objects with this format:
 * { mazeno: <mazenumber>, displayName: <displayname>}, or error msg.
 */
apiClient.getMazesByUser = function(userID, func) {
    client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'}).wrap(mime);
    var p = "mazes/user/" + userID;
    var request = { path: p , method:'GET', headers: {'Content-Type': 'application/json'}};
    client(request).then(function(response){
        func(response.entity);
    });
}

/**
 * Function to get a list of categories.
 * Params:
 * - func: callback returns an array of objects with this format:
 * { id: <category_id_number>, name: <category_name>}, or error.
 */
apiClient.getCategories = function(func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'})
				 .wrap(mime);
	var request = { path: 'categories' , method:'GET', headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response){	
		func(response.entity);
	});
}


/**
 * Function to get top ten times on a specific maze. 
 * Params:
 * - func: callback returns object with this format:
 * { response: response info }, or error
 *
 */
apiClient.getTopTen = function(mazeno, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'})
				 .wrap(mime);
	var p = "top10/" + mazeno;
	var request = { path: p , method:'GET', headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response){	
		func(response.entity);
	});
}


/**
 * Function to get total number of mazes in the db
 * Params:
 * - func: callback that returns the number of mazes 
 * as its only parameter. 
 */
apiClient.getNumMazes = function(func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'})
				 .wrap(mime);
	var request = { path: 'mazes' , method:'GET', headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response){	
		//var ps = JSON.parse(response.entity);
		func(response.entity.mazes);
	});
}

/**
 * Function to keep user account alive
 * Params:
 * - token: token of the logged in user
 * - func: call back that returns true if successful
 *   false otherwise.
 *
 */
apiClient.keepAlive = function(token, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var request = { path: 'keepalive' , method:'GET', headers: {'Content-Type': 'application/json', 'authorization': token}};
	client(request).then(function(response){
		var ps = JSON.parse(response.entity);
		var resp = ps.response;
		func(resp);
	});
}



/**
 * Function to get user information
 * Params:
 * - token: token of the logged in user
 * - uid: user id number
 * - func: call back that returns userid and email 
 * in that order as parameters.
 *
 */
apiClient.checkInfo = function(token, uid, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var p = "user/" + uid;
	var request = { path: p, method:'GET', headers: {'Content-Type': 'application/json', 'authorization': token}};
	client(request).then(function(response){
		var ps = JSON.parse(response.entity);
		func(ps.userid, ps.email);
	});
}

/**
 * Function to change usernames.
 * Params:
 * - em: Email adress of the user
 * - pw: Password of the user
 * - token: token of the logged in user
 * - uid: user id number
 * - func: call back that returns true if the name change is successful,
 * returns false if some failure.
 *
 */
apiClient.unameChange = function(em, pw, token, uid, func){
	var data = JSON.stringify({
		email: em,
		password: pw
	});
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var p = "user/" + uid;
	var request = { path: p, method:'POST', entity: data, headers: {'Content-Type': 'application/json', 'authorization': token}};
	client(request).then(function(response){
		var ps = JSON.parse(response.entity);
		var val = ps.response;
		if(val === "user updated"){
			func(true);
		}else{
			func(false);
		}
	});
}



/**
 * Register function for registering new users.
 * Params:
 * - em: Email adress of the user
 * - pw: Password of the user
 * - func: call back that returns true if the user is already registered, or
 *   registration is successful, returns false if some failure.
 *
 */
apiClient.register = function(em, pw, func) {
	var data = JSON.stringify({
		email: em,
		password: pw
	});
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var request = { path: "register", method:'POST', 
				entity: data, headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response) {
		if(response.entity != null){
			var ps = JSON.parse(response.entity);
			var resp = ps.response;
			if(resp === "duplicate email address" || resp === "user registered")
				func(true);
		}else{
			func(false);
		}
	});
};


/**
 * Simple login function.
 * Params:
 * - em: Email adress of the user
 * - pw: Password of the user
 * - func: call back that returns the token and userid of the authorized
 * - user, or returns null if login fails.
 *
 */
apiClient.login = function(em, pw, func) {
	var data = JSON.stringify({
		email: em,
		password: pw
	});
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var request = { path: "login", method:'POST', 
				entity: data, headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response) {
		//console.log("response entity " + response.entity);
		var ps = JSON.parse(response.entity);
		var tk = ps.token;
		var uid = ps.userid;
		if(ps.token != null){
			func(tk,uid);
		}else{
			func(null);
		}
	});
};

/**
 * Logout function does what you expect.  
 *
 * Params:  
 * - token: The auth token of the user that wants to logout
 * - func: A callback function to return the response.  Returns
 * true on a successful logout, false otherwise.
 *
 */
apiClient.logout = function(token, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var request = { path: "logout", method:'GET', headers: {'Content-Type': 'application/json', 'authorization': token}};
	client(request).then(function(response){
		var ps = JSON.parse(response.entity);
		var val = ps.response;
		//console.log("resp.entity.resp  is " + val);
		if(val === "logged out"){
			func(true);
		}else{
			func(false);
		}
	});
};

module.exports = apiClient;
