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

		mtbl.css({width:32*maze.width, height:32*maze.height});
		mtbl.html(tTable(maze.height, maze.width));
		mtbl.find(':nth-child(odd)').css({background:'#cac'});
		mtbl.find(':nth-child(even)').css({background:'#acc'});

		updateMazeCode();
	},

	//(Re)generates the JSON code for the maze.
	updateMazeCode = function() {
		codeArea.text(JSON.stringify(maze, null, 2));
	};

	$('#updateSize').click(setSize);

	setSize();
});