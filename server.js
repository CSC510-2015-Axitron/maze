var sqlite3 = require('sqlite3').verbose(),
    NodePbkdf2 = require('node-pbkdf2'),
    uuid = require('node-uuid'),
    express = require('express'),
    bodyParser = require('body-parser'),
    db = new sqlite3.Database('server.db'),
    hasher = new NodePbkdf2({ iterations: 10000, saltLength: 20, derivedKeyLength: 60 }),
    restapi = express();

//{token:{userid:(id), validUntil:(date)}}
var tokens = {},
    port = process.env.PORT || 8080;

setInterval(function(){
    var now = new Date();
    Object.keys(tokens).forEach(function(key){
        if(tokens[key].validUntil < now) delete tokens[key];
    });
}, 1000*60*2);

//DB initial setup
db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS user (id INTEGER NOT NULL, password TEXT NOT NULL, email TEXT NOT NULL UNIQUE ON CONFLICT ABORT, "
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
                doneFunc({"error":"user does not exist","errcode":1});//dummy error code, we don't really use them anywhere else
        else
            doneFunc(err, null);
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
		if(err)
                    if(err.errcode && err.errcode === 1)
                        return res.status(404).json({"response":"user does not exist"});
                    else
                        return res.status(500).json({"response":"error occured"});
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

restapi.get('/play/:mazeno/:user', function(req, res) {
    db.get("SELECT mazeno, userID, bestTime, stepsForBestTime FROM play WHERE mazeno = ? AND userID = ?",
        [req.params.mazeno, req.params.user], function(err, row)
    {
        if(err) return res.status(500).json({"response":"Error occurred"});
        if(!row) return res.status(404).json({"response":"user has not completed level",
            "user":req.params.user,"mazeno":req.params.mazeno});
        
        res.status(200).json({"mazeno":req.params.mazeno,"user":req.params.user,"bestTime":row.bestTime,"unit":"ms",
            "stepsForBestTime":row.stepsForBestTime});
    });
});

restapi.all('/play/:mazeno/:user', auth);

restapi.post('/play/:mazeno/:user', function(req, res) {
    if(!(req.params.user == tokens[req.headers.authorization].userid)) return res.status(403).json({"response":"not authorized"});
    if(!(req.body.time && req.body.steps)) return res.status(400).json({"response":"invalid syntax, missing parameters"});
    
    db.get("SELECT mazeno FROM maze WHERE mazeno = ?", [req.params.mazeno], function(err, row){
        if(err) return res.status(500).json({"response":"Error occurred"});
        if(!row) return res.status(404).json({"response":"maze does not exist","mazeno":req.params.mazeno});

        db.get("SELECT mazeno, userID, bestTime, stepsForBestTime FROM play WHERE mazeno = ? AND userID = ?",
            [req.params.mazeno, req.params.user], function(err, row)
        {
            if(err) return res.status(500).json({"response":"Error occurred"});
            if(!row)
            {
                db.run("INSERT INTO play (mazeno, userID, bestTime, stepsForBestTime) VALUES (?, ?, ?, ?)",
                    [req.params.mazeno, req.params.user, req.body.time, req.body.steps], function(err){
                    if(err) return res.status(500).json({"response":"Error occurred"});
                    
                    res.status(200).json({"response":"new best time entered"});
                });
            }
            else
            {
                if(row.bestTime < req.body.time) return res.status(200).json({"response":"time not better",
                    "bestTime":row.bestTime,"stepsForBestTime":row.stepsForBestTime});

                db.run("UPDATE play SET bestTime = ?, stepsForBestTime = ? WHERE mazeno = ? AND userID = ?",
                    [req.body.time, req.body.steps, req.params.mazeno, req.params.user], function(err) {
                    if(err) return res.status(500).json({"response":"Error occurred"});
                    
                    res.status(200).json({"response":"best time updated"});
                });
            }
        });
    });
});

restapi.all('/user/:user', auth);

restapi.get('/user/:user', function(req, res){
    if(tokens[req.headers.authorization].userid != req.params.user) return res.status(403).json({"response":"not authorized"});

    userByAttr('id', req.params.user, function(err, user){
        if(err) return res.status(500).json({"response":"Error occurred"});
        
        res.status(200).json({"user":req.params.user,"email":user.email});
    });
});

//does not do any password fitness checking! do your own checking >:[
restapi.post('/user/:user', function(req, res){
    if(tokens[req.headers.authorization].userid != req.params.user) return res.status(403).json({"response":"not authorized"});
    if(!(req.body.password || req.body.email)) return res.status(400).json({"response":"invalid syntax, missing parameters"});
    
    userByAttr('id', req.params.user, function(err, user){
        var newPass = user.password, newEmail = req.body.email || user.email,
        runUpdate = function(){
            db.run("UPDATE user SET email = ?, password = ? WHERE id = ?", [newEmail, newPass, req.params.user],
                function(err) {
                    if(err) return res.status(500).json({"response":"Error occurred"});
                    
                    res.status(200).json({"response":"user updated"});
                });
        };
        if(req.body.password) hasher.encryptPassword(req.body.password, function(err, encPass){
                newPass = encPass;
                runUpdate();
            });
        else
            runUpdate();
    });
});

//need to somehow limit this, but idk how
//does not do any password fitness checking!
restapi.post('/register', function(req,res){
    if(!(req.body.email && req.body.password)) return res.status(400).json({"response":"invalid syntax, missing parameters"});
    
    hasher.encryptPassword(req.body.password, function(err, encPass) {
        db.run("INSERT INTO user (email, password) VALUES (?, ?)", [req.body.email, encPass], function(err) {
            if(err)
            {
                if(err.code && err.code === 'SQLITE_CONSTRAINT')
                    return res.status(400).json({"response":"duplicate email address"})
                return res.status(500).json({"response":"Error occurred"});
            }
            if(this.lastID) return res.status(200).json({"response":"user registered","user":this.lastID});
        });
    });
});


restapi.get('/played/:user', function(req, res){
    db.all("SELECT mazeno, userID, bestTime, stepsForBestTime FROM play WHERE userID = ?",
        [req.params.user], function(err, rows) {
        if(err) return res.status(500).json({"response":"Error occurred"});

        var response = {"user":req.params.user,played:[]};
        if(rows) rows.forEach(function(item){
            response.played[item.mazeno] = {"mazeno":item.mazeno,"user":item.userID,
                "bestTime":item.bestTime,"stepsForBestTime":item.stepsForBestTime};
        });
        res.status(200).json(response);
    });
});

//get the records for a user in a category
restapi.get('/played/:user/:category', function(req, res){
    db.all("SELECT play.mazeno, userID, bestTime, stepsForBestTime FROM play, maze WHERE "
        +"play.userID = ? AND maze.mazeno = play.mazeno AND maze.category = ?",
        [req.params.user, req.params.category], function(err, rows) {
        if(err) console.log(err);
        if(err) return res.status(500).json({"response":"Error occurred"});

        var response = {"user":req.params.user,"category":req.params.category,"played":[]};
        if(rows) rows.forEach(function(item) {
            response.played.push({"mazeno":item.mazeno,"user":item.userID,"bestTime":item.bestTime,
                "stepsForBestTime":item.stepsForBestTime});
        });
        res.status(200).json(response);
    });
});

restapi.get('/top10/:mazeno', function(req,res){
    db.all("SELECT mazeno, userID, bestTime, stepsForBestTime FROM play WHERE mazeno = ? ORDER BY bestTime ASC LIMIT 0,10",
        [req.params.mazeno], function(err, rows) {
        if(err) return res.status(500).json({"response":"Error occurred"});
        var response = {"maze":req.params.mazeno,"bestTimes":[]};
        if(rows) rows.forEach(function(item){
            response.bestTimes.push({"mazeno":item.mazeno,"userID":item.userID,"bestTime":item.bestTime,
                "stepsForBestTime":item.stepsForBestTime});
        });
        res.status(200).json(response);
    });
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


restapi.listen(port, function() {
    console.log('Our app is running on http://localhost:' + port);
});
