var requestify = require('requestify');
requestify.post('http://localhost:8080/login', {
		email: "dummy1@dum.my", 
		password: "testpassword1"
}).then(function(response){
	console.log("body is" + response.body);
});