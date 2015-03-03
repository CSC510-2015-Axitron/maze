var w, h;
var tool = 0;
var maze;

var start_cell, finish_cell;

//Gets the size from the input elements, then initializes the designer using them.
function set_size() {
	w = document.getElementById('width').value;
	h = document.getElementById('height').value;
	mtbl = document.getElementById('maze_table');
	
	maze = [[]];
	mtbl.innerHTML = '';
	for (y = 0; y < h; y++) {
		maze[y] = [];
		table_row = document.createElement('tr');
		for (x = 0; x < w; x++) {
			maze[y][x] = 0;
			table_cell = document.createElement('td');
			table_cell.width = 25;
			table_cell.height = 25;
			table_cell.tag_x = x;
			table_cell.tag_y = y;
			table_cell.onclick = main_cell_click;
			table_cell.align = 'center';
			table_cell.style.background = '#000000';
			table_cell.style.color = '#FFFFFF';
			table_row.appendChild(table_cell);
			if (x != w-1) {
				table_cell2 = document.createElement('td');
				table_cell2.width = 25;
				table_cell2.height = 25;
				table_cell2.tag_x = x;
				table_cell2.tag_y = y;
				table_cell2.onclick = h_path_cell_click;
				table_cell2.style.background = '#CCCCCC';
				table_row.appendChild(table_cell2);
			}
		}
		mtbl.appendChild(table_row);
		if (y != h-1) {
			table_row2 = document.createElement('tr');
			for (x = 0; x < w; x++) {
				table_cell = document.createElement('td');
				table_cell = document.createElement('td');
				table_cell.width = 25;
				table_cell.height = 25;
				table_cell.tag_x = x;
				table_cell.tag_y = y;
				table_cell.onclick = v_path_cell_click;
				table_cell.style.background = '#CCCCCC';
				table_row2.appendChild(table_cell);
				if (x != w-1) {
					table_cell2 = document.createElement('td');
					table_cell2.width = 30;
					table_cell2.height = 30;
					table_row2.appendChild(table_cell2);
				}
			}
			mtbl.appendChild(table_row2);
		}
	}
	
	start_cell = finish_cell = null;
	update_maze_code();
}

//Changes the action performed by the mouse when clicking on table cells.
function set_tool(t) {
	tool = t;
}

function h_path_cell_click() {
	maze[this.tag_y][this.tag_x] ^= 8;
	maze[this.tag_y][this.tag_x+1] ^= 2;
	this.style.background = maze[this.tag_y][this.tag_x] & 8 ? '#000000' : '#CCCCCC';
	update_maze_code();
}

function v_path_cell_click() {
	maze[this.tag_y][this.tag_x] ^= 4;
	maze[this.tag_y+1][this.tag_x] ^= 1;
	this.style.background = maze[this.tag_y][this.tag_x] & 4 ? '#000000' : '#CCCCCC';
	update_maze_code();
}

//Performs the corresponding mouse action on a given table cell.
function main_cell_click() {
	switch (tool) {
		// case 0: //Place Path
			// maze[this.tag_y][this.tag_x] = 1 - maze[this.tag_y][this.tag_x];
			// update_cell_color(this);
			// break;
		case 1: //Place Start
			if (start_cell != null)
				start_cell.innerHTML = '';
			if (start_cell != this) {
				start_cell = this;
				this.innerHTML = 'S';
			} else {
				start_cell = null;
			}
			break;
		case 2: //Place Finish
			if (finish_cell != null)
				finish_cell.innerHTML = '';
			if (finish_cell != this) {
				finish_cell = this;
				this.innerHTML = 'F';
			} else {
				finish_cell = null;
			}
			break;
	}
	update_maze_code();
}

//Updates background and font color of cell depending on whether it's part of the path.
function update_cell_color(cell) {
	cell.style.background = maze[cell.tag_y][cell.tag_x] ? '#000000' : 'none';
	cell.style.color = maze[cell.tag_y][cell.tag_x] ? '#FFFFFF' : '#000000';
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
			var bit_n = (y != 0 && maze[y-1][x]) ? 1 : 0;
			var bit_e = (x != w-1 && maze[y][x+1]) ? 2 : 0;
			var bit_s = (y != h-1 && maze[y+1][x]) ? 4 : 0;
			var bit_w = (x != 0 && maze[y][x-1]) ? 8 : 0;
			var value = bit_n | bit_e | bit_s | bit_w;
			if (y != 0)
				code += ',';
			if (value < 10)
				code += ' ';
			code += value;
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



























