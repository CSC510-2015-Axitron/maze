var rest = require("rest");
var mime = require('rest/interceptor/mime');
var pathPrefix = require('rest/interceptor/pathPrefix');

var data = JSON.stringify({
	email: "dummy1@dum.my", 
	password: "testpassword1"
});

client = rest.wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com/'});
			//.wrap(mime) 
			 //.wrap(basicAuth, { email: "dummy1@dum.my", password: "testpassword1"});

var request = { path: "login", method:'POST', 
				entity: data, headers: {'Content-Type': 'application/json'}};
				
client(request).then(function(response) {
	console.log('response: \n', response.entity);
	/**
	for(var i = 0; i < response.entity.length; i++){
		console.log(response.entity[i].name)
	}
	*/
});
