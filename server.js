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

/mazes/category/:category : none; returns the category details, mazenumbers, and maze names for all mazes in a category,
    error if db error or category not valid, values if successful

/mazes/user/:user : none; returns the mazes submitted by that user, error if db error or user not valid, values if successful

/categories : none; returns details of all categories, error if db error, values if successful

/logout : auth'd; logs the user out if logged in, error if not logged in, confirmation if logged out

/maze/gen/algorithms : none; returns an array of valid algorithms that /maze/gen/:algorithm will accept

posts:
/keepalive : auth'd; same as get

/play/:mazeno/:user : auth'd; submits a completion time/steps for the given maze number and user, error if token invalid or
    user doesn't match or a confirmation if successful, data format is { time:(time in ms), steps:(steps) }

/user/:user : auth'd; submits a user edit request, users can only edit their email and password, and no confirmation is
    required nor asked, error if db error or neither value was edited or duplicate email, confirmation is successful,
    data format is { email:(email), password:(new password) }, both fields are optional but at least one must be present

/register : none; submits a user registration request, error if db error or duplicate email, otherwise confirmation if registered,
    data format is { email:(email), password:(password) }

/maze : auth'd; submits a new maze request, error if maze is incorrectly formatted (with an explanation why) or db error,
    confirmation if successful, data format is:
        { name: (name) (, category: (category) ),
            maze:
            {
                height:(height), width:(width), start:[0,0], end:[0,0],
                board:[ [ 0,0,... ], [ ], ... [ ] ]
            }
        }
    board must be a rectangular 2d array with #width inner arrays of length #height

/maze/:mazeno : auth'd; submits a maze edit request, error if maze is incorrectly formatted or db error or not owner,
    confirmation if successful, data format is same as /maze

/login : none; submits a login request, error if db error or incorrect credentials, login token if successful,
    data format is { email:(email), password:(password) }

/maze/gen : none, submits a maze generator request, data format is
    {
        algorithm:(alg, picked from /maze/gen/algorithms)
        seed:(optional number)
    }
    it will return a maze in the format
    {
        maze:(normal maze data),
        algorithm:(same as requested),
        seed:(the used seed, either player specified or randomly generated if not specified)
    }

*/
if(!process.env.JAWSDB_URL) return console.log("Did you forget to set JAWSDB_URL to your mysql server params?");


var mysql = require('mysql'),
    NodePbkdf2 = require('node-pbkdf2'),
    uuid = require('node-uuid'),
    express = require('express'),
    cors = require('cors'),
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
    debug = false;

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
            {
                doneFunc(null, row[0])
            }
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
				res.status(200).json({"userid":user.id,"token":token});
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

//to get a seedable random function
seedRandom = function(s) {
    return function() {
        s = Math.sin(s) * 10000; return s - Math.floor(s);
    };
};

Array.prototype.peek = function() {
    return this[this.length-1];
};

var N_CONST = 1,
    E_CONST = 2,
    S_CONST = 4,
    W_CONST = 8;

