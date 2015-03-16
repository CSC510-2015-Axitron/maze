/*

documentation!
when routes require auth, they expect a valid (not timed out) token gotten from /login in the HTTP header authorization
using CURL, this can be expressed with -H "authorization:(token)"
route : requirements; action, response(s)

gets:
/keepalive : auth'd; refreshes token validity to 30 minutes from now, error if token invalid or true if successful

/user/:user : auth'd; returns user id and email, error if token invalid or user not the same user, returns values if successful

/played/:user : none; returns user's best times and steps for all mazes they have completed, error if db error,
    values if successful

/played/:user/:category : none; returns user's best times and steps for all mazes they have completed in the given category,
    same as above

/top10/:mazeno : none; returns top 10 shortest completion times for a given maze, error if db error, values if successful

/maze/:mazeno : none; returns the maze data for a given maze, error if db error, values if successful

/mazes : none; returns count of mazes in the db, error if db error, value if successful

/mazes/:category : none; returns the category details, mazenumbers, and maze names for all mazes in a category, error if db error
    or category not valid, values if successful

/categories : none; returns details of all categories, error if db error, values if successful

/logout : auth'd; logs the user out if logged in, error if not logged in, confirmation if logged out

posts:
/keepalive : auth'd; same as get

/play/:mazeno/:user : auth'd; submits a completion time/steps for the given maze number and user, error if token invalid or
    user doesn't match or a confirmation if successful, data format is {time:(time in ms),steps:(steps)}

/user/:user : auth'd; submits a user edit request, users can only edit their email and password, and no confirmation is
    required nor asked, error if db error or neither value was edited or duplicate email, confirmation is successful,
    data format is {email:(email),password:(new password)}, both fields are optional but at least one must be present

/register : none; submits a user registration request, error if db error or duplicate email, otherwise confirmation if registered,
    data format is {email:(email),password:(password)}

/maze : auth'd; submits a new maze request, error if maze is incorrectly formatted (with an explanation why) or db error,
    confirmation if successful, data format is:
        {name:(name)(,category:(category)),maze:{height:(height),width:(width),board:[[0,0,...],[],...[]]}}
    board must be a rectangular 2d array with #width inner arrays of length #height

/maze/:mazeno : auth'd; submits a maze edit request, error if maze is incorrectly formatted or db error or not owner,
    confirmation if successful, data format is same as /maze

/login : none; submits a login request, error if db error or incorrect credentials, login token if successful

*/
if(!process.env.JAWSDB_URL) return console.log("Did you forget to set JAWSDB_URL to your mysql server params?");


var mysql = require('mysql'),
    NodePbkdf2 = require('node-pbkdf2'),
    uuid = require('node-uuid'),
    express = require('express'),
    bodyParser = require('body-parser'),
    connectionParams = process.env.JAWSDB_URL[process.env.JAWSDB_URL.length-1]==='/'?
        process.env.JAWSDB_URL: process.env.JAWSDB_URL+'/',
    db = mysql.createConnection(connectionParams),
    hasher = new NodePbkdf2({ iterations: 10000, saltLength: 20, derivedKeyLength: 60 }),//ensure this fits in password field
    restapi = express();

db.connect();

//{token:{userid:(id), validUntil:(date)}}
var tokens = {},
    port = process.env.PORT || 8080,
    debug = true;

setInterval(function(){
    var now = new Date();
    Object.keys(tokens).forEach(function(key){
        if(tokens[key].validUntil < now) delete tokens[key];
    });
}, 1000*60*2);

