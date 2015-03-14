var w, h;
var tool = 1;
var maze;

var start_cell, finish_cell;

var canvas, canvas_cell_width, canvas_cell_height, eventActivated = false;
var lastX = -1, lastY = -1, lastBackground = -1;
var mouseDownHook = false, canvas_map = [], mouseUpTime, mouseUpCell, mouseDblClickHook = false;

//Gets the size from the input elements, then initializes the designer using them.
function set_size() {
	w = document.getElementById('width').value;
	h = document.getElementById('height').value;
	mtbl = document.getElementById('maze_table');
	
	maze = [[]];
	mtbl.innerHTML = '';
	for (y = 0; y < h; y++) {
		maze[y] = [];
		canvas_map[2*y] = [];
		table_row = document.createElement('tr');
		for (x = 0; x < w; x++) {
			//Add main cell
			maze[y][x] = 0;
			table_cell = document.createElement('td');
			canvas_map[2*y][2*x] = table_cell;
			table_cell.width = 25;
			table_cell.height = 25;
			table_cell.tag_x = x;
			table_cell.tag_y = y;
			//table_cell.onclick = main_cell_click;
			//table_cell.ondblclick = main_cell_click;
			table_cell.align = 'center';
			table_cell.style.background = '#000000';
			table_cell.style.color = '#FFFFFF';
			table_row.appendChild(table_cell);
			//Add E/W Path Cell if relevant
			if (x != w-1) {
				table_cell2 = document.createElement('td');
				canvas_map[2*y][2*x+1] = table_cell2;
				table_cell2.width = 25;
				table_cell2.height = 25;
				table_cell2.tag_x = x;
				table_cell2.tag_y = y;
				//table_cell2.onclick = h_path_cell_click;
				table_cell2.style.background = '#CCCCCC';
				table_row.appendChild(table_cell2);
			}
		}
		mtbl.appendChild(table_row);
		//add N/S row if relevant
		if (y != h-1) {
			table_row2 = document.createElement('tr');
			canvas_map[2*y+1] = [];
			for (x = 0; x < w; x++) {
				// Add N/S Path Cell
				table_cell = document.createElement('td');
				table_cell = document.createElement('td');
				canvas_map[2*y+1][2*x] = table_cell;
				table_cell.width = 25;
				table_cell.height = 25;
				table_cell.tag_x = x;
				table_cell.tag_y = y;
				//table_cell.onclick = v_path_cell_click;
				table_cell.style.background = '#CCCCCC';
				table_row2.appendChild(table_cell);
				//Add BLank Cell if relevant
				if (x != w-1) {
					table_cell2 = document.createElement('td');
					table_cell2.width = 25;
					table_cell2.height = 25;
					table_row2.appendChild(table_cell2);
				}
			}
			mtbl.appendChild(table_row2);
		}
	}

	canvas = document.getElementById('maze_canvas');
	canvas_cell_width = mtbl.clientWidth/(w*2 - 1);
	canvas_cell_height = mtbl.clientHeight/(h*2 - 1);
	canvas.width = mtbl.clientWidth;
	canvas.height = mtbl.clientHeight;
	align_canvas();

	//Debug
	//console.log(canvas_cell_width, canvas_cell_height, canvas.offsetLeft, canvas.offsetTop);
	if (!eventActivated) {
		add_events(); //should be invoked only once!
		eventActivated = true;
	}

	start_cell = finish_cell = null;
	update_maze_code();
}

//Changes the action performed by the mouse when clicking on table cells.
function set_tool(t) {
	tool = t;
}

function h_path_cell(x,y,x1,y1) {
	maze[y][x] ^= 2;
	maze[y][x+1] ^= 8;
	canvas_map[y1][x1].style.background = (lastBackground = (maze[y][x] & 2)) ? '#000000' : '#CCCCCC';
	update_maze_code();
}

function v_path_cell(x,y,x1,y1) {
	maze[y][x] ^= 4;
	maze[y+1][x] ^= 1;
	canvas_map[y1][x1].style.background = (lastBackground = (maze[y][x] & 4)) ? '#000000' : '#CCCCCC';
	update_maze_code();
}

function h_path_cell_click() {
	maze[this.tag_y][this.tag_x] ^= 2;
	maze[this.tag_y][this.tag_x+1] ^= 8;
	this.style.background = maze[this.tag_y][this.tag_x] & 2 ? '#000000' : '#CCCCCC';
	update_maze_code();
}

function v_path_cell_click() {
	maze[this.tag_y][this.tag_x] ^= 4;
	maze[this.tag_y+1][this.tag_x] ^= 1;
	this.style.background = maze[this.tag_y][this.tag_x] & 4 ? '#000000' : '#CCCCCC';
	update_maze_code();
}