//Performs an A* Search to get the distance of the shortest path
//between the specified two points in a maze.
//Returns infinity if there is no path.
function distanceBetweenMazePoints(maze, start, end)
{
	var nodes_closed = [];
	var nodes_open_pqindex = [];
	var priority_queue = [];
	var nodes_backtrack = [];
	var nodes_fscore = [];
	var nodes_gscore = [];
	for (var y = 0; y < maze.height; y++) {
		for (var x = 0; x < maze.width; x++) {
			nodes_closed[x * maze.height + y] = false;
			nodes_open_pqindex[x * maze.height + y] = -1;
			nodes_backtrack[x * maze.height + y] = [-1, -1];
			nodes_fscore[x * maze.height + y] = Infinity;
			nodes_gscore[x * maze.height + y] = Infinity;
		}
	}
	priority_queue[0] = start;
	nodes_gscore[start[0] * maze.height + start[1]] = 0;
	nodes_fscore[start[0] * maze.height + start[1]] = nodes_gscore[start[0] * maze.height + start[1]] + Math.abs(start[0] - end[0]) + Math.abs(start[1] - end[1]);
	nodes_open_pqindex[start[0] * maze.height + start[1]] = 0;
	
	while (priority_queue.length != 0) {
		current = priority_queue[priority_queue.length - 1];
		if (current[0] == end[0] && current[1] == end[1])
			return nodes_gscore[end[0] * maze.height + end[1]];
		
		nodes_open_pqindex[current[0] * maze.height + current[1]] = -1;
		priority_queue = priority_queue.splice(0, priority_queue.length - 1);
		nodes_closed[current[0] * maze.height + current[1]] = true;
		var neighbor_directions = [ [-1,0,W_CONST],[0,-1,N_CONST],[1,0,E_CONST],[0,1,S_CONST] ];
		for (var i = 0; i < neighbor_directions.length; i++) {
			var neighbor_direction = neighbor_directions[i];
			if (current[0] == 0 && neighbor_direction[0] == -1) continue;
			if (current[1] == 0 && neighbor_direction[1] == -1) continue;
			if (current[0] == maze.width -1 && neighbor_direction[0] == 1) continue;
			if (current[1] == maze.height-1 && neighbor_direction[1] == 1) continue;
			
			if (!(maze.board[current[0]][current[1]] & neighbor_directions[i][2])) continue;

			var neighbor = [current[0] + neighbor_direction[0], current[1] + neighbor_direction[1]];
			if (typeof(nodes_closed) !== 'undefined' && typeof(nodes_closed[neighbor[0] * maze.height + neighbor[1]]) !== 'undefined'
				&& nodes_closed[neighbor[0] * maze.height + neighbor[1]]) continue;

			tentative_gscore = nodes_gscore[current[0] * maze.height + current[1]] + 1;
			
			if (nodes_open_pqindex[neighbor[0] * maze.height + neighbor[1]]==-1 || tentative_gscore < nodes_gscore[neighbor[0] * maze.height + neighbor[1]]) {
				nodes_backtrack[neighbor[0] * maze.height + neighbor[1]] = current;
				nodes_gscore[neighbor[0] * maze.height + neighbor[1]] = tentative_gscore;
				nodes_fscore[neighbor[0] * maze.height + neighbor[1]] = nodes_gscore[neighbor[0] * maze.height + neighbor[1]] + Math.abs(neighbor[0] - end[0]) + Math.abs(neighbor[1] - end[1]);
				
				var pq_index;
				if (nodes_open_pqindex[neighbor[0] * maze.height + neighbor[1]] == -1) {
					pq_index = priority_queue.length;
					nodes_open_pqindex[neighbor[0] * maze.height + neighbor[1]] = pq_index;
					priority_queue[priority_queue.length] = neighbor;
				} else {
					pq_index = nodes_open_pqindex[neighbor[0] * maze.height + neighbor[1]];
				}
				
				while (pq_index != 0 && nodes_fscore[priority_queue[pq_index][0] * maze.height + priority_queue[pq_index][1]] >
						nodes_fscore[priority_queue[pq_index-1][0] * maze.height + priority_queue[pq_index-1][1]]) {
					var one_that_was_ahead = priority_queue[pq_index];
					var one_that_was_behind = priority_queue[pq_index-1];
					priority_queue[pq_index-1] = one_that_was_ahead;
					priority_queue[pq_index] = one_that_was_behind;
					nodes_open_pqindex[one_that_was_ahead[0] * maze.height + one_that_was_ahead[1]]--;
					nodes_open_pqindex[one_that_was_behind[0] * maze.height + one_that_was_behind[1]]++;
					pq_index--;
				}
				while (pq_index != priority_queue.length-1 && nodes_fscore[priority_queue[pq_index][0] * maze.height + priority_queue[pq_index][1]]
						< nodes_fscore[priority_queue[pq_index+1][0] * maze.height + priority_queue[pq_index+1][1]]) {
					var one_that_was_ahead = priority_queue[pq_index];
					var one_that_was_behind = priority_queue[pq_index-1];
					priority_queue[pq_index-1] = one_that_was_ahead;
					priority_queue[pq_index] = one_that_was_behind;
					nodes_open_pqindex[one_that_was_ahead[0] * maze.height + one_that_was_ahead[1]]--;
					nodes_open_pqindex[one_that_was_behind[0] * maze.height + one_that_was_behind[1]]++;
					pq_index++;
				}
				
			}
		}
	}
	return Infinity;
}

