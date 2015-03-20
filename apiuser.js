/**
 * Api user is just a simple set of example user commands for the apiClient
 */

var apiClient = require('./apiClient.js');

//====================================================================
// Example usage here
//====================================================================

//All of these functions are working up until line 34.
//apiClient.register("email", "(some password)", function(bool){
	//console.log(bool);
//});

//These functions do not work sequentially login plus one of the 
//other functions works perfectly.
apiClient.login('dummy1@dum.my', 'testpassword1', function(token, uid){
	console.log(token);
	console.log(uid);
	authToken = token;

	//apiClient.newMaze("Pit", 1, jsobject, authToken, function(resp){
		//console.log(resp);
	//})

	//apiClient.editMaze("Pit", 1, jsobject, 18, authToken, function(resp){
		//console.log(resp);
	//})

	//apiClient.keepAlive(token, function(bool){
		//console.log(bool);
	//})
	apiClient.checkInfo(token, uid, function(uid, email) {
		console.log(uid, email);
	});
	//apiClient.unameChange("master2", "commander2", token, uid, function(resp){
		//console.log(resp);
	//});
	//apiClient.logout(authToken, function(resp){
		//console.log(resp);
	//});
});

/**
apiClient.getCategories(function(resp){
	console.log("get categories: " + resp);
});

apiClient.getTopTen(0, function(resp){
	console.log("get top ten " + resp);
});

apiClient.getNumMazes(function(resp){
	console.log("get numMazes " + resp);
});


apiClient.getMazesInCategory(1, function(resp){
	console.log("get mazes in cat " + resp)
});

apiClient.getUserTimes(1, "all", function(resp){
	console.log("get user times " + resp);
});

apiClient.getUserTimes(1, 1, function(resp){
	console.log("get user times " + resp);
});

apiClient.getUserTimes(1, 100, function(resp){
	console.log("get user times individual " + resp);
});


apiClient.getMaze(1, function(resp){
	console.log(resp);
});


apiClient.getMazesByUser(32, function(resp){
	console.log("get mazes by user " + resp);
});
*/



//var jsobject = {
  //width:2,
  //height:3,
  //start:[0,1],
  //end:[1,2],
  //board:[[6,5,6],[12,1,8]]
//}