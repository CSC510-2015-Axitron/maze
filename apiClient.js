var rest = require("rest");
var mime = require('rest/interceptor/mime');
var pathPrefix = require('rest/interceptor/pathPrefix');


/**
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
	
});
*/
login("dummy1@dum.my", "testpassword1", function(bool){
	console.log(bool);
});



function login(em, pw, func) {
	var data = JSON.stringify({
		email: em,
		password: pw
	});
	client = rest.wrap(pathPrefix, { prefix: 'http://localhost:8080'});
			//.wrap(mime) 
			 //.wrap(basicAuth, { email: "dummy1@dum.my", password: "testpassword1"});

	var request = { path: "login", method:'POST', 
				entity: data, headers: {'Content-Type': 'application/json'}};

	client(request).then(function(response) {
		//console.log('response: \n', response.entity);

		if(response.entity != null){
			var ps = JSON.parse(response.entity);
			var tk = ps.token;
			//console.log(tk.length);
			if(tk.length == 36){
				func(true);
			}
		}else{
			func(false);
		}

	});
}