//methods to generate a maze algorithmically
//all take width, height, seed
//all return {seed:(seed), maze:(complete maze)}
function genRecursiveBacktracker (width, height, seed)
{
    var ret = {"seed":(seed || Math.floor(Math.random() * 5000000))},
    myRandom = seedRandom(seed),
    stack = [],
    maze = {"width":width,"height":height, board:[]};
    for( var x = width; x--; )
    {
        maze.board.push([]);
        for( var y = height; y--; )
        {
            maze.board[width-x-1].push(0);
        }
    }
    //this algorithm always starts at one of the corners and ends in the opposite corner
    //just because I said so
    maze.start = [Math.round(myRandom())*(width-1), Math.round(myRandom())*(height-1)];
    maze.end = [(width-1)-maze.start[0], (height-1)-maze.start[1]];

    stack.push(maze.start);
    while(stack.length > 0) {
        var validSpots = [], dirs=[], antidirs = [], currSpot = stack.peek();
        if(currSpot[0]-1 >= 0 && maze.board[currSpot[0]-1][currSpot[1]] == 0) //w
        {
            validSpots.push([currSpot[0]-1, currSpot[1]]);
            dirs.push(W_CONST);
            antidirs.push(E_CONST);
        }
        if(currSpot[1]-1 >= 0 && maze.board[currSpot[0]][currSpot[1]-1] == 0) //n
        {
            validSpots.push([currSpot[0], currSpot[1]-1]);
            dirs.push(N_CONST);
            antidirs.push(S_CONST);
        }
        if(currSpot[0]+1 < width && maze.board[currSpot[0]+1][currSpot[1]] == 0) //e
        {
            validSpots.push([currSpot[0]+1, currSpot[1]]);
            dirs.push(E_CONST);
            antidirs.push(W_CONST);
        }
        if(currSpot[1]+1 < height && maze.board[currSpot[0]][currSpot[1]+1] == 0) //s
        {
            validSpots.push([currSpot[0], currSpot[1]+1]);
            dirs.push(S_CONST);
            antidirs.push(N_CONST);
        }
        
        if(validSpots.length == 0) stack.pop();
        else
        {
            var idx = Math.floor(myRandom() * validSpots.length);
            stack.push(validSpots[idx]);
            maze.board[currSpot[0]][currSpot[1]] |= dirs[idx];
            maze.board[validSpots[idx][0]][validSpots[idx][1]] |= antidirs[idx];
        }
    }
	
	//Iteratively move endpoints to make them better
	var dist = distanceBetweenMazePoints(maze, maze.start, maze.end);
	while (true) {
		var neighbor_directions = [ [-1,0],[0,-1],[1,0],[0,1] ];
		var neighbor_directions_in_order = [ [0,0], [0,0], [0,0], [0,0] ];
		var index1 = Math.floor(myRandom() % 4);
		neighbor_directions_in_order[0] = neighbor_directions[index1];
		neighbor_directions[index1] = neighbor_directions[3];
		var index2 = Math.floor(myRandom() % 3);
		neighbor_directions_in_order[1] = neighbor_directions[index2];
		neighbor_directions[index2] = neighbor_directions[2];
		var index3 = Math.floor(myRandom() % 2);
		neighbor_directions_in_order[2] = neighbor_directions[index3];
		neighbor_directions[index3] = neighbor_directions[1];
		neighbor_directions_in_order[3] = neighbor_directions[0];
		
		var advanced = false;
		if (Math.floor(myRandom() % 2) == 0) {
			for (var i = 0; i < 4; i++) {
				if ((maze.start[0] == 0 && neighbor_directions_in_order[i][0] == -1)
					|| (maze.start[1] == 0 && neighbor_directions_in_order[i][1] == -1)
					|| (maze.start[0] == maze.width -1 && neighbor_directions_in_order[i][0] == 1)
					|| (maze.start[1] == maze.height-1 && neighbor_directions_in_order[i][1] == 1))
						continue;
				var neighbor = [maze.start[0] + neighbor_directions_in_order[i][0], maze.start[1] + neighbor_directions_in_order[i][1]];
				var new_dist = distanceBetweenMazePoints(maze, neighbor, maze.end);
				if (new_dist > dist) {
					maze.start = neighbor;
					dist = new_dist;
					advanced = true;
					break;
				}
			}
			if (advanced) continue;
			for (var i = 0; i < 4; i++) {
				if ((maze.end[0] == 0 && neighbor_directions_in_order[i][0] == -1)
					|| (maze.end[1] == 0 && neighbor_directions_in_order[i][1] == -1)
					|| (maze.end[0] == maze.width -1 && neighbor_directions_in_order[i][0] == 1)
					|| (maze.end[1] == maze.height-1 && neighbor_directions_in_order[i][1] == 1))
						continue;
				var neighbor = [maze.end[0] + neighbor_directions_in_order[i][0], maze.end[1] + neighbor_directions_in_order[i][1]];
				var new_dist = distanceBetweenMazePoints(maze, maze.start, neighbor);
				if (new_dist > dist) {
					maze.end = neighbor;
					dist = new_dist;
					advanced = true;
					break;
				}
			}
			if (!advanced) break;
		} else {
			for (var i = 0; i < 4; i++) {
				if ((maze.end[0] == 0 && neighbor_directions_in_order[i][0] == -1)
					|| (maze.end[1] == 0 && neighbor_directions_in_order[i][1] == -1)
					|| (maze.end[0] == maze.width -1 && neighbor_directions_in_order[i][0] == 1)
					|| (maze.end[1] == maze.height-1 && neighbor_directions_in_order[i][1] == 1))
						continue;
				var neighbor = [maze.end[0] + neighbor_directions_in_order[i][0], maze.end[1] + neighbor_directions_in_order[i][1]];
				var new_dist = distanceBetweenMazePoints(maze, maze.start, neighbor);
				if (new_dist > dist) {
					maze.end = neighbor;
					dist = new_dist;
					advanced = true;
					break;
				}
			}
			if (advanced) continue;
			for (var i = 0; i < 4; i++) {
				if ((maze.start[0] == 0 && neighbor_directions_in_order[i][0] == -1)
					|| (maze.start[1] == 0 && neighbor_directions_in_order[i][1] == -1)
					|| (maze.start[0] == maze.width -1 && neighbor_directions_in_order[i][0] == 1)
					|| (maze.start[1] == maze.height-1 && neighbor_directions_in_order[i][1] == 1))
						continue;
				var neighbor = [maze.start[0] + neighbor_directions_in_order[i][0], maze.start[1] + neighbor_directions_in_order[i][1]];
				var new_dist = distanceBetweenMazePoints(maze, neighbor, maze.end);
				if (new_dist > dist) {
					maze.start = neighbor;
					dist = new_dist;
					advanced = true;
					break;
				}
			}
			if (!advanced) break;
		}
	}
	
    ret.maze = maze;
    return ret;
}