function canvas_mouse_XY(e) {
	var canvasX = Math.floor((e.clientX - canvas.offsetLeft)/canvas_cell_width);
	var canvasY = Math.floor((e.clientY - canvas.offsetTop)/canvas_cell_height);

	if (canvasX != lastX || canvasY != lastY)
	{
		lastX = canvasX;
		lastY = canvasY;
		var x = Math.floor(canvasX/2);
		var y = Math.floor(canvasY/2);
		
		//debug, booleans aren't numericals
		//console.log(lastX, lastY);
		if ((lastX % 2) && !(lastY % 2))
		{
			if (lastBackground == -1 || Boolean(lastBackground) != Boolean(maze[y][x] & 2)) h_path_cell(x, y, canvasX, canvasY);
			//console.log("h_path "+ lastBackground);
		}
		else if (!(lastX % 2) && (lastY % 2))
		{
			if (lastBackground == -1 || Boolean(lastBackground) != Boolean(maze[y][x] & 4)) v_path_cell(x, y, canvasX, canvasY);
			//console.log("v_path "+ lastBackground);
		}
		//else if (!(lastX % 2) && !(lastY % 2))
		//{
			//console.log("main_cell");
		//}
	}
}

function canvas_mouse_down(e) {
	mouseDownHook = true;
	canvas_mouse_XY(e);
}

function canvas_mouse_move(e) {
	if (mouseDownHook) {
		canvas_mouse_XY(e);
	}
}

function canvas_mouse_out() {
	mouseDownHook = false;
	lastBackground = lastX = lastY = -1;
	//console.log("out");
}

function canvas_mouse_up(e) {
	mouseDownHook = false;
	
	var currMouseUpCell = canvas_map[lastY = Math.floor((e.clientY - canvas.offsetTop)/canvas_cell_height)][lastX = Math.floor((e.clientX - canvas.offsetLeft)/canvas_cell_width)];

	if (currMouseUpCell != mouseUpCell)
	{
		mouseUpTime = Date.now();
		mouseUpCell = currMouseUpCell;
	}
	else if (Date.now() - mouseUpTime < 1000)
	{
		if (!(lastX % 2) && !(lastY % 2))
		{
			main_cell_click(lastX, lastY)
			//console.log("main_cell dbl click");
		}
	}

	lastBackground = lastX = lastY = -1;
	//console.log("up");
}

function align_canvas() {
	canvas.style.left = mtbl.offsetLeft; //make canvas align with table
}

function add_events() {
	canvas.addEventListener("mousedown", function(e) {canvas_mouse_down(e)});
	canvas.addEventListener("mousemove", function(e) {canvas_mouse_move(e)});
	canvas.addEventListener("mouseup", function(e) {canvas_mouse_up(e)});
	//canvas.addEventListener("mouseout", canvas_mouse_out);  //commented out to keep mouse focused

	window.addEventListener('resize', align_canvas);
}

//Performs the corresponding mouse action on a given table cell.
function main_cell_click(x1,y1) {

	var obj = canvas_map[y1][x1];

	switch (tool) {
		// case 0: //Place Path
			// maze[this.tag_y][this.tag_x] = 1 - maze[this.tag_y][this.tag_x];
			// update_cell_color(this);
			// break;
		case 1: //Place Start
			if (start_cell != null)
				start_cell.innerHTML = '';
			if (start_cell != obj) {
				start_cell = obj;
				obj.innerHTML = 'S';
			} else {
				start_cell = null;
			}
			break;
		case 2: //Place Finish
			if (finish_cell != null)
				finish_cell.innerHTML = '';
			if (finish_cell != obj) {
				finish_cell = obj;
				obj.innerHTML = 'F';
			} else {
				finish_cell = null;
			}
			break;
	}
	update_maze_code();
}

//(Re)generates the JSON code for the maze.
function update_maze_code() {
	start_x = start_cell == null ? 0 : start_cell.tag_x;
	start_y = start_cell == null ? 0 : start_cell.tag_y;
	finish_x = finish_cell == null ? 0 : finish_cell.tag_x;
	finish_y = finish_cell == null ? 0 : finish_cell.tag_y;
	code = '{\r\n';
	code += '  "width":' + w + ',\r\n';
	code += '  "height":' + h + ',\r\n';
	code += '  "start":[' + start_x + ',' + start_y + '],\r\n';
	code += '  "end":[' + finish_x + ',' + finish_y + '],\r\n';
	code += '  "board":[\r\n';
	for (x = 0; x < w; x++) {
		code += '  	[';
		for (y = 0; y < h; y++) {
			if (y != 0)
				code += ',';
			if (maze[y][x] < 10)
				code += ' ';
			code += maze[y][x];
		}
		code += ']';
		if (x != w-1)
			code += ',';
		code += '\r\n';
	}
	code += '  ]\r\n';
	code += '}';
	document.getElementById('code_textarea').value = code;
}



























