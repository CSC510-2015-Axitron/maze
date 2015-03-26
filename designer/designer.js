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

	//make a table row with a number of cells
	tRow = function(numCells) {
		return Array.apply(null,Array(numCells+1)).join("<div></div>");
	},

	//make a table with a number of rows and columns
	tTable = function(numRows, numColumns) {
		return Array.apply(null,Array(numRows+1)).join(tRow(numColumns)+"\n");
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

		mtbl.css({width:cellWidth*(maze.width*2-1), height:cellHeight*(maze.height*2-1)});
		mtbl.html(tTable(maze.height*2-1, maze.width*2-1));
		//problem: css is applicable ALL THE TIME
		//maybe don't use nth child
		for(var x = 1; x < (maze.width*2-1)+1; x++)
		{
			mtbl.find(':nth-child('+((maze.width*2-1)*2)+'n'+x+')').css({background:'#cac'});
		}
		for(var x = 1; x < (maze.width*2-1)+1; x++)
		{
			mtbl.find(':nth-child('+(maze.width*2-1)+'n-'+((maze.width*2-1)-(2*x-1))+')').css({background:'#acc'});
		}

		updateMazeCode();
	},

	//(Re)generates the JSON code for the maze.
	updateMazeCode = function() {
		codeArea.text(JSON.stringify(maze, null, 2));
	};

	$('#updateSize').click(setSize);

	setSize();
});