var algorithms = {
    "recursivebacktracking":genRecursiveBacktracker
};

//algorithm is guaranteed to be one of the registered algorithms
function genMaze(algorithm, seed) {
    var mazeReturn = {"algorithm":algorithm},
    seededRandom = seedRandom(seed),
    transform = function(x){return 1-(1/(1+x))},
    sdTransform = function(sd){ return transform( ( (seededRandom()+0.5) * sd) %5000000/5000000); },
    width = Math.floor(sdTransform(seed)*60+10),
    height = Math.floor(sdTransform(seed)*60+10),
    ret = algorithms[algorithm](width, height, seed);
    mazeReturn.seed = seed;
    mazeReturn.maze = ret.maze;
    return mazeReturn;
}

restapi.use(bodyParser.json());
restapi.use(cors());
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
            "userid":req.params.user,"mazeno":req.params.mazeno});
        
        res.status(200).json({"mazeno":req.params.mazeno,"userid":req.params.user,"bestTime":row[0].bestTime,"unit":"ms",
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
        
        res.status(200).json({"userid":req.params.user,"email":user.email});
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
            if(result.insertId) return res.status(200).json({"response":"user registered","userid":result.insertId});
        });
    });
});


restapi.get('/played/:user', function(req, res){
    db.query("SELECT mazeno, userID, bestTime, stepsForBestTime FROM play WHERE userID = ?",
        [req.params.user], function(err, rows) {
        if(err) return res.status(500).json({"response":"Error occurred"});

        var response = {"userid":req.params.user,played:[]};
        if(rows) rows.forEach(function(item){
            response.played.push({"mazeno":item.mazeno,"userid":item.userID,"bestTime":item.bestTime,
                "stepsForBestTime":item.stepsForBestTime});
        });
        res.status(200).json(response);
    });
});