//DB initial setup
db.query("CREATE DATABASE IF NOT EXISTS mazedb", function(err) {
    if(err) return console.log(err);
    db.query("USE mazedb", function(err) {
        if(err) return console.log(err);
        db.query("CREATE TABLE IF NOT EXISTS user (id INTEGER AUTO_INCREMENT, password CHAR(128) NOT NULL, email VARCHAR(128) NOT NULL UNIQUE, "
              +"CONSTRAINT pk_user PRIMARY KEY (id))", function(err) {

        if(err) return console.log(err);
        db.query("CREATE TABLE IF NOT EXISTS mazeCategory (id INTEGER AUTO_INCREMENT, name VARCHAR(128) NOT NULL, "
              +"CONSTRAINT pk_mazeCat PRIMARY KEY (id))", function(err) {
    
        if(err) return console.log(err);

        db.query("CREATE TABLE IF NOT EXISTS maze (mazeno INTEGER AUTO_INCREMENT, displayName VARCHAR(128) NOT NULL, userForMaze INTEGER, height INTEGER NOT NULL, width INTEGER NOT NULL, "
              +"mazeJSON VARCHAR(65536) NOT NULL, category INTEGER DEFAULT NULL, "
              +"CONSTRAINT pk_maze PRIMARY KEY (mazeno), "
              +"CONSTRAINT fk_maze_category FOREIGN KEY (category) REFERENCES mazeCategory (id) ON UPDATE CASCADE ON DELETE SET NULL,"
              +"CONSTRAINT fk_maze_user FOREIGN KEY (userForMaze) REFERENCES user(id) ON UPDATE CASCADE ON DELETE SET NULL)",
        function(err) {
        if(err) return console.log(err);

        db.query("CREATE TABLE IF NOT EXISTS play (mazeno INTEGER, userID INTEGER, bestTime INTEGER, stepsForBestTime INTEGER, "
              +"CONSTRAINT pk_play PRIMARY KEY (mazeno, userID), "
              +"CONSTRAINT fk_play_user FOREIGN KEY (userID) REFERENCES user (id) ON UPDATE CASCADE ON DELETE CASCADE, "
              +"CONSTRAINT fk_play_maze FOREIGN KEY (mazeno) REFERENCES maze (mazeno) ON UPDATE CASCADE ON DELETE CASCADE)",
        function(err) {
        if(err) return console.log(err);

        //these categories are hardcoded here but putting in a config file with customized
        //categories would not be difficult
        db.query("INSERT IGNORE INTO mazeCategory (id, name) VALUES (?, ?)", [1,    "Small Mazes (5-10)"]);
        db.query("INSERT IGNORE INTO mazeCategory (id, name) VALUES (?, ?)", [101,    "Medium Mazes (10-20)"]);
        db.query("INSERT IGNORE INTO mazeCategory (id, name) VALUES (?, ?)", [201,    "Large Mazes (20-30)"]);
        db.query("INSERT IGNORE INTO mazeCategory (id, name) VALUES (?, ?)", [301,    "Huge Mazes (30+)"]);
    
        if(debug)
        {
            //dummy mazes
            db.query("INSERT IGNORE INTO maze (mazeno, displayName, userForMaze, height, width, mazeJSON, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [1, "Debug maze", null, 2, 2, "{}", 1]);
            db.query("INSERT IGNORE INTO maze (mazeno, displayName, userForMaze, height, width, mazeJSON, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [2, "Debug maze 2", null, 2, 2, "{}", 1]);

            //dummy users
            db.query("INSERT IGNORE INTO user (id, password, email) VALUES (?, ?, ?)", [1,
                'pec3ZNq6/AnleyBwy3Ft::wYjmgHHjB4zJDYHiH1jnTX7YtQCIq86PgQvfzrsagsnyAk5jKprTsIS4Os3IzGFqhKFqeaH3tkUXSJh3::60::10000',
                'dummy1@dum.my']);//testpassword1
            db.query("INSERT IGNORE INTO user (id, password, email) VALUES (?, ?, ?)", [2,
                'LJf57nNfbkdcdgWzEqIe::HbrEUuOKIg1TzoWnZBdYBlUy1NqPr+YfL59NLCd7lSksyodThL8xoHN7GdLg6qdQwZ6YtNBcHrRfQ8Os::60::10000',
                'dummy2@dum.my']);//testpassword27
        } }); }); }); });
    });
});


function userByAttr(attribute, value, done) {
    doneFunc = done;
    var rowFunc = function(err, row) {
        if(!err)
            if(row && row[0])
                doneFunc(null, row[0])
            else
                doneFunc({"error":"user does not exist","errcode":1});//dummy error code, we don't really use them anywhere else
        else
            doneFunc(err, null);
    };
    if(attribute === 'email')
        db.query("SELECT id, password, email FROM user WHERE email = ?", [value], rowFunc);
    else if(attribute === 'id')
        db.query("SELECT id, password, email FROM user WHERE id = ?", [value], rowFunc);
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
    if(!(req.body.email && req.body.password)) return res.status(401).json({"response":"No login credentials"});

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
    db.query("SELECT mazeno, userID, bestTime, stepsForBestTime FROM play WHERE mazeno = ? AND userID = ?",
        [req.params.mazeno, req.params.user], function(err, row)
    {
        if(err) return res.status(500).json({"response":"Error occurred"});
        if(!row || !row[0]) return res.status(404).json({"response":"user has not completed level",
            "user":req.params.user,"mazeno":req.params.mazeno});
        
        res.status(200).json({"mazeno":req.params.mazeno,"user":req.params.user,"bestTime":row[0].bestTime,"unit":"ms",
            "stepsForBestTime":row[0].stepsForBestTime});
    });
});

restapi.all('/play/:mazeno/:user', auth);

restapi.post('/play/:mazeno/:user', function(req, res) {
    if(!(req.params.user == tokens[req.headers.authorization].userid)) return res.status(403).json({"response":"not authorized"});
    if(!(req.body.time && req.body.steps)) return res.status(400).json({"response":"invalid syntax, missing parameters"});
    
    db.query("SELECT mazeno FROM maze WHERE mazeno = ?", [req.params.mazeno], function(err, row){
        if(err) return res.status(500).json({"response":"Error occurred"});
        if(!row || !row[0]) return res.status(404).json({"response":"maze does not exist","mazeno":req.params.mazeno});

        db.query("SELECT mazeno, userID, bestTime, stepsForBestTime FROM play WHERE mazeno = ? AND userID = ?",
            [req.params.mazeno, req.params.user], function(err, row)
        {
            if(err) return res.status(500).json({"response":"Error occurred"});
            if(!row || !row[0])
            {
                db.query("INSERT INTO play (mazeno, userID, bestTime, stepsForBestTime) VALUES (?, ?, ?, ?)",
                    [req.params.mazeno, req.params.user, req.body.time, req.body.steps], function(err){
                    if(err) return res.status(500).json({"response":"Error occurred"});
                    
                    res.status(200).json({"response":"new best time entered"});
                });
            }
            else
            {
                if(row[0].bestTime < req.body.time) return res.status(200).json({"response":"time not better",
                    "bestTime":row[0].bestTime,"stepsForBestTime":row[0].stepsForBestTime});

                db.query("UPDATE play SET bestTime = ?, stepsForBestTime = ? WHERE mazeno = ? AND userID = ?",
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
            db.query("UPDATE user SET email = ?, password = ? WHERE id = ?", [newEmail, newPass, req.params.user],
                function(err, result) {
                    if(err && err.code && err.code === 'ER_DUP_ENTRY')
                        return res.status(400).json({"response":"duplicate email address"});
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
        db.query("INSERT INTO user (email, password) VALUES (?, ?)", [req.body.email, encPass], function(err, result) {
            if(err)
            {
                if(err.code && err.code === 'ER_DUP_ENTRY')
                    return res.status(400).json({"response":"duplicate email address"})
                return res.status(500).json({"response":"Error occurred"});
            }
            if(result.insertId) return res.status(200).json({"response":"user registered","user":result.insertId});
        });
    });
});


restapi.get('/played/:user', function(req, res){
    db.query("SELECT mazeno, userID, bestTime, stepsForBestTime FROM play WHERE userID = ?",
        [req.params.user], function(err, rows) {
        if(err) return res.status(500).json({"response":"Error occurred"});

        var response = {"user":req.params.user,played:[]};
        if(rows) rows.forEach(function(item){
            response.played.push({"mazeno":item.mazeno,"user":item.userID,"bestTime":item.bestTime,
                "stepsForBestTime":item.stepsForBestTime});
        });
        res.status(200).json(response);
    });
});

//get the records for a user in a category
restapi.get('/played/:user/:category', function(req, res){
    db.query("SELECT play.mazeno, userID, bestTime, stepsForBestTime FROM play, maze WHERE "
        +"play.userID = ? AND maze.mazeno = play.mazeno AND maze.category = ?",
        [req.params.user, req.params.category], function(err, rows) {
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
    db.query("SELECT mazeno, userID, bestTime, stepsForBestTime FROM play WHERE mazeno = ? ORDER BY bestTime ASC LIMIT 0,10",
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

//returnFunc(valid?, error)
function checkMaze(json, returnFunc){
    if(!(json.maze && json.name))
        return returnFunc(false, "missing maze or name");

    var maze = json.maze;
    if(!(maze.width && maze.height && maze.start && maze.end && maze.board))
        return returnFunc(false, "missing width, height, start, end, or board");

    var lengthsOk = true;
    for(var i = 0; i < maze.board.length; i++) {lengthsOk = lengthsOk && maze.board[i].length === maze.height}
    if(!(maze.board.length == maze.width && lengthsOk))
        return returnFunc(false, "board not rectangular");

    if(!(maze.start[0] >= 0 && maze.start[0] < maze.width && maze.start[1] >= 0 && maze.start[1] < maze.height))
        return returnFunc(false, "start not inside board");

    if(!(maze.end[0] >= 0 && maze.end[0] < maze.width && maze.end[1] >= 0 && maze.end[1] < maze.height))
        return returnFunc(false, "end not inside board");
    
    returnFunc(true);
}

restapi.post('/maze', auth, function(req, res){
    checkMaze(req.body, function(valid, err) {
        if(!valid) return res.status(400).json({"response":"invalid syntax","reason":err});
        db.query("INSERT INTO maze (displayName, userForMaze, height, width, mazeJSON, category) VALUES "
              +"($name, $user, $height, $width, $mazeJSON, $category)",
            {"$name":req.body.name,"$user":tokens[req.headers.authorization].userid,"$height":req.body.maze.height,
                "$width":req.body.maze.width,"$mazeJSON":JSON.stringify(req.body.maze),"$category":req.body.category},
        function(err, result){
            if(err) return res.status(500).json({"response":"Error occurred"});
            if(result.insertId) return res.status(200).json({"mazeno":result.insertId});
            return res.status(500).json({"response":"Error occurred"});
        });
    });
});

//editing an old maze (that the user owns)
restapi.post('/maze/:mazeno', auth, function(req, res){
    checkMaze(req.body, function(valid, err){
        if(!valid) return res.status(400).json({"response":"invalid syntax","reason":err});
        db.query("SELECT mazeno, displayName, userForMaze, height, width, mazeJSON, category FROM maze WHERE mazeno = ?",
            [req.params.mazeno], function(err, row){
            if(err) return res.status(500).json({"response":"Error occurred"});
            
            if(!row || !row[0]) return res.status(404).json({"response":"maze not found","mazeno":req.params.mazeno});
            
            if(tokens[req.headers.authorization].userid !== row[0].userForMaze)
                return res.status(403).json({"response":"not authorized"});

            db.query("UPDATE maze SET displayName = $name, height = $height, width = $width, mazeJSON = $mazeJSON, "
                  +"category = $category WHERE mazeno = $mazeno",
                {"$name":req.body.name,"$height":req.body.maze.height,"$width":req.body.maze.width,
                    "$mazeJSON":JSON.stringify(req.body.maze),"$category":req.body.category,"$mazeno":req.params.mazeno},
            function(err, result){
                if(err) return res.status(500).json({"response":"Error occurred"});
                if(result.affectedRows > 0) return res.status(200).json({"response":"maze updated"});
                return res.status(500).json({"response":"Error occurred"});
            });
        });
    });
});

restapi.get('/maze/:mazeno', function(req, res){
    db.query("SELECT mazeno, displayName, userForMaze, height, width, mazeJSON, category FROM maze WHERE mazeno = ?",
        [req.params.mazeno], function(err, row){
        if(err) return res.status(500).json({"response":"Error occurred"});
		if(!(row && row[0] && row[0].mazeno != null)) return res.status(404).json({"response":"maze not found","query":req.params.mazeno});
		res.status(200).json(row[0]);
    });
});

restapi.get("/mazes", function(req, res){
    db.query("SELECT count(*) as numMazes from maze", function(err, row) {
        if(err) return res.status(500).json({"response":"Error occurred"});
        if(!row || !row[0]) return res.status(500).json({"response":"Error occurred"});

        res.status(200).json({"mazes":row[0].numMazes});
    });
});

restapi.get("/mazes/:category", function(req,res){
    db.query("SELECT id, name FROM mazeCategory WHERE id = ?", [req.params.category], function(err, row) {
        if(err) return res.status(500).json({"response":"Error occurred in retrieving category information","error":err});
        if(!row || !row[0]) return res.status(404).json({"response":"category not found", "query":req.params.category});

        var rowBack = row[0];
        db.query("SELECT mazeno, displayName, userForMaze, height, width, mazeJSON, category FROM maze WHERE category = ?",
            [req.params.category], function(err, rows)
        {
            if(err) return res.status(500).json({"response":"Error occurred in finding mazes for category","error":err});
            var response = {"category":rowBack.id,"categoryName":rowBack.name,"mazes":[]};
            if(rows)
            {
                rows.forEach(function(item) {
                    response.mazes.push({"mazeno":item.mazeno, "displayName":item.displayName});
                });
            }
            res.status(200).json(response);
        });
    });
});

restapi.get("/categories", function(req, res) {
    db.query("SELECT id, name FROM mazeCategory", function(err, rows) {
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
