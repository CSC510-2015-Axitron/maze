var sqlite3 = require('sqlite3').verbose(),
    NodePbkdf2 = require('node-pbkdf2'),
    uuid = require('node-uuid'),
    express = require('express'),
    bodyParser = require('body-parser'),
    db = new sqlite3.Database('server.db'),
    hasher = new NodePbkdf2({ iterations: 10000, saltLength: 20, derivedKeyLength: 60 }),
    restapi = express();

//{token:{userid:(id), validUntil:(date)}}
var tokens = {};

setInterval(function(){
    var now = new Date();
    Object.keys(tokens).forEach(function(key){
        if(tokens[key].validUntil < now) delete tokens[key];
    });
}, 1000*60*2);

//DB initial setup
db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS user (id INTEGER NOT NULL, password TEXT NOT NULL, email TEXT NOT NULL, "
          +"CONSTRAINT pk_user PRIMARY KEY (id) ON CONFLICT ABORT)");

    db.run("CREATE TABLE IF NOT EXISTS mazeCategory (id INTEGER NOT NULL, name TEXT NOT NULL, "
          +"CONSTRAINT pk_mazeCat PRIMARY KEY (id) ON CONFLICT ABORT)");

    db.run("CREATE TABLE IF NOT EXISTS maze (mazeno INTEGER NOT NULL, displayName TEXT NOT NULL, isUserMaze BOOLEAN, height INTEGER NOT NULL, width INTEGER NOT NULL, "
          +"mazeJSON TEXT NOT NULL, category INTEGER DEFAULT NULL, "
          +"CONSTRAINT pk_maze PRIMARY KEY (mazeno) ON CONFLICT ABORT, "
          +"CONSTRAINT fk_maze FOREIGN KEY (category) REFERENCES mazeCategory (id) ON UPDATE CASCADE ON DELETE SET NULL)");

    db.run("CREATE TABLE IF NOT EXISTS play (mazeno INTEGER, userID INTEGER, bestTime INTEGER, stepsForBestTime INTEGER, "
          +"CONSTRAINT pk_play PRIMARY KEY (mazeno, userID) ON CONFLICT REPLACE, "
          +"CONSTRAINT fk_play_user FOREIGN KEY (userID) REFERENCES user (id) ON UPDATE CASCADE ON DELETE CASCADE, "
          +"CONSTRAINT fk_play_maze FOREIGN KEY (mazeno) REFERENCES maze (mazeno) ON UPDATE CASCADE ON DELETE CASCADE)");

    //these categories are hardcoded here but putting in a config file with customized
    //categories would not be difficult
    db.run("INSERT OR IGNORE INTO mazeCategory (id, name) VALUES (?, ?)", 000,    "Small Mazes (5-10)");
    db.run("INSERT OR IGNORE INTO mazeCategory (id, name) VALUES (?, ?)", 100,    "Medium Mazes (10-20)");
    db.run("INSERT OR IGNORE INTO mazeCategory (id, name) VALUES (?, ?)", 200,    "Large Mazes (20-30)");
    db.run("INSERT OR IGNORE INTO mazeCategory (id, name) VALUES (?, ?)", 300,    "Huge Mazes (30+)");

    //dummy mazes
    db.run("INSERT OR IGNORE INTO maze (mazeno, displayName, isUserMaze, height, width, mazeJSON, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
        0, "Debug maze", false, 2, 2, "{}", 0);
    db.run("INSERT OR IGNORE INTO maze (mazeno, displayName, isUserMaze, height, width, mazeJSON, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
        1, "Debug maze 2", false, 2, 2, "{}", 0);

    //dummy users
    db.run("INSERT OR IGNORE INTO user (id, password, email) VALUES (?, ?, ?)", 0,
        'pec3ZNq6/AnleyBwy3Ft::wYjmgHHjB4zJDYHiH1jnTX7YtQCIq86PgQvfzrsagsnyAk5jKprTsIS4Os3IzGFqhKFqeaH3tkUXSJh3::60::10000',
        'dummy1@dum.my');//testpassword1
    db.run("INSERT OR IGNORE INTO user (id, password, email) VALUES (?, ?, ?)", 1,
        'LJf57nNfbkdcdgWzEqIe::HbrEUuOKIg1TzoWnZBdYBlUy1NqPr+YfL59NLCd7lSksyodThL8xoHN7GdLg6qdQwZ6YtNBcHrRfQ8Os::60::10000',
        'dummy2@dum.my');//testpassword27
});


