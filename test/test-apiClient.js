var assert = require("chai").assert;
var apiClient = require('../apiClient.js');

describe('APICLIENT TESTS', function() {
    describe('apiClient.getCategories()', function() {
        it('should get non-null categories', function(done){    
            apiClient.getCategories(function(resp){
                assert.ok(resp, 'response not null');
                done();
            });
        });
    });

    describe('apiClient.getMaze()', function(){
        it('Should have a response for a non-existent maze', function(done) {
            apiClient.getMaze(10293, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.response, 'response has a respponse in it');
                assert.equal(resp.response, 'maze not found');
                assert.equal(resp.query, 10293);
                done();
            });
        });
        it('Should get an existing maze', function(done) {
            apiClient.getMaze(19, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.mazeno, 'mazeno not null');
                assert.notOk(resp.userForMaze, 'userForMaze not null');
                assert.ok(resp.displayName, 'displayName not null');
                assert.ok(resp.height, 'height not null');
                assert.ok(resp.width, 'width not null');
                assert.ok(resp.mazeJSON, 'mazeJSON not null');
                assert.ok(resp.category, 'category not null');
                assert.equal(resp.mazeno, 19, 'mazeno same as expected');
                done();
            });
        });
    })


    describe('apiClient.login()', function() {
        it('should login correctly', function(done) {
            apiClient.login('dummy1@dum.my', 'testpassword1', function(tok, uid) {
                token = tok;
                userid = uid;
                assert.equal(uid, 1, 'uid == 1');
                apiClient.logout(token, function(response){
                    done();
                });
            });
        });
        it('should not login with bad credentials', function(done) {
            apiClient.login('asdf', 'herp', function(result) {
                assert.equal(result, null);
                done();
            });
        });
    });

    describe('apiClient.getUserTimes()', function() {
        it('Should get player best times for category', function(done) {
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
        it('Should get player best times overall', function(done) {
            apiClient.getUserTimes(1, 'all', function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.userid, 'userid not null');
                assert.ok(resp.played, 'played not null');
                assert.equal(resp.userid, 1, 'userid matches request');
                done();
            });
        });
    });

    describe('apiClient.getMazesByCategory()', function() {
        it('Should get mazes in category', function(done) {
            apiClient.getMazesInCategory(1, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.category, 'category not null');
                assert.ok(resp.categoryName, 'category name not null');
                assert.ok(resp.mazes, 'mazes not null');
                assert.equal(resp.category, 1, 'category id matches request');
                done();
            });
        });
    })

    describe('apiClient.getMazesByUser()', function() {
        it('Should get mazes by user', function(done) {
            apiClient.getMazesByUser(1, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.userid, 'userid not null');
                assert.ok(resp.mazes, 'mazes not null');
                assert.equal(resp.userid, 1, 'userid matches request');
                done();
            });
        });
    });

    describe('apiClient.getTopTen()', function() {
        it('Should get top ten', function(done) {
            apiClient.getTopTen(1, function(resp) {
                assert.ok(resp, 'response not null');
                assert.ok(resp.maze, 'maze not null');
                assert.ok(resp.bestTimes, 'bestTimes not null');
                assert.equal(resp.maze, 1, 'maze matches request');
                done();
            });
        });
    });

    describe('apiClient.getNumMazes()', function() {
        it('Should get number of mazes', function(done) {
            apiClient.getNumMazes(function(resp) {
                assert.ok(resp, 'response not null');
                //this assert doesn't make sense since
                //the resp val is a number doesn't
                //return an object
                //assert.ok(resp.mazes, 'mazes not null');
                done();
            });
        });
    });

    describe('apiClient.keepAlive()', function() {
        var token, userid;
        before(function(done) {
            apiClient.login('dummy1@dum.my', 'testpassword1', function(tok, uid) {
                token = tok;
                userid = uid;
                done();
            });
        });
        it('Should refresh login token', function(done) {
            apiClient.keepAlive(token, function(resp) {
                assert.ok(resp, 'response not null');
                assert.equal(resp, true, 'response true');
                done();
            });
        });
    });


    describe('apiClient.checkInfo()', function() {
        var token, userid;
        before(function(done) {
            apiClient.login('dummy1@dum.my', 'testpassword1', function(tok, uid) {
                token = tok;
                userid = uid;
                done();
            });
        });
        it('Should check user info', function(done) {
            apiClient.checkInfo(token, userid, function(uid, em) {
                assert.ok(em, 'response not null');
                assert.ok(uid, 'userid not null');
                assert.ok(em, 'email not null');
                assert.equal(uid, userid, 'userid matches request');
                assert.equal(em, 'dummy1@dum.my', 'email matches login');
                done();
            });
        });
    });


    describe('apiClient.logout()', function() {
        var token, userid;
        before(function(done) {
            apiClient.login('dummy1@dum.my', 'testpassword1', function(tok, uid) {
                token = tok;
                userid = uid;
                done();
            });
        });
        it('Should logout correctly', function(done) {
            assert.isDefined(token, 'previous login worked');
            apiClient.logout(token, function(response) {
                assert.isTrue(response);
                done();
            });
        });
    });
});

