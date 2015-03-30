# MazeDB
Repo for Maze game DB

##Prerequisites
* A working installation of MySQL with read/write access for some user
* A working installation of node.js and npm

##Usage
* Create or update the environment variable JAWSDB_URL with a url in the format `mysql://user:password@host:port`
* Install all dependencies with `npm install`
* Run the application with `node server.js`
* Access the server via listed API calls

##API
The database can be accessed through a series of standard HTTP queries in the following format.
For all queries, if the query is successful, an HTTP status of 200 is set and a response sent in the format given below.
For unsuccessful queries, an appropriate HTTP status code is set and the error response below the successful response is sent.

###Unauthenticated GET requests

####/categories
Returns a list of categories of mazes available to the player, each category having an id and a name.

```javascript
//success
[
    { "id": (category id), "name": (name) },
    ...
]

//if the db has an error, status 500
{ "response":"Error occured in retrieving category information" }
```

####/maze/gen/algorithms
Returns a list of algorithms available for use when requesting a randomly generated maze.

```javascript
//success
[
    { "gen": (gen id), "displayName": (readable name) ,
    ...
]
```

####/mazes
Returns the number of mazes stored in the database, both categorized and user-created mazes.

```javascript
//success
{ "mazes": (number >=0) }

//if the db has an error, status 500
{ "response":"Error occurred" }
```

####/mazes/category/:category
Returns a list of the maze ids and display names for all mazes in the category identified by :category

```javascript
//success
{ "category": (:category repeated), "categoryName": (name),
    "mazes": [
        { "mazeno": (mazeno), "displayName": (name) },
        ...
    ]
}

//if the db has an error retrieving the category, status 500
{ "response":"Error occurred in retrieving category information" }

//if the db has an error retrieving mazes for found category, status 500
{ "response":"Error occurred in finding mazes for category" }

//if :category does not identify any stored category, status 404
{ "response":"category not found", "query":(:category repeated) }
```

####/mazes/user/:user
Returns a list of the maze ids and display names for all mazes created by the user identified by :user

```javascript
//success
{ "userid": (:user repeated), "mazes": [
        { "mazeno": (mazeno), "displayName": (name) },
        ...
    ]
}

//if the db has an error retrieving the user, status 500
{ "response":"Error occurred" }

//if the db has an error retrieving the mazes createed by that user, status 500
{ "response":"Error occurred" }

//if :user does not identify any stored user, status 404
{ "response":"user not found", "query":(:user repeated) }
```

####/maze/:mazeno
Returns the maze object identified by :mazeno

```javascript
//success
{
    "mazeno": (mazeno),
    "displayName": (name),
    "userForMaze": (userid if owned by user),
    "height": (height),
    "width": (width),
    "mazeJSON": (string representation of the maze),
    "category": (if in a category, category id)
}

//if :mazeno does not identify any stored maze, status 404
{ "response": "maze not found", "query": (:mazeno repeated) }

//if db encounters an error, status 500
{ "response":"Error occurred" }
```

####/top10/:mazeno
Returns the top 10 best steps and times for the maze identified by :mazeno

```javascript
//success
{ "maze": "19", "bestTimes": [
        { "mazeno": 19, "userID": 1, "bestTime": 1, "stepsForBestTime": 1 },
        ...
    ]
}

//if the db has an error retrieving the top 10, status 500
{ "response":"Error occurred" }
```

####/play/:mazeno/:user
Returns the user identified by :user's best time on the maze identified by :mazeno

```javascript
//success
{ "mazeno":(:mazeno repeated), "userid":(:user repeated),
    "bestTime":(best time in ms), "stepsForBestTime":(steps) }
  
//if user has not completed level, or does not exist, or maze does not exist, status 404
{ "response":"user has not completed level",
    "userid":(:user repeated),"mazeno":(:mazeno repeated)
}

//if db encounters an error, status 500
{
    "response":"Error occurred"
}
```

####/played/:user
Returns a list of all of a user identified by :user 's best times on all mazes they have completed

```javascript
//success
{ "userid": "1", "played": [
        { "mazeno": 19, "userid": 1, "bestTime": 1, "stepsForBestTime": 1 },
        ...
    ]
}

//if the db has an error in retrieving the information, status 500
{ "response":"Error occurred" }
```

####/played/:user/:category
Returns a list of the user identified by :user 's best times in a category identified by :category

```javascript
//success
{
    "userid": "1",
    "category": "1",
    "played": [
        {
            "mazeno": 19,
            "userid": 1,
            "bestTime": 1,
            "stepsForBestTime": 1
        },
        ...
    ]
}
//if the db has an error in retrieving the information, status 500
{
    "response":"Error occurred"
}
```

###Unauthenticated POST requests
For all requests, attributes in parenthesis are optional.

####/register
Submit a registration request.

```javascript
//data
{
    "email":(user email),
    "password":(user password)
}
//success
{
    "response":"user registered",
    "userid":(user's id)
}
//if missing email or password or both, status 400
{
    "response":"invalid syntax, missing parameters"
}
//if a user is already signed up with the given email, status 400
{
    "response":"duplicate email address"
}
//if the db encounters an error during the request, status 500
{
    "response":"Error occurred"
}
```