//get the records for a user in a category
restapi.get('/played/:user/:category', function(req, res){
    db.query("SELECT play.mazeno, userID, bestTime, stepsForBestTime FROM play, maze WHERE "
        +"play.userID = ? AND maze.mazeno = play.mazeno AND maze.category = ? AND maze.userForMaze IS NULL",
        [req.params.user, req.params.category], function(err, rows) {
        if(err) return res.status(500).json({"response":"Error occurred"});

        var response = {"userid":req.params.user,"category":req.params.category,"played":[]};
        if(rows) rows.forEach(function(item) {
            response.played.push({"mazeno":item.mazeno,"userid":item.userID,"bestTime":item.bestTime,
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


var minGenWidth = 10, maxGenWidth = 40,
    minGenHeight = 10, maxGenHeight = 40;

restapi.post('/maze/gen', function(req, res){
    var seed = req.body.seed || Math.floor(Math.random() * 50000);
    if(!req.body.algorithm) return res.status(400).json({"response":"no algorithm selected"});
    if(!algorithms[req.body.algorithm]) return res.status(404).json({"response":"algorithm not found","query":req.params.alg});
    res.status(200).json(genMaze(req.body.algorithm, seed));
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
              +"(?, ?, ?, ?, ?, ?)",
            [req.body.name, tokens[req.headers.authorization].userid, req.body.maze.height,
                req.body.maze.width, JSON.stringify(req.body.maze), req.body.category],
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

            db.query("UPDATE maze SET displayName = ?, height = ?, width = ?, mazeJSON = ?, category = ? WHERE mazeno = ?",
                [req.body.name, req.body.maze.height, req.body.maze.width, JSON.stringify(req.body.maze), req.body.category,
                    req.params.mazeno],
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


restapi.get('/maze/gen/algorithms', function(req, res){
    var keys = [];
    for(key in algorithms) keys.push(key);
    keys.sort();
    res.status(200).json(keys);
});

restapi.get("/mazes", function(req, res){
    db.query("SELECT count(*) as numMazes from maze", function(err, row) {
        if(err) return res.status(500).json({"response":"Error occurred"});
        if(!row || !row[0]) return res.status(500).json({"response":"Error occurred"});

        res.status(200).json({"mazes":row[0].numMazes});
    });
});

restapi.get("/mazes/category/:category", function(req,res){
    db.query("SELECT id, name FROM mazeCategory WHERE id = ?", [req.params.category], function(err, row) {
        if(err) return res.status(500).json({"response":"Error occurred in retrieving category information","error":err});
        if(!row || !row[0]) return res.status(404).json({"response":"category not found", "query":req.params.category});

        var rowBack = row[0];
        db.query("SELECT mazeno, displayName, height, width, mazeJSON, category FROM maze WHERE category = ? "
            +"AND userForMaze IS NULL",//don't want no stinkin' user mazes in my categories!
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

restapi.get("/mazes/user/:user", function(req, res){
    db.query("SELECT id FROM user WHERE id = ?", [req.params.user], function(err, row) {
        if(err) console.log(err);
        if(err) return res.status(500).json({"response":"Error occurred"});
        if(!row || !row[0]) return res.status(404).json({"response":"user not found", "query":req.params.user});
        db.query("SELECT mazeno, displayName, userForMaze, height, width, mazeJSON, category FROM maze WHERE userForMaze = ?",
            [req.params.user], function(err, rows)
        {
            if(err) return res.status(500).json({"response":"Error occurred"});
            var response = {"userid":req.params.user, mazes:[]};
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

restapi.all("*", function(req, res) {
    res.status(404).json({"response":"not found"});
});


restapi.listen(port, function() {
    console.log('Our app is running on http://localhost:' + port);
});
