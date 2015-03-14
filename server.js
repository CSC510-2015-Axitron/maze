var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('server.db');

db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS user (id INTEGER NOT NULL, password TEXT NOT NULL, email TEXT NOT NULL, token TEXT, tokenInvalidAt DATE, "
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

    //debug
    db.run("INSERT OR IGNORE INTO maze (mazeno, displayName, isUserMaze, height, width, mazeJSON, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
        0, "Debug maze", false, 2, 2, "{}", 0);
    db.run("INSERT OR IGNORE INTO maze (mazeno, displayName, isUserMaze, height, width, mazeJSON, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
        1, "Debug maze 2", false, 2, 2, "{}", 0);

    //dummy users
    db.run("INSERT OR IGNORE INTO user (id, password, email) VALUES (?, ?, ?)", 0, '', 'dummy1@dum.my');
    db.run("INSERT OR IGNORE INTO user (id, password, email) VALUES (?, ?, ?)", 1, '', 'dummy2@dum.my');
});

var NodePbkdf2 = require('node-pbkdf2'),
    hasher = new NodePbkdf2({ iterations: 10000, saltLength: 20, derivedKeyLength: 60 });
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;

function userByAttr(attribute, value, done) {
    doneFunc = done;
    var rowFunc = function(err, row) {
        if(!err)
            if(row)
                doneFunc(null, row);
            else
                doneFunc(new Error('User with email '+email+' does not exist'));
        else
            doneFunc(null, null);
    };
    if(attribute === 'email')
        db.get("SELECT id, password, email, token, tokenInvalidAt FROM user WHERE email = ?", [value], rowFunc(err, row));
    else if(attribute === 'id')
        db.get("SELECT id, password, email, token, tokenInvalidAt FROM user WHERE id = ?", [value], rowFunc(err, row));
    else done(null, null);
}

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    userByAttr('id', id, function(err, user) {
        done(err, user);
    });
});

passport.use(new LocalStrategy(
    function(username, password, done) {
        findByAttr('email', username, function(err, user) {
            if(err) return done(err);
            if(!user) return done(null, false, {message:'Incorrect login'});
            hasher(password, user.password, function(err, isCorrect) {
                if(isCorrect)
                    done(null, user);
                else
                    done(null, false, {message:'Incorrect login'});
            });
        });
    }
));

var express = require('express');
var restapi = express();
var bodyParser = require('body-parser');
var session = require('express-session');

restapi.use(bodyParser.json());
restapi.set('json spaces', 4);
restapi.use(session({secret:'amazing mazes'}));
restapi.use(passport.initialize());
restapi.use(passport.session());

restapi.all('/', function(req, res) {
    var sess = req.session
});

//restapi.all('/play/*', requireAuthentication, loadUser);
//restapi.all('/user/*', requireAuthentication, loadUser);

restapi.get('/maze/:mazeno', function(req, res){
    db.get("SELECT mazeno, displayName, isUserMaze, height, width, mazeJSON, category FROM maze WHERE mazeno = ?",
        [req.params.mazeno], function(err, row){
        if(!err)
            if(row && row.mazeno != null)
                res.status(200).json(row);
            else
                res.status(404).json({"response":"maze not found","query":req.params.mazeno});
        else
            res.status(500).json({"response":"Error occurred"});
    });
});

restapi.get("/mazes/:category", function(req,res){
    db.get("SELECT id, name FROM mazeCategory WHERE id = ?", [req.params.category], function(err, row) {
        if(!err)
        {
            if(row)
            {
                var rowBack = row;
                db.all("SELECT mazeno, displayName, isUserMaze, height, width, mazeJSON, category FROM maze WHERE category = ?",
                    [req.params.category], function(err, rows){
                    if(!err)
                    {
                        var response = {"category":rowBack.id,"categoryName":rowBack.name,"mazes":[]};
                        if(rows)
                        {
                            rows.forEach(function(item) {
                                response.mazes[item.mazeno] = {"mazeno":item.mazeno, "displayName":item.displayName};
                            });
                        }
                        res.status(200).json(response);
                    }
                    else
                        res.status(500).json({"response":"Error occurred in finding mazes for category","error":err});
                });
            }
            else
            {
                res.status(404).json({"response":"category not found", "query":req.params.category});
            }
        }
        else
            res.status(500).json({"response":"Error occurred in retrieving category information","error":err});
    });
});

restapi.get("/categories", function(req, res) {
    db.all("SELECT id, name FROM mazeCategory", function(err, rows) {
        if(!err)
        {
            var response = [];
            rows.forEach(function(item) {
                response.push({"id":item.id,"name":item.name});
            });
            res.status(200).json(response);
        }
        else
        {
            res.status(500).json({"response":"Error occured in retrieving category information","error":err});
        }
    });
});

restapi.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err) }
        if (!user) {
            return res.status(401).json({"error":info.message});
        }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            return res.status(200).json({"response":true});
        });
    })(req, res, next);
});

restapi.get("/logout", function(req, res) {
    req.session.destroy(function (err) {
        if(err) res.status(500).json({"error":err});
        else res.status(200).json({"response":true});
    });
});

restapi.post('/data', function(req, res){
    db.run("UPDATE counts SET value = value + 1 WHERE key = ?", "counter", function(err, row){
        if (err){
            console.err(err);
            res.status(500);
        }
	else {
	    res.status(202);
	}	
	res.end();
    });
});


restapi.listen(3000); 
