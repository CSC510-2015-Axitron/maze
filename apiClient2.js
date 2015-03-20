var http = require('http');

var data = JSON.stringify({
	email: "dummy1@dum.my", 
	password: "testpassword1"
});

var options = {
	host: "localhost",
	port: '8080',
	path: '/login',
	method: 'POST',
	headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }

};

callback = function(response) {
	var str = ''
	response.on('data', function (chunk) {
		str += chunk;
	});
	response.on('end', function() {
		console.log(str);
	});
}

var req = http.request(options, callback);

req.write(data);
req.end