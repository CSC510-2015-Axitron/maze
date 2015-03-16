var rest = require("rest");
var mime = require('rest/interceptor/mime');
var pathPrefix = require('rest/interceptor/pathPrefix');
var basicAuth = require('rest/interceptor/basicAuth')

client = rest.wrap(mime)
			 .wrap(pathPrefix, { prefix: 'http://axemaze-db.herokuapp.com/'})
			 .wrap(basicAuth, { username: "dummy1@dum.my", password: "testpassword1"});

client({ path: 'login'}).then(function(response) {
	console.log('response: \n', response);
	/**
	for(var i = 0; i < response.entity.length; i++){
		console.log(response.entity[i].name)
	}
	*/
});

