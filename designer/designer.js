$(function() {
	var maze = {
	  "width":10,
	  "height":10,
	  "start":[0,0],
	  "end":[0,0],
	  "board":[[0]]
	},
	mtbl = $('#maze_table'),
	codeArea = $('#code_textarea'),
	mazeContainer = $('#mazecontainer'),
	cellWidth = 20,//probably should find a better way to do this
	cellHeight = 20,//make sure this and the css match exactly
	verticalPathCells = $(),
	horizontalPathCells = $(),
	centerPathCells = $(),
	hCellIndex,
	startDiv,
	endDiv,
	lastSelectedObject,
	lastSelectedTime,
	toolOnStart = true,
	N_CONST = 1 << 0,
	E_CONST = 1 << 1,
	S_CONST = 1 << 2,
	W_CONST = 1 << 3,

	mouseDown = false,
	//whether the first cell mousedown'd into was inactive (activating = true) or active (activating = false)
	activating = undefined,

	//make a table row with a number of cells
	tRow = function(numCells) {
		return Array.apply(null,Array(numCells+1)).join("<div></div>");
	},

	//make a table with a number of rows and columns
	tTable = function(numRows, numColumns) {
		return Array.apply(null,Array(numRows+1)).join(tRow(numColumns)+"\n");
	},

	//called when either a horizontal or vertical wall is gone over
	wallOver = function() {
		if(mouseDown)
		{
			toggleWallCell(this);
		}
	},

	//called when either a horizontal or vertical wall is clicked
	wallClick = function() {
		toggleWallCell(this);
		updateMazeCode();
	},

	toggleWallCell = function(cell) {
		var hIndex = horizontalPathCells.index($(cell)),
		vIndex = verticalPathCells.index($(cell));
		if(hIndex != -1 || vIndex != -1)
		{
			if(activating == undefined)
			{
				$( cell ).toggleClass('selected');
				activating = $( cell ).hasClass('selected');
			}
			if(activating) $( cell ).addClass('selected');
			else $( cell ).removeClass('selected');

			if(hIndex != -1)
			{
				x = hIndex%hCellIndex;
				y = Math.floor(hIndex/hCellIndex);
			}
			else
			{
				x = vIndex%(hCellIndex+1);
				y = Math.floor(vIndex/(hCellIndex+1));
			}
			toggleWall(x,y, hIndex == -1, activating);
		}
	},

	//called when one of the center cells is clicked
	cellClick = function() {
		var now = new Date();
		if($( this ).is(lastSelectedObject) && (now - lastSelectedTime) < 300)//0.3 s
		{
			if(toolOnStart && startDiv) startDiv.removeClass('start').text('');
			if(!toolOnStart && endDiv) endDiv.removeClass('end').text('');
			var x = centerPathCells.index($(this))%maze.width,
			y = Math.floor(centerPathCells.index($(this))/maze.width);

			if(toolOnStart)
			{
				$( this ).text('s').addClass('start');
				startDiv = $( this );
				maze.start = [x, y];
			}
			else
			{
				$( this ).text('e').addClass('end');
				endDiv = $( this );
				maze.end = [x, y];
			}
		}
		lastSelectedObject = $( this );
		lastSelectedTime = now;
		updateMazeCode();
	},

	//toggle a wall with coords x and y and if it's a vertical path (going north/south) or not
	toggleWall = function(x,y,isVert,isOn) {
		if(isVert)
		{
			if(isOn)
			{
				maze.board[x][y]	|= S_CONST; //"north" cell
				maze.board[x][y+1]	|= N_CONST; //"south" cell
			}
			else
			{
				maze.board[x][y]	&= ~S_CONST; //"north" cell
				maze.board[x][y+1]	&= ~N_CONST; //"south" cell
			}
		}
		else
		{
			if(isOn)
			{
				maze.board[x][y]	|= E_CONST; //"west" cell
				maze.board[x+1][y]	|= W_CONST; //"east" cell
			}
			else
			{
				maze.board[x][y]	&= ~E_CONST; //"west" cell
				maze.board[x+1][y]	&= ~W_CONST; //"east" cell
			}
		}
	},

	checkTextAreaInput = function() {
		try
		{
			var obj = JSON.parse(codeArea.val()), correctLength = true;
			if(!(obj && obj.start && obj.end && obj.board && obj.width && obj.height)) throw 'structure';
			if(!(obj.start.length == 2 && obj.end.length == 2 && obj.board.length == obj.width && obj.board[0].length == obj.height)) throw 'lengths';
			if(!(obj.start[0] >= 0 && obj.start[0] < obj.width && obj.start[1] >= 0 && obj.start[1] >= 0 && obj.start[1] < obj.height)) throw 'start';
			if(!(obj.end[0] >= 0 && obj.end[0] < obj.width && obj.end[1] >= 0 && obj.end[1] >= 0 && obj.end[1] < obj.height)) throw 'end';

			for(var x = 0; x < obj.width; x++)
			{
				if(obj.board[x].length != obj.height)
					correctLength = false;
			}
			if(!correctLength) throw 'not square';

			return obj;
		}
		catch(e)
		{
			console.log(e);
			return null;
		}
	},

	updateBoard = function(mazeObject) {
		maze.width = mazeObject.width;
		maze.height = mazeObject.height;
		maze.start = mazeObject.start;
		maze.end = mazeObject.end;
		maze.board = mazeObject.board;

		hCellIndex = maze.width - 1;

		horizontalPathCells.off('mouseover');
		verticalPathCells.off('mouseover');
		centerPathCells.off('click');
		horizontalPathCells.off('mousedown');
		verticalPathCells.off('mousedown');

		mtbl.css({width:cellWidth*(maze.width*2-1), height:cellHeight*(maze.height*2-1)});
		mtbl.html(tTable(maze.height*2-1, maze.width*2-1));

		horizontalPathCells = $();
		verticalPathCells = $();
		centerPathCells = $();


		for(var x = 1; x < maze.width+1; x++)
		{
			if(x < maze.width)
			{
				horizontalPathCells = mtbl.find(':nth-child('+(2*(maze.width*2-1))+'n-'+(2*(maze.width*2-1)-(2*x))+')')
					.add(horizontalPathCells).addClass('mazeui').addClass('mazeWall');
			}
			verticalPathCells = mtbl.find(':nth-child('+(2*(maze.width*2-1))+'n-'+((maze.width*2-1)-(2*x-1))+')')
				.add(verticalPathCells).addClass('mazeui').addClass('mazeWall');
			centerPathCells = mtbl.find(':nth-child('+(2*(maze.width*2-1))+'n-'+(2*(maze.width*2-1)-(2*x-1))+')')
				.add(centerPathCells).addClass('mazeui').addClass('mazeCell');
		}

		centerPathCells.on('click', cellClick);
		horizontalPathCells.on('mouseover', wallOver);
		verticalPathCells.on('mouseover', wallOver);
		horizontalPathCells.on('mousedown', wallClick);
		verticalPathCells.on('mousedown', wallClick);

		startDiv = $(centerPathCells[maze.start[0]+maze.start[1]*maze.width]);
		startDiv.addClass('start');
		endDiv = $(centerPathCells[maze.end[0]+maze.end[1]*maze.width]);
		endDiv.addClass('end');

		for(var x = 0; x < maze.width; x++)
		{
			for(var y = 0; y < maze.height; y++)
			{
				if((maze.board[x][y] & S_CONST) == S_CONST)
					$(verticalPathCells[(x+y*(hCellIndex+1))]).addClass('selected');
				if((maze.board[x][y] & N_CONST) == N_CONST)
					$(verticalPathCells[(x+(y-1)*(hCellIndex+1))]).addClass('selected');

				if((maze.board[x][y] & E_CONST) == E_CONST)
					$(horizontalPathCells[(x+y*hCellIndex)]).addClass('selected');
				if((maze.board[x][y] & W_CONST) == W_CONST)
					$(horizontalPathCells[((x-1)+y*hCellIndex)]).addClass('selected');
			}
		}
	},

	//Gets the size from the input elements, then initializes the designer using them.
	setSize = function() {
		var tempMaze = {};
		tempMaze.width = Math.max(parseInt($('#width').val()) || 10, 5);//either a valid integer > 5 or 10
		tempMaze.height = Math.max(parseInt($('#height').val()) || 10, 5);//either a valid integer > 5 or 10

		tempMaze.start = [0,0];
		tempMaze.end = [0,0];

		tempMaze.board = [];

		for( var x = tempMaze.width; x--; )
		{
			tempMaze.board.push([]);
			for( var y = tempMaze.height; y--; )
			{
				tempMaze.board[tempMaze.width-x-1].push(0);
			}
		}

		updateBoard(tempMaze);

		updateMazeCode();
	},

	//(Re)generates the JSON code for the maze.
	updateMazeCode = function() {
		codeArea.val(JSON.stringify(maze, null, 2));
	},

	loadDialogList = $('#mazeList'),
	loadDialog = $( "#dialog-maze-load" ).dialog({
		autoOpen: false,
		height: 300,
		width: 350,
		resizable: false,
		draggable: false,
		modal: true,
		buttons: {
			Cancel: function() {
				loadDialog.dialog( "close" );
			}
		},
		close: function() {
			loadDialogList.html("");
		}
	});

	$.cookie.json = true;

	loadDialogList.on('click', function(e) {
		console.log($(this).data);
	});

	$('#loadB').on('click', function(e) {
		remoteDB.HTTPGetAsync('/mazes/user/'+remoteDB.userID, function(data){
			if(!(data && data.userid && data.mazes)) return console.log(data);
			var htmlList = [];
			data.mazes.forEach(function(item,idx){
				htmlList[idx] = '<li><a href="#" data='+item.mazeno+'>'+item.displayName+'</a></li>';
			});
			loadDialogList.html(htmlList.join('\n'));
			loadDialog.dialog( "open" );
		});
	});




	$('#updateSize').click(setSize);

	$('#t_start').click(function(){toolOnStart = true;});
	$('#t_end').click(function(){toolOnStart = false});
	codeArea.on('keydown', function(e){
		if(e.keyCode == 13)
		{
			var tempBoard = checkTextAreaInput();
			if(tempBoard != null) updateBoard(tempBoard);
			return false;
		}
	});




	$(document).on('dragstart', function(e) {
		e.preventDefault();
	});
	$(document).on('mousedown', function() {
		mouseDown = true;
	});
	$(document).on('mouseup', function() {
		mouseDown = false;
		activating = undefined;

		updateMazeCode();
	});

	if (remoteDB.verifyCookie($.cookie('userAcc'))) {
		$('#loadsavebuttons').show();
		$('#user_id').text("USER: "+remoteDB.user);
	}
	else
	{
		$('#loadsavebuttons').hide();
	}


	toolOnStart = $('#t_start').is(':checked');

	setSize();
});