####/login
Submits a login request. The login token returned upon success should be put into the authorization header of any subsequent requests that require authentication.

```javascript
//data
{
    "email":(user email),
    "password":(user password)
}
//success
{
    "userid":(user's id),
    "token":(session login token)
}
//if there is already a valid authentication token in the authorization header, status 403
{
    "response":"already authorized"
}
//if email or password are missing, status 401
{
    "response":"No login credentials"
}
//if user with email given does not exist in the db, status 404
{
    "response":"user does not exist"
}
//if error occurs in looking into the db or checking the hashed pass, status 500
{
    "response":"error occured"
}
//if given email and password do not match credentials in the db, status 401
{
    "response":"invalid login credentials"
}
```

####/maze/gen
Generates a maze with algorithm and optional seed

```javascript
//data
{
    algorithm:(picked from /maze/gen/algorithms)
    (,seed:(number))
}
//success
{
    maze:(normal maze data),
    algorithm:(same as requested),
    seed:(the used seed, either player specified or randomly generated if not specified)
}
//if algorithm missing, status 400
{
    "response":"no algorithm selected"
}
//if algorithm is not recognized as a valid choice, status 404
{
    "response":"algorithm not found",
    "query":(the algorithm repeated)
}
```

###Authenticated GET requests
All authenticated requests must have a valid token in the authorization header. For example, to do this in jQuery:

```javascript
$.ajax({
    ...,
    headers: {
        "authorization":(token string),
        "content-type":"application/json"
    },
    ...
});
```

All authenticated requests share a common failure response if the authorization token is missing or invalid (expired), with status 401
```javascript
{
    "response":"unauthorized token"
}
```

####/keepalive
Refreshes the expiration time for a token.

```javascript
//success
{
    "response":true
}
```

####/user/:user
Returns the user id and email of user identified by :user

```javascript
//success
{
    "userid":(user's id),
    "email":(user's email)
}
//if user requested is not the same user as token is authorized for, status 403
{
    "response":"not authorized"
}
//if db encounters an error, status 500
{
    "response":"Error occurred"
}
```

###Authenticated POST requests

####/user/:user
Submits a request to edit a user identified by :user

```javascript
//data, both email and password are optional, but at least one must be present
{
    email:(new email),
    password:(new password)
}
//success
{
    "response":"user updated"
}
//if user identified by :user and user identified by token do not match, status 403
{
    "response":"not authorized"
}
//if both email and password are missing, status 401
{
    "response":"invalid syntax, missing parameters"
}
//if new email is a duplicate of another user's email, status 400
{
    "response":"duplicate email address"
}
//if db encounters an error, status 500
{
    "response":"Error occurred"
}
```

####/play/:mazeno/:user
Submits a completion time and step count for maze identified by :mazeno and user identified by :user

```javascript
//data
{
    time:(time in ms),
    steps:(steps)
}
//success, if never beaten before
{
    "response":"new best time entered"
}
//success, if time was better than existing
{
    "response":"best time updated"
}
//success, if time was not better than existing
{
    "response":"time not better",
    "bestTime":(time in ms),
    "stepsForBestTime":(steps)
}
//if user identified by :user and user identified by token not the same, status 403
{
    "response":"not authorized"
}
//if time or steps missing, status 401
{
    "response":"invalid syntax, missing parameters"
}
//if maze identified by :mazeno does not exist, status 404
{
    "response":"maze does not exist",
    "mazeno":(:maze repeated)
}
//if db error occurs, status 500
{
    "response":"Error occurred"
}
```

####/maze
Submits a new maze to be recorded in player's library of created mazes

```javascript
//data
{ name: (name) (, category: (category) ),
    maze:
    {
        height:(height), width:(width), start:[0,0], end:[0,0],
        board:[ [ 0,0,... ], [ ], ... [ ] ]
    }
}
//success
{
    "mazeno":(id of the new maze)
}
//if the maze is missing or incorrectly formatted, status 400
{
    "response":"invalid syntax",
    "reason":(one of the following:)
    //"missing maze or name" if the maze attribute is missing entirely, or the name attribute is missing
    //"missing width, height, start, end, or board" if any of the named attributes are missing from maze
    //"board not rectangular" if board size is not the same as maze.width and maze.height, or one of the internal arrays for maze.board is not the same length as the rest
    //"start not inside board" if the location indicated by maze.start is not within the bounds of maze.board
    //"end not inside board" if the location indicated by maze.end is not within the bounds of maze.board
}
//if the db encounters an error, status 500
{
    "response":"Error occurred"
}
```

####/maze/:mazeno
Submits a new maze to replace the one identified by :mazeno

```javascript
//data
{ name: (name) (, category: (category) ),
    maze:
    {
        height:(height), width:(width), start:[0,0], end:[0,0],
        board:[ [ 0,0,... ], [ ], ... [ ] ]
    }
}
//success
{
    "response":"maze updated"
}
//if the maze is missing or incorrectly formatted, status 400, same as POST /maze
//if maze identified by :mazeno does not exist, status 404
{
    "response":"maze not found",
    "mazeno":(:mazeno repeated)
}
//if user identified by token and user that owns maze identified by :mazeno do not match, status 403
{
    "response":"not authorized"
}
//if db encounters an error, status 500
{
    "response":"Error occurred"
}
```

