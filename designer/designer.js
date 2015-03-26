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
	cellWidth = 20,//probably should find a better way to do this
	cellHeight = 20,//make sure this and the css match exactly
	verticalPathCells = $(),
	horizontalPathCells = $(),
	centerPathCells = $(),
	startDiv,
	endDiv,
	lastSelectedObject,
	lastSelectedTime,
	toolOnStart = true,

	//make a table row with a number of cells
	tRow = function(numCells) {
		return Array.apply(null,Array(numCells+1)).join("<div></div>");
	},

	//make a table with a number of rows and columns
	tTable = function(numRows, numColumns) {
		return Array.apply(null,Array(numRows+1)).join(tRow(numColumns)+"\n");
	},

	wallClick = function(x,y,direction) {

	},
	cellClick = function(x,y,direction) {
		var now = new Date();
		if($( this ).is(lastSelectedObject) && (now - lastSelectedTime) < 300)//0.3 s
		{
			if(toolOnStart && startDiv) startDiv.removeClass('start').text('');
			if(!toolOnStart && endDiv) endDiv.removeClass('end').text('');

			if(toolOnStart)
			{
				$( this ).text('s').addClass('start');
				startDiv = $( this );
			}
			else
			{
				$( this ).text('e').addClass('end');
				endDiv = $( this );
			}
		}
		lastSelectedObject = $( this );
		lastSelectedTime = now;
	},

	//Gets the size from the input elements, then initializes the designer using them.
	setSize = function(){
		maze.width = Math.max(parseInt($('#width').val()) || 10, 5);//either a valid integer > 5 or 10
		maze.height = Math.max(parseInt($('#height').val()) || 10, 5);//either a valid integer > 5 or 10

		maze.start = [0,0];
		maze.end = [0,0];

		maze.board = [];
		var temp = [];

		for( var y = maze.height; y--; )
		{
			temp.push(0);
		}
		for( var x = maze.width; x--; )
		{
			maze.board.push(temp);
		}

		horizontalPathCells.off('click');
		verticalPathCells.off('click');
		centerPathCells.off('click');

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
					.add(horizontalPathCells).addClass('mazeui').addClass('mazeUnSelectedWall');
			}
			verticalPathCells = mtbl.find(':nth-child('+(2*(maze.width*2-1))+'n-'+((maze.width*2-1)-(2*x-1))+')')
				.add(verticalPathCells).addClass('mazeui').addClass('mazeUnSelectedWall');
			centerPathCells = mtbl.find(':nth-child('+(2*(maze.width*2-1))+'n-'+(2*(maze.width*2-1)-(2*x-1))+')')
				.add(centerPathCells).addClass('mazeui').addClass('mazeCell');
		}

		//horizontalPathCells.text("--");
		//verticalPathCells.text("|");
		//centerPathCells.text("c");

		centerPathCells.on('click', cellClick);
		horizontalPathCells.on('click', wallClick);
		verticalPathCells.on('click', wallClick);

		updateMazeCode();
	},

	//(Re)generates the JSON code for the maze.
	updateMazeCode = function() {
		codeArea.text(JSON.stringify(maze, null, 2));
	};

	$('#updateSize').click(setSize);

	$('#t_start').click(function(){toolOnStart = true;});
	$('#t_end').click(function(){toolOnStart = false});
	toolOnStart = $('#t_start').is(':checked');

	setSize();
});