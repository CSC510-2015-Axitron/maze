var assert = require("chai").assert,
    apiClient = require('../apiClient.js');



describe('API TESTS', function() {
    describe('login/logout', function() {
        var token, userid;
        describe('should not login with bad credentials', function(done) {
            apiClient.login('asdf', 'herp', function(result) {
                assert.equal(result, null, 'result null');
                done();
            });
        });
        describe('should login correctly', function(done) {
            apiClient.login('dummy1@dum.my', 'testpassword1', function(tok, uid) {
                token = tok;
                userid = uid;
                assert.equal(uid, 1, 'uid == 1');
                describe('should logout correctly', function(done) {
                    assert.ok(token, 'previous login worked');
                    apiClient.logout(token, function(response) {
                        assert.ok(response, 'response not null');
                        assert.ok(response.response, 'response has a response in it');
                        assert.equals(response.response, 'logged out', 'token logs out successfully');
                        done();
                    });
                });
                done();
            });
        });
    });
    describe('public maze functions', function() {
        describe('get nonexistant maze', function(done) {
            apiClient.getMaze(10293, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.response, 'response has a respponse in it');
                assert.equals(resp.response, 'maze not found');
                assert.equals(resp.query, 10293);
                done();
            });
        });
        describe('get existant maze', function(done) {
            apiClient.getMaze(1, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.mazeno, 'mazeno not null');
                assert.ok(resp.userForMaze, 'userForMaze not null');
                assert.ok(resp.displayName, 'displayName not null');
                assert.ok(resp.height, 'height not null');
                assert.ok(resp.width, 'width not null');
                assert.ok(resp.mazeJSON, 'mazeJSON not null');
                assert.ok(resp.category, 'category not null');
                assert.equals(resp.mazeno, 1, 'mazeno same as expected');
                done();
            });
        });
        describe('get player best times for category', function(done) {
            apiClient.getUserTimes(1, 1, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.userid, 'userid not null');
                assert.ok(resp.category, 'category not null');
                assert.ok(resp.played, 'played not null');
                assert.equal(resp.userid, 1, 'user id matches request');
                assert.equal(resp.category, 1, 'category matches request');
                done();
            });
        });
        describe('get player best times overall', function(done) {
            apiClient.getUserTimes(1, 'all', function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.userid, 'userid not null');
                assert.ok(resp.played, 'played not null');
                assert.equal(resp.userid, 1, 'userid matches request');
                done();
            });
        });
        describe('get mazes in category', function(done) {
            apiClient.getMazesInCategory(1, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.category, 'category not null');
                assert.ok(resp.categoryName, 'category name not null');
                assert.ok(resp.mazes, 'mazes not null');
                assert.equal(resp.category, 1, 'category id matches request');
                done();
            });
        });
        describe('get mazes by user', function(done) {
            apiClient.getMazesByUser(1, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.userid, 'userid not null');
                assert.ok(resp.mazes, 'mazes not null');
                assert.equal(resp.userid, 1, 'userid matches request');
                done();
            });
        });
        describe('get categories', function(done) {
            apiClient.getCategories(function(resp){
                assert.ok(resp, 'response not null');
                done();
            });
        });
        describe('get top ten', function(done) {
            apiClient.getTopTen(1, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.maze, 'maze not null');
                assert.ok(resp.bestTimes, 'bestTimes not null');
                assert.equal(resp.maze, 1, 'maze matches request');
                done();
            });
        });
        describe('get number of mazes', function(done) {
            apiClient.getNumMazes(function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.mazes, 'mazes not null');
                done();
            });
        });
    });
    describe('logins required', function() {
        var token, userid;
        before(function(done) {
            apiClient.login('dummy1@dum.my', 'testpassword1', function(tok, uid) {
                token = tok;
                userid = uid;
                done();
            });
        });
        describe('refresh login token', function(done) {
            apiClient.keepAlive(token, function(resp) {
                assert.ok(resp, 'response not null');
                assert.equal(resp, true, 'response true');
                done();
            });
        });
        describe('check user info', function(done) {
            apiClient.checkInfo(token, userid, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.userid, 'userid not null');
                assert.ok(resp.email, 'email not null');
                assert.equal(resp.userid, userid, 'userid matches request');
                assert.equal(resp.email, 'dummy1@dum.my', 'email matches login');
                done();
            });
        });
    });
});