function userByAttr(attribute, value, done) {
    doneFunc = done;
    var rowFunc = function(err, row) {
        if(!err)
            if(row)
                doneFunc(null, row);
            else
                doneFunc(new Error('User with identifier '+value+' does not exist'));
        else
            doneFunc(null, null);
    };
    if(attribute === 'email')
        db.get("SELECT id, password, email FROM user WHERE email = ?", [value], rowFunc);
    else if(attribute === 'id')
        db.get("SELECT id, password, email FROM user WHERE id = ?", [value], rowFunc);
    else done(null, null);
}


//req.headers.authorization is where a login token will be stored if being used
function auth(req, res, next) {
    if(req.headers.authorization &&
        tokens[req.headers.authorization] &&
        tokens[req.headers.authorization].validUntil > new Date()
    )
    {
        var now = new Date();
        tokens[req.headers.authorization].validUntil = now.setMinutes(now.getMinutes() + 30);
        next();
    }
    else
    {
        res.status(401).json({"response":"unauthorized token"});
    }
}

function login(req, res) {
    if(req.headers.authorization && tokens[req.headers.authorization])
    {
        if(tokens[req.headers.authorization].validUntil > new Date())
            return  res.status(403).json({"response":"already authorized"});
        else delete tokens[req.headers.authorization];
    }
    if(!(req.body.email && req.body.password)) return res.status(401).json({"response":"invalid login credentials"});

	userByAttr('email', req.body.email, function(err, user) {
		if(err) return res.status(500).json({"response":"error occured"});
		hasher.checkPassword(req.body.password, user.password, function(err, passCorrect) {
			if(err) return res.status(500).json({"response":"error occurred"});
			if(passCorrect)
			{
				var token = uuid.v4(), dateExpire = new Date();
				tokens[token] = {"userid":user.id, "validUntil":(dateExpire.setMinutes(dateExpire.getMinutes() + 30))};
				res.status(200).json({"token":token});
			}
			else res.status(401).json({"response":"invalid login credentials"});
		});
	});
}

function logout(req, res) {
    if(!(req.headers.authorization && tokens[req.headers.authorization])) return res.status(401).json({"response":"not logged in"});

	delete tokens[req.headers.authorization];
	res.status(200).json({"response":"logged out"});
}

restapi.use(bodyParser.json());
restapi.set('json spaces', 4);


//routes

restapi.all('/keepalive', auth, function(req, res) {
    res.status(200).json({"response":true});
});

restapi.all('/play/:mazeno/:user', auth, function(req, res) {
    res.status(200).json({"action":"play","maze":req.params.mazeno,"user":req.params.user});
});
restapi.all('/user/:user', auth, function(req, res) {
    res.status(200).json({"action":"user","user":req.params.user});
});

restapi.get('/maze/:mazeno', function(req, res){
    db.get("SELECT mazeno, displayName, isUserMaze, height, width, mazeJSON, category FROM maze WHERE mazeno = ?",
        [req.params.mazeno], function(err, row){
        if(err) return res.status(500).json({"response":"Error occurred"});
		if(!(row && row.mazeno != null)) return res.status(404).json({"response":"maze not found","query":req.params.mazeno});
		res.status(200).json(row);
    });
});

restapi.get("/mazes/:category", function(req,res){
    db.get("SELECT id, name FROM mazeCategory WHERE id = ?", [req.params.category], function(err, row) {
        if(err) return res.status(500).json({"response":"Error occurred in retrieving category information","error":err});
        if(!row) return res.status(404).json({"response":"category not found", "query":req.params.category});

        var rowBack = row;
        db.all("SELECT mazeno, displayName, isUserMaze, height, width, mazeJSON, category FROM maze WHERE category = ?",
            [req.params.category], function(err, rows)
        {
            if(err) return res.status(500).json({"response":"Error occurred in finding mazes for category","error":err});
            var response = {"category":rowBack.id,"categoryName":rowBack.name,"mazes":[]};
            if(rows)
            {
                rows.forEach(function(item) {
                    response.mazes[item.mazeno] = {"mazeno":item.mazeno, "displayName":item.displayName};
                });
            }
            res.status(200).json(response);
        });
    });
});

restapi.get("/categories", function(req, res) {
    db.all("SELECT id, name FROM mazeCategory", function(err, rows) {
        if(err) return res.status(500).json({"response":"Error occured in retrieving category information","error":err});

		var response = [];
		rows.forEach(function(item) {
			response.push({"id":item.id,"name":item.name});
		});
		res.status(200).json(response);
    });
});

restapi.post("/login", login);

restapi.get("/logout", logout);

restapi.all("/", function(req, res) {
    res.status(404).json({"response":"not found"});
});

var port = process.env.PORT || 8080;

restapi.listen(port, function() {
    console.log('Our app is running on http://localhost:' + port);
});





//restapi.listen(3000);
