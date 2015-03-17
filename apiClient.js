/*
 * Node based api for axemaze db
 */


var rest = require("rest");
var mime = require('rest/interceptor/mime');
var pathPrefix = require('rest/interceptor/pathPrefix');


//All of these functions are working up until line 34.
//register("email", "(some password)", function(bool){
	//console.log(bool);
//});

//These functions do not work sequentially login plus one of the 
//other functions works perfectly.
//login("email", "(some password)", function(token, uid){
	//console.log(token);
	//console.log(uid);
	//authToken = token;
	//keepAlive(token, function(bool){
		//console.log(bool);
	//})
	//checkInfo(token, uid, function(resp) {
		//console.log(resp);
	//});
	//unameChange("jackson", "pollack", token, uid, function(resp){
		//console.log(resp);
	//});
	//logout(authToken, function(resp){
		//console.log(resp);
	//});
//});

getCategories(function(resp){
	console.log(resp);
});

//getTopTen(0, function(resp){
	//console.log(resp);
//});

getNumMazes(function(resp){
	console.log(resp);
});

getMazesInCategory(1, function(resp){
	console.log(resp)
});

getUserTimes(1, "all", function(resp){
	console.log(resp);
});

getUserTimes(1, 1, function(resp){
	console.log(resp);
});

getMaze(1, function(resp){
	console.log(resp);
});

function getMaze(mazeno, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'})
				 .wrap(mime);
	var p = "maze/" + mazeno;
	var request = { path: p , method:'GET', headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response){	
		func(response.entity);
	});
}

//If category is all then return best times for all mazes
function getUserTimes(uid, category, func){
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

function getMazesInCategory(categoryID, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'})
				 .wrap(mime);
	var p = "mazes/" + categoryID;
	var request = { path: p , method:'GET', headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response){	
		func(response.entity);
	});
}

function getCategories(func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'})
				 .wrap(mime);
	var request = { path: 'categories' , method:'GET', headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response){	
		func(response.entity);
	});
}

function getTopTen(mazeno, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'})
				 .wrap(mime);
	var p = "topten/" + mazeno;
	var request = { path: p , method:'GET', headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response){	
		func(response.entity);
	});
}

function getNumMazes(func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'})
				 .wrap(mime);
	var request = { path: 'mazes' , method:'GET', headers: {'Content-Type': 'application/json'}};
	client(request).then(function(response){	
		func(response.entity);
	});
}

function keepAlive(token, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var request = { path: 'keepalive' , method:'GET', headers: {'Content-Type': 'application/json', 'authorization': token}};
	client(request).then(function(response){
		//console.log("response entity " + response.entity);
		var ps = JSON.parse(response.entity);
		var resp = ps.response;
		func(resp);
	});
}


function checkInfo(token, uid, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var p = "user/" + uid;
	var request = { path: p, method:'GET', headers: {'Content-Type': 'application/json', 'authorization': token}};
	client(request).then(function(response){
		console.log("response entity "+ response.entity);
		func(response.entity);
	});
}


function unameChange(em, pw, token, uid, func){
	var data = JSON.stringify({
		email: em,
		password: pw
	});
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var p = "user/" + uid;
	var request = { path: p, method:'POST', entity: data, headers: {'Content-Type': 'application/json', 'authorization': token}};
	client(request).then(function(response){
		console.log("response entity "+ response.entity);
		func(response.entity);
	});
}

function register(em, pw, func) {
	var data = JSON.stringify({
		email: em,
		password: pw
	});
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var request = { path: "register", method:'POST', 
				entity: data, headers: {'Content-Type': 'application/json'}};

	client(request).then(function(response) {
		//console.log("response entity " + response.entity);
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
 * Simple login function, returns a boolean in a callback function
 * true if login successful, false if failed.
 */
function login(em, pw, func) {
	var data = JSON.stringify({
		email: em,
		password: pw
	});
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var request = { path: "login", method:'POST', 
				entity: data, headers: {'Content-Type': 'application/json'}};

	client(request).then(function(response) {
		console.log("response entity " + response.entity);
		if(response.entity != null){
			var ps = JSON.parse(response.entity);
			var tk = ps.token;
			var uid = ps.userid;

			if(tk.length == 36)
				func(tk,uid);
		}else{
			func(null);
		}
	});
};

function logout(token, func){
	client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com'});
	var request = { path: "logout", method:'GET', headers: {'Content-Type': 'application/json', 'authorization': token}};
	client(request).then(function(response){
		console.log("response entity "+ response.entity);
		func(response.entity);
	});
};

