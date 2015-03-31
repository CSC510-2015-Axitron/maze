//some convenience code
Array.prototype.peek = function() {
    return this[this.length-1];
};

//actual exported code
module.exports = {

    //convenience constants
    N_CONST : 1,
    E_CONST : 2,
    S_CONST : 4,
    W_CONST : 8,

    //to get a seedable random function
    seedRandom : function(s) {
        return function() {
            s = Math.sin(s) * 10000; return s - Math.floor(s);
        };
    },

    //Performs an A* Search to get the distance of the shortest path
    //between the specified two points in a maze.
    //Returns infinity if there is no path.
    distanceBetweenMazePoints : function(maze, start, end)
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

                    //Pushes it back in the queue if it was ahead
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

                    //Pushes it forward in the queue if it was behind
                    while (pq_index != priority_queue.length-1 && nodes_fscore[priority_queue[pq_index][0] * maze.height + priority_queue[pq_index][1]]
                            < nodes_fscore[priority_queue[pq_index+1][0] * maze.height + priority_queue[pq_index+1][1]]) {
                        var one_that_was_ahead = priority_queue[pq_index+1];
                        var one_that_was_behind = priority_queue[pq_index];
                        priority_queue[pq_index] = one_that_was_ahead;
                        priority_queue[pq_index+1] = one_that_was_behind;
                        nodes_open_pqindex[one_that_was_ahead[0] * maze.height + one_that_was_ahead[1]]--;
                        nodes_open_pqindex[one_that_was_behind[0] * maze.height + one_that_was_behind[1]]++;
                        pq_index++;
                    }

                }
            }
        }
        return Infinity;
    },

    //methods to generate a maze algorithmically
    //all take width, height, seed
    //all return {seed:(seed), maze:(complete maze)}
    genRecursiveBacktracker : function(width, height, seed)
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
            //Randomize order in which we try
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
            if (Math.floor(myRandom() % 2) == 0) { //Decide if we try start or end first
                for (var i = 0; i < 4; i++) {
                    if ((maze.start[0] == 0 && neighbor_directions_in_order[i][0] == -1)
                        || (maze.start[1] == 0 && neighbor_directions_in_order[i][1] == -1)
                        || (maze.start[0] == maze.width -1 && neighbor_directions_in_order[i][0] == 1)
                        || (maze.start[1] == maze.height-1 && neighbor_directions_in_order[i][1] == 1))
                            continue;
                    var neighbor = [maze.start[0] + neighbor_directions_in_order[i][0], maze.start[1] + neighbor_directions_in_order[i][1]];
                    var new_dist = distanceBetweenMazePoints(maze, neighbor, maze.end);
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
    },

    //Similar to the above, but uses two instances of simplex noise to weight the direction choices.
    //This results in paths having a tendency to go straight following the coherent direction field
    //produced by the two instances of noise.
    genRecursiveBacktrackerSimplex : function(width, height, seed)
    {
        var ret = {"seed":(seed || Math.floor(Math.random() * 5000000))},
        myRandom = seedRandom(seed),
        simplex = new SimplexNoise(seed),
        featureSize = 10,
        plane1 = 0, plane2 = 6,
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
            var validSpotCount = 0, validSpotScore = -2, validSpot, dir, antidir, currSpot = stack.peek();
            var x = currSpot[0];
            var y = currSpot[1];
            if(currSpot[0]-1 >= 0 && maze.board[currSpot[0]-1][currSpot[1]] == 0) //w
            {
                var score = simplex.noise3D(x / featureSize, y / featureSize, plane1);
                if (score > validSpotScore) {
                    validSpotScore = score;
                    validSpot = [currSpot[0]-1, currSpot[1]];
                    dir = W_CONST;
                    antidir = E_CONST;
                    validSpotCount++;
                }
            }
            if(currSpot[1]-1 >= 0 && maze.board[currSpot[0]][currSpot[1]-1] == 0) //n
            {
                var score = simplex.noise3D(x / featureSize, y / featureSize, plane2);
                if (score > validSpotScore) {
                    validSpotScore = score;
                    validSpot = [currSpot[0], currSpot[1]-1];
                    dir = N_CONST;
                    antidir = S_CONST;
                    validSpotCount++;
                }
            }
            if(currSpot[0]+1 < width && maze.board[currSpot[0]+1][currSpot[1]] == 0) //e
            {
                var score = -simplex.noise3D(x / featureSize, y / featureSize, plane1);
                if (score > validSpotScore) {
                    validSpotScore = score;
                    validSpot = [currSpot[0]+1, currSpot[1]];
                    dir = E_CONST;
                    antidir = W_CONST;
                    validSpotCount++;
                }
            }
            if(currSpot[1]+1 < height && maze.board[currSpot[0]][currSpot[1]+1] == 0) //s
            {
                var score = -simplex.noise3D(x / featureSize, y / featureSize, plane2);
                if (score > validSpotScore) {
                    validSpotScore = score;
                    validSpot = [currSpot[0], currSpot[1]+1];
                    dir = S_CONST;
                    antidir = N_CONST;
                    validSpotCount++;
                }
            }

            if (validSpotCount == 0) stack.pop();
            else
            {
                stack.push(validSpot);
                maze.board[currSpot[0]][currSpot[1]] |= dir;
                maze.board[validSpot[0]][validSpot[1]] |= antidir;
            }
        }

        //Iteratively move endpoints to make them better
        var dist = distanceBetweenMazePoints(maze, maze.start, maze.end);
        while (true) {
            //Randomize order in which we try
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
            if (Math.floor(myRandom() % 2) == 0) { //Decide if we try start or end first
                for (var i = 0; i < 4; i++) {
                    if ((maze.start[0] == 0 && neighbor_directions_in_order[i][0] == -1)
                        || (maze.start[1] == 0 && neighbor_directions_in_order[i][1] == -1)
                        || (maze.start[0] == maze.width -1 && neighbor_directions_in_order[i][0] == 1)
                        || (maze.start[1] == maze.height-1 && neighbor_directions_in_order[i][1] == 1))
                            continue;
                    var neighbor = [maze.start[0] + neighbor_directions_in_order[i][0], maze.start[1] + neighbor_directions_in_order[i][1]];
                    var new_dist = distanceBetweenMazePoints(maze, neighbor, maze.end);
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
    },


    genRandomizedPrims : function(width, height, seed)
    {
        var ret = {"seed":(seed || Math.floor(Math.random() * 5000000))},
        myRandom = seedRandom(seed),
        walls = [],
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

        if (maze.start[0] > 0) walls.push([maze.start[0]-1, maze.start[1]  , 0])
        if (maze.start[1] > 0) walls.push([maze.start[0]  , maze.start[1]-1, 1])
        if (maze.start[0] < maze.width -1) walls.push([maze.start[0], maze.start[1], 0])
        if (maze.start[1] < maze.height-1) walls.push([maze.start[0], maze.start[1], 1])

        while(walls.length > 0) {
            var wall_index = Math.floor(myRandom() * (walls.length-1));
            var wall = walls[wall_index];
            walls[wall_index] = walls[walls.length - 1];
            walls = walls.splice(0, walls.length - 1);

            if (wall[2] == 0) { //Horz
                if (maze.board[wall[0]][wall[1]] == 0) {
                    maze.board[wall[0]  ][wall[1]] |= E_CONST;
                    maze.board[wall[0]+1][wall[1]] |= W_CONST;
                    if (wall[0] > 0) walls.push([wall[0]-1, wall[1]  , 0]);
                    if (wall[1] > 0) walls.push([wall[0]  , wall[1]-1, 1]);
                    if (wall[0] < maze.width -1) walls.push([wall[0], wall[1], 0]);
                    if (wall[1] < maze.height-1) walls.push([wall[0], wall[1], 1]);
                } else if (maze.board[wall[0]+1][wall[1]] == 0) {
                    maze.board[wall[0]  ][wall[1]] |= E_CONST;
                    maze.board[wall[0]+1][wall[1]] |= W_CONST;
                    wall[0] += 1;
                    if (wall[0] > 0) walls.push([wall[0]-1, wall[1]  , 0]);
                    if (wall[1] > 0) walls.push([wall[0]  , wall[1]-1, 1]);
                    if (wall[0] < maze.width -1) walls.push([wall[0], wall[1], 0]);
                    if (wall[1] < maze.height-1) walls.push([wall[0], wall[1], 1]);
                }
            } else { //Vert
                if (maze.board[wall[0]][wall[1]] == 0) {
                    maze.board[wall[0]][wall[1]  ] |= S_CONST;
                    maze.board[wall[0]][wall[1]+1] |= N_CONST;
                    if (wall[0] > 0) walls.push([wall[0]-1, wall[1]  , 0]);
                    if (wall[1] > 0) walls.push([wall[0]  , wall[1]-1, 1]);
                    if (wall[0] < maze.width -1) walls.push([wall[0], wall[1], 0]);
                    if (wall[1] < maze.height-1) walls.push([wall[0], wall[1], 1]);
                } else if (maze.board[wall[0]][wall[1]+1] == 0) {
                    maze.board[wall[0]][wall[1]  ] |= S_CONST;
                    maze.board[wall[0]][wall[1]+1] |= N_CONST;
                    wall[1] += 1;
                    if (wall[0] > 0) walls.push([wall[0]-1, wall[1]  , 0]);
                    if (wall[1] > 0) walls.push([wall[0]  , wall[1]-1, 1]);
                    if (wall[0] < maze.width -1) walls.push([wall[0], wall[1], 0]);
                    if (wall[1] < maze.height-1) walls.push([wall[0], wall[1], 1]);
                }
            }
        }

        //Iteratively move endpoints to make them better
        var dist = distanceBetweenMazePoints(maze, maze.start, maze.end);
        while (true) {
            //Randomize order in which we try
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
            if (Math.floor(myRandom() % 2) == 0) { //Decide if we try start or end first
                for (var i = 0; i < 4; i++) {
                    if ((maze.start[0] == 0 && neighbor_directions_in_order[i][0] == -1)
                        || (maze.start[1] == 0 && neighbor_directions_in_order[i][1] == -1)
                        || (maze.start[0] == maze.width -1 && neighbor_directions_in_order[i][0] == 1)
                        || (maze.start[1] == maze.height-1 && neighbor_directions_in_order[i][1] == 1))
                            continue;
                    var neighbor = [maze.start[0] + neighbor_directions_in_order[i][0], maze.start[1] + neighbor_directions_in_order[i][1]];
                    var new_dist = distanceBetweenMazePoints(maze, neighbor, maze.end);
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
    },



    //Places a start+endpoint, then keeps removing walls until there's a path.
    //Then removes extra walls so that there are no isolated points,
    //and then iteratively moves the start+endpoints until they're better.
    genRandomWallRemoval : function(width, height, seed)
    {
        var ret = {"seed":(seed || Math.floor(Math.random() * 5000000))},
        myRandom = seedRandom(seed),
        walls = [],
        points = [],
        maze = {"width":width,"height":height, board:[]};
        for( var x = width; x--; )
        {
            maze.board.push([]);
            for( var y = height; y--; )
            {
                maze.board[width-x-1].push(0);
            }
        }
        maze.start = [Math.round(myRandom())*(width-1), Math.round(myRandom())*(height-1)]; //East Berlin
        maze.end = [(width-1)-maze.start[0], (height-1)-maze.start[1]]; //West Berlin

        for (var x = 0; x < width; x++) {
            for (var y = 0; y < height; y++) {
                if (x != width -1) walls.push([x, y, 0]);
                if (y != height-1) walls.push([x, y, 1]);
                points.push([x, y]);
            }
        }

        var dist = Infinity;
        while (dist == Infinity && walls.length > 0) {
            var wall_index = Math.floor(myRandom() * (walls.length-1));
            var wall = walls[wall_index];
            walls[wall_index] = walls[walls.length - 1];
            walls = walls.splice(0, walls.length - 1);

            //Mr. Gorbachev, tear down this wall!
            if (wall[2] == 0) { //Horz
                maze.board[wall[0]  ][wall[1]] |= E_CONST;
                maze.board[wall[0]+1][wall[1]] |= W_CONST;
            } else { //Vert
                maze.board[wall[0]][wall[1]  ] |= S_CONST;
                maze.board[wall[0]][wall[1]+1] |= N_CONST;
            }

            dist = distanceBetweenMazePoints(maze, maze.start, maze.end);
        }

        while (points.length > 0) {
            var point_index = Math.floor(myRandom() * (points.length-1));
            var point = points[point_index];
            points[point_index] = points[points.length - 1];
            points = points.splice(0, points.length - 1);

            //If this point is isolated, draw a path from it to somewhere.
            if (maze.board[point[0]][point[1]] == 0) {
                var validSpotScore = -1, validSpot, dir, antidir, currSpot = point;
                var valid
                if(currSpot[0]-1 >= 0) //w
                {
                    var otherPoint = maze.board[currSpot[0]-1][currSpot[1]];
                    var score = (otherPoint & N_CONST ? 0 : 1) + (otherPoint & E_CONST ? 0 : 1)
                         + (otherPoint & S_CONST ? 0 : 1) + (otherPoint & S_CONST ? 0 : 1);
                    if (score > validSpotScore) {
                        validSpot = [currSpot[0]-1, currSpot[1]];
                        dir = W_CONST;
                        antidir = E_CONST;
                    }
                }
                if(currSpot[1]-1 >= 0) //n
                {
                    var otherPoint = maze.board[currSpot[0]][currSpot[1]-1];
                    var score = (otherPoint & N_CONST ? 0 : 1) + (otherPoint & E_CONST ? 0 : 1)
                         + (otherPoint & S_CONST ? 0 : 1) + (otherPoint & S_CONST ? 0 : 1);
                    if (score > validSpotScore) {
                        validSpot = [currSpot[0], currSpot[1]-1];
                        dir = N_CONST;
                        antidir = S_CONST;
                    }
                }
                if(currSpot[0]+1 < width) //e
                {
                    var otherPoint = maze.board[currSpot[0]+1][currSpot[1]];
                    var score = (otherPoint & N_CONST ? 0 : 1) + (otherPoint & E_CONST ? 0 : 1)
                         + (otherPoint & S_CONST ? 0 : 1) + (otherPoint & S_CONST ? 0 : 1);
                    if (score > validSpotScore) {
                        validSpot = [currSpot[0]+1, currSpot[1]];
                        dir = E_CONST;
                        antidir = W_CONST;
                    }
                }
                if(currSpot[1]+1 < height) //s
                {
                    var otherPoint = maze.board[currSpot[0]][currSpot[1]+1];
                    var score = (otherPoint & N_CONST ? 0 : 1) + (otherPoint & E_CONST ? 0 : 1)
                         + (otherPoint & S_CONST ? 0 : 1) + (otherPoint & S_CONST ? 0 : 1);
                    if (score > validSpotScore) {
                        validSpot = [currSpot[0], currSpot[1]+1];
                        dir = S_CONST;
                        antidir = N_CONST;
                    }
                }
                maze.board[currSpot[0]][currSpot[1]] |= dir;
                maze.board[validSpot[0]][validSpot[1]] |= antidir;
            }
        }

        //Iteratively move endpoints to make them better
        var dist = distanceBetweenMazePoints(maze, maze.start, maze.end);
        while (true) {
            //Randomize order in which we try
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
            if (Math.floor(myRandom() % 2) == 0) { //Decide if we try start or end first
                for (var i = 0; i < 4; i++) {
                    if ((maze.start[0] == 0 && neighbor_directions_in_order[i][0] == -1)
                        || (maze.start[1] == 0 && neighbor_directions_in_order[i][1] == -1)
                        || (maze.start[0] == maze.width -1 && neighbor_directions_in_order[i][0] == 1)
                        || (maze.start[1] == maze.height-1 && neighbor_directions_in_order[i][1] == 1))
                            continue;
                    var neighbor = [maze.start[0] + neighbor_directions_in_order[i][0], maze.start[1] + neighbor_directions_in_order[i][1]];
                    var new_dist = distanceBetweenMazePoints(maze, neighbor, maze.end);
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
        return ret; //Ich bin ein Berliner!
    },



    //Places a start+endpoint, enables all paths, then keeps adding walls,
    //with the exception of those that break the path, or cause
    //isolated points.
    //It then iteratively moves the start+endpoints until they're better.
    genRandomWallAddition : function(width, height, seed)
    {
        var ret = {"seed":(seed || Math.floor(Math.random() * 5000000))},
        myRandom = seedRandom(seed),
        walls = [],
        maze = {"width":width,"height":height, board:[]};
        for( var x = width; x--; )
        {
            maze.board.push([]);
            for( var y = height; y--; )
            {
                maze.board[width-x-1].push(0);
            }
        }
        maze.start = [Math.round(myRandom())*(width-1), Math.round(myRandom())*(height-1)]; //East Berlin
        maze.end = [(width-1)-maze.start[0], (height-1)-maze.start[1]]; //West Berlin

        for (var x = 0; x < width; x++) {
            for (var y = 0; y < height; y++) {
                if (x != width -1) walls.push([x, y, 0]);
                if (y != height-1) walls.push([x, y, 1]);
                maze.board[x][y] = 0;
                if (x != 0) maze.board[x][y] |= W_CONST;
                if (y != 0) maze.board[x][y] |= N_CONST;
                if (x != width -1) maze.board[x][y] |= E_CONST;
                if (y != height-1) maze.board[x][y] |= S_CONST;
            }
        }

        var thresh = 0;
        while (walls.length > thresh) {
            var wall_index = Math.floor(myRandom() * (walls.length-1));
            var wall = walls[wall_index];
            walls[wall_index] = walls[walls.length - 1];
            walls = walls.splice(0, walls.length - 1);

            if (wall[2] == 0) { //Horz
                if ((maze.board[wall[0]  ][wall[1]] ^ E_CONST) == 0) continue;
                if ((maze.board[wall[0]+1][wall[1]] ^ W_CONST) == 0) continue;
                maze.board[wall[0]  ][wall[1]] ^= E_CONST;
                maze.board[wall[0]+1][wall[1]] ^= W_CONST;
            } else { //Vert
                if ((maze.board[wall[0]][wall[1]  ] ^ S_CONST) == 0) continue;
                if ((maze.board[wall[0]][wall[1]+1] ^ N_CONST) == 0) continue;
                maze.board[wall[0]][wall[1]  ] ^= S_CONST;
                maze.board[wall[0]][wall[1]+1] ^= N_CONST;
            }

            var dist = distanceBetweenMazePoints(maze, maze.start, maze.end);
            if (dist == Infinity) { //We dun goofed, we gotta go back
                if (wall[2] == 0) { //Horz
                    maze.board[wall[0]  ][wall[1]] ^= E_CONST;
                    maze.board[wall[0]+1][wall[1]] ^= W_CONST;
                } else { //Vert
                    maze.board[wall[0]][wall[1]  ] ^= S_CONST;
                    maze.board[wall[0]][wall[1]+1] ^= N_CONST;
                }
                if (thresh == 0) thresh = walls.length * 5 / 6;
            }
        }

        //Iteratively move endpoints to make them better
        var dist = distanceBetweenMazePoints(maze, maze.start, maze.end);
        while (true) {
            //Randomize order in which we try
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
            if (Math.floor(myRandom() % 2) == 0) { //Decide if we try start or end first
                for (var i = 0; i < 4; i++) {
                    if ((maze.start[0] == 0 && neighbor_directions_in_order[i][0] == -1)
                        || (maze.start[1] == 0 && neighbor_directions_in_order[i][1] == -1)
                        || (maze.start[0] == maze.width -1 && neighbor_directions_in_order[i][0] == 1)
                        || (maze.start[1] == maze.height-1 && neighbor_directions_in_order[i][1] == 1))
                            continue;
                    var neighbor = [maze.start[0] + neighbor_directions_in_order[i][0], maze.start[1] + neighbor_directions_in_order[i][1]];
                    var new_dist = distanceBetweenMazePoints(maze, neighbor, maze.end);
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
                    if (new_dist > dist && new_dist != Infinity) {
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
}