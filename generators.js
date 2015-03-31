//some convenience code
Array.prototype.peek = function() {
    return this[this.length-1];
};

//This simplex noise code is used for one of the generators to generate a coherent direction field.
/*
 * A fast javascript implementation of simplex noise by Jonas Wagner
 *
 * Based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
 * Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 *
 *
 * Copyright (C) 2012 Jonas Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
var F2 = 0.5 * (Math.sqrt(3.0) - 1.0),
    G2 = (3.0 - Math.sqrt(3.0)) / 6.0,
    F3 = 1.0 / 3.0,
    G3 = 1.0 / 6.0,
    F4 = (Math.sqrt(5.0) - 1.0) / 4.0,
    G4 = (5.0 - Math.sqrt(5.0)) / 20.0;


function SimplexNoise(seed) {
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    var source = new Uint8Array(256);
    for (var i = 0; i < 256; i++)
        source[i] = i;
    for (var i = 255; i >= 0; i--) {
        seed = seed * 268437223 + 268436653;
        seed &= 0xFFFFFFFF;
        var r = (seed + 31) % (i + 1);
        if (r < 0)
            r += (i + 1);
        this.perm[i + 256] = this.perm[i] = source[r];
        this.permMod12[i + 256] = this.permMod12[i] = this.perm[i] % 12;
        source[r] = source[i];
    }
}

SimplexNoise.prototype = {
    grad3: new Float32Array([1, 1, 0,
                            - 1, 1, 0,
                            1, - 1, 0,

                            - 1, - 1, 0,
                            1, 0, 1,
                            - 1, 0, 1,

                            1, 0, - 1,
                            - 1, 0, - 1,
                            0, 1, 1,

                            0, - 1, 1,
                            0, 1, - 1,
                            0, - 1, - 1]),
    grad4: new Float32Array([0, 1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1,
                            0, - 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1,
                            1, 0, 1, 1, 1, 0, 1, - 1, 1, 0, - 1, 1, 1, 0, - 1, - 1,
                            - 1, 0, 1, 1, - 1, 0, 1, - 1, - 1, 0, - 1, 1, - 1, 0, - 1, - 1,
                            1, 1, 0, 1, 1, 1, 0, - 1, 1, - 1, 0, 1, 1, - 1, 0, - 1,
                            - 1, 1, 0, 1, - 1, 1, 0, - 1, - 1, - 1, 0, 1, - 1, - 1, 0, - 1,
                            1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1, 0,
                            - 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1, 0]),
    noise2D: function (xin, yin) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad3 = this.grad3;
        var n0=0, n1=0, n2=0; // Noise contributions from the three corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin) * F2; // Hairy factor for 2D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var X0 = i - t; // Unskew the cell origin back to (x,y) space
        var Y0 = j - t;
        var x0 = xin - X0; // The x,y distances from the cell origin
        var y0 = yin - Y0;
        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
        else {
            i1 = 0;
            j1 = 1;
        } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6
        var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
        var y2 = y0 - 1.0 + 2.0 * G2;
        // Work out the hashed gradient indices of the three simplex corners
        var ii = i & 255;
        var jj = j & 255;
        // Calculate the contribution from the three corners
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            var gi0 = permMod12[ii + perm[jj]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            var gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            var gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70.0 * (n0 + n1 + n2);
    },
    // 3D simplex noise
    noise3D: function (xin, yin, zin) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad3 = this.grad3;
        var n0, n1, n2, n3; // Noise contributions from the four corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var k = Math.floor(zin + s);
        var t = (i + j + k) * G3;
        var X0 = i - t; // Unskew the cell origin back to (x,y,z) space
        var Y0 = j - t;
        var Z0 = k - t;
        var x0 = xin - X0; // The x,y,z distances from the cell origin
        var y0 = yin - Y0;
        var z0 = zin - Z0;
        // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
        // Determine which simplex we are in.
        var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
        var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
        if (x0 >= y0) {
            if (y0 >= z0) {
                i1 = 1;
                j1 = 0;
                k1 = 0;
                i2 = 1;
                j2 = 1;
                k2 = 0;
            } // X Y Z order
            else if (x0 >= z0) {
                i1 = 1;
                j1 = 0;
                k1 = 0;
                i2 = 1;
                j2 = 0;
                k2 = 1;
            } // X Z Y order
            else {
                i1 = 0;
                j1 = 0;
                k1 = 1;
                i2 = 1;
                j2 = 0;
                k2 = 1;
            } // Z X Y order
        }
        else { // x0<y0
            if (y0 < z0) {
                i1 = 0;
                j1 = 0;
                k1 = 1;
                i2 = 0;
                j2 = 1;
                k2 = 1;
            } // Z Y X order
            else if (x0 < z0) {
                i1 = 0;
                j1 = 1;
                k1 = 0;
                i2 = 0;
                j2 = 1;
                k2 = 1;
            } // Y Z X order
            else {
                i1 = 0;
                j1 = 1;
                k1 = 0;
                i2 = 1;
                j2 = 1;
                k2 = 0;
            } // Y X Z order
        }
        // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
        // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
        // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
        // c = 1/6.
        var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
        var y1 = y0 - j1 + G3;
        var z1 = z0 - k1 + G3;
        var x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
        var y2 = y0 - j2 + 2.0 * G3;
        var z2 = z0 - k2 + 2.0 * G3;
        var x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
        var y3 = y0 - 1.0 + 3.0 * G3;
        var z3 = z0 - 1.0 + 3.0 * G3;
        // Work out the hashed gradient indices of the four simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        // Calculate the contribution from the four corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 < 0) n3 = 0.0;
        else {
            var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
            t3 *= t3;
            n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to stay just inside [-1,1]
        return 32.0 * (n0 + n1 + n2 + n3);
    },
    // 4D simplex noise, better simplex rank ordering method 2012-03-09
    noise4D: function (x, y, z, w) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad4 = this.grad4;

        var n0, n1, n2, n3, n4; // Noise contributions from the five corners
        // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
        var s = (x + y + z + w) * F4; // Factor for 4D skewing
        var i = Math.floor(x + s);
        var j = Math.floor(y + s);
        var k = Math.floor(z + s);
        var l = Math.floor(w + s);
        var t = (i + j + k + l) * G4; // Factor for 4D unskewing
        var X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
        var Y0 = j - t;
        var Z0 = k - t;
        var W0 = l - t;
        var x0 = x - X0; // The x,y,z,w distances from the cell origin
        var y0 = y - Y0;
        var z0 = z - Z0;
        var w0 = w - W0;
        // For the 4D case, the simplex is a 4D shape I won't even try to describe.
        // To find out which of the 24 possible simplices we're in, we need to
        // determine the magnitude ordering of x0, y0, z0 and w0.
        // Six pair-wise comparisons are performed between each possible pair
        // of the four coordinates, and the results are used to rank the numbers.
        var rankx = 0;
        var ranky = 0;
        var rankz = 0;
        var rankw = 0;
        if (x0 > y0) rankx++;
        else ranky++;
        if (x0 > z0) rankx++;
        else rankz++;
        if (x0 > w0) rankx++;
        else rankw++;
        if (y0 > z0) ranky++;
        else rankz++;
        if (y0 > w0) ranky++;
        else rankw++;
        if (z0 > w0) rankz++;
        else rankw++;
        var i1, j1, k1, l1; // The integer offsets for the second simplex corner
        var i2, j2, k2, l2; // The integer offsets for the third simplex corner
        var i3, j3, k3, l3; // The integer offsets for the fourth simplex corner
        // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
        // Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
        // impossible. Only the 24 indices which have non-zero entries make any sense.
        // We use a thresholding to set the coordinates in turn from the largest magnitude.
        // Rank 3 denotes the largest coordinate.
        i1 = rankx >= 3 ? 1 : 0;
        j1 = ranky >= 3 ? 1 : 0;
        k1 = rankz >= 3 ? 1 : 0;
        l1 = rankw >= 3 ? 1 : 0;
        // Rank 2 denotes the second largest coordinate.
        i2 = rankx >= 2 ? 1 : 0;
        j2 = ranky >= 2 ? 1 : 0;
        k2 = rankz >= 2 ? 1 : 0;
        l2 = rankw >= 2 ? 1 : 0;
        // Rank 1 denotes the second smallest coordinate.
        i3 = rankx >= 1 ? 1 : 0;
        j3 = ranky >= 1 ? 1 : 0;
        k3 = rankz >= 1 ? 1 : 0;
        l3 = rankw >= 1 ? 1 : 0;
        // The fifth corner has all coordinate offsets = 1, so no need to compute that.
        var x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
        var y1 = y0 - j1 + G4;
        var z1 = z0 - k1 + G4;
        var w1 = w0 - l1 + G4;
        var x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
        var y2 = y0 - j2 + 2.0 * G4;
        var z2 = z0 - k2 + 2.0 * G4;
        var w2 = w0 - l2 + 2.0 * G4;
        var x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
        var y3 = y0 - j3 + 3.0 * G4;
        var z3 = z0 - k3 + 3.0 * G4;
        var w3 = w0 - l3 + 3.0 * G4;
        var x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
        var y4 = y0 - 1.0 + 4.0 * G4;
        var z4 = z0 - 1.0 + 4.0 * G4;
        var w4 = w0 - 1.0 + 4.0 * G4;
        // Work out the hashed gradient indices of the five simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        var ll = l & 255;
        // Calculate the contribution from the five corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
            t0 *= t0;
            n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0 + 1] * y0 + grad4[gi0 + 2] * z0 + grad4[gi0 + 3] * w0);
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
            t1 *= t1;
            n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1 + 1] * y1 + grad4[gi1 + 2] * z1 + grad4[gi1 + 3] * w1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
            t2 *= t2;
            n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2 + 1] * y2 + grad4[gi2 + 2] * z2 + grad4[gi2 + 3] * w2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
        if (t3 < 0) n3 = 0.0;
        else {
            var gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
            t3 *= t3;
            n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3 + 1] * y3 + grad4[gi3 + 2] * z3 + grad4[gi3 + 3] * w3);
        }
        var t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
        if (t4 < 0) n4 = 0.0;
        else {
            var gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
            t4 *= t4;
            n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4 + 1] * y4 + grad4[gi4 + 2] * z4 + grad4[gi4 + 3] * w4);
        }
        // Sum up and scale the result to cover the range [-1,1]
        return 27.0 * (n0 + n1 + n2 + n3 + n4);
    }


};

//convenience constants
var N_CONST = 1,
E_CONST = 2,
S_CONST = 4,
W_CONST = 8,

//actual exported code
methods = {
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
        myRandom = methods.seedRandom(seed),
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
        var dist = methods.distanceBetweenMazePoints(maze, maze.start, maze.end);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, neighbor, maze.end);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, maze.start, neighbor);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, maze.start, neighbor);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, neighbor, maze.end);
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
        myRandom = methods.seedRandom(seed),
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
        var dist = methods.distanceBetweenMazePoints(maze, maze.start, maze.end);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, neighbor, maze.end);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, maze.start, neighbor);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, maze.start, neighbor);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, neighbor, maze.end);
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
        myRandom = methods.seedRandom(seed),
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
        var dist = methods.distanceBetweenMazePoints(maze, maze.start, maze.end);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, neighbor, maze.end);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, maze.start, neighbor);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, maze.start, neighbor);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, neighbor, maze.end);
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
        myRandom = methods.seedRandom(seed),
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

            dist = methods.distanceBetweenMazePoints(maze, maze.start, maze.end);
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
        var dist = methods.distanceBetweenMazePoints(maze, maze.start, maze.end);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, neighbor, maze.end);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, maze.start, neighbor);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, maze.start, neighbor);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, neighbor, maze.end);
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
        myRandom = methods.seedRandom(seed),
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
        maze.start = [Math.round(myRandom())*(width-1), Math.round(myRandom())*(height-1)];
        maze.end = [(width-1)-maze.start[0], (height-1)-maze.start[1]];

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

            var dist = methods.distanceBetweenMazePoints(maze, maze.start, maze.end);
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
        var dist = methods.distanceBetweenMazePoints(maze, maze.start, maze.end);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, neighbor, maze.end);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, maze.start, neighbor);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, maze.start, neighbor);
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
                    var new_dist = methods.distanceBetweenMazePoints(maze, neighbor, maze.end);
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
	
    //Places a start+endpoint, and repeatedly joins groups via random
	//walls until there is only one group. Then repeatedly moves the
	//endpoints if better options seen.
	genRandomizedKruskals: function(width, height, seed)
	{
		var ret = {"seed":(seed || Math.floor(Math.random() * 5000000))},
		myRandom = seedRandom(seed),
		walls = [],
		cellParents = [],
		maze = {"width":width,"height":height, board:[]};
		for(var x = 0; x < width; x++)
		{
			maze.board.push([]);
			cellParents.push([]);
			for(var y = 0; y < height; y++)
			{
				maze.board[x].push(0);
				cellParents[x].push([x, y]);
			}
		}
		maze.start = [Math.round(myRandom())*(width-1), Math.round(myRandom())*(height-1)];
		maze.end = [(width-1)-maze.start[0], (height-1)-maze.start[1]];
		
		for (var x = 0; x < width; x++) {
			for (var y = 0; y < height; y++) {
				if (x != width -1) walls.push([x, y, 0]);
				if (y != height-1) walls.push([x, y, 1]);
			}
		}

		//For each wall, in a random order
		while (walls.length > 0) {
			var wall_index = Math.floor(myRandom() * (walls.length-1));
			var wall = walls[wall_index];
			walls[wall_index] = walls[walls.length - 1];
			walls = walls.splice(0, walls.length - 1);
			
			//First cell & its group ancestor
			var cellOneAncestorDepth = 0;
			var cellOne = [wall[0], wall[1]];
			var cellOneAncestor = [cellOne[0], cellOne[1]];
			while (1) {
				var nextAncestor = cellParents[cellOneAncestor[0]][cellOneAncestor[1]];
				if (nextAncestor[0] == cellOneAncestor[0] && nextAncestor[1] == cellOneAncestor[1])
					break;
				cellOneAncestor = nextAncestor;
				cellOneAncestorDepth++;
			}
			
			//Second cell & its group ancestor
			var cellTwoAncestorDepth = 0;
			var cellTwo = [wall[0], wall[1]];
			if (wall[2] == 0) //Horz
				cellTwo[0]++;
			else //Vert
				cellTwo[1]++;
			var cellTwoAncestor = [cellTwo[0], cellTwo[1]];
			while (1) {
				var nextAncestor = cellParents[cellTwoAncestor[0]][cellTwoAncestor[1]];
				if (nextAncestor[0] == cellTwoAncestor[0] && nextAncestor[1] == cellTwoAncestor[1])
					break;
				cellTwoAncestor = nextAncestor;
				cellTwoAncestorDepth++;
			}
			
			//Join the groups via this wall if they're different.
			if (cellOneAncestor[0] != cellTwoAncestor[0] || cellOneAncestor[1] != cellTwoAncestor[1]) {
				if (wall[2] == 0) { //Horz
					maze.board[cellOne[0]][cellOne[1]] |= E_CONST;
					maze.board[cellTwo[0]][cellTwo[1]] |= W_CONST;
				} else { //Vert
					maze.board[cellOne[0]][cellOne[1]] |= S_CONST;
					maze.board[cellTwo[0]][cellTwo[1]] |= N_CONST;
				}
				
				//Whichever one has a deeper depth becomes the ancestor of the union.
				if (cellOneAncestorDepth > cellTwoAncestorDepth) {
					cellParents[cellTwoAncestor[0]][cellTwoAncestor[1]] = cellOneAncestor;
				} else {
					cellParents[cellOneAncestor[0]][cellOneAncestor[1]] = cellTwoAncestor;
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
	}
};

module.exports = methods;
