// Copyright (c) 2012, Joyent, Inc. All rights reserved.

var uuid = require('node-uuid');
var vasync = require('vasync');
var zkplus = require('zkplus');

var core = require('../lib');

if (require.cache[__dirname + '/helper.js'])
        delete require.cache[__dirname + '/helper.js'];
var helper = require('./helper.js');



///--- Globals

var after = helper.after;
var before = helper.before;
var test = helper.test;
var dig = helper.dig;

var ADDR = '192.168.0.1';
var PATH = '/com/foo/hosta';
var RECORD = 'hosta.foo.com';



///--- Tests

before(function (callback) {
        var self = this;

        var funcs = [
                function setup(_, cb) {
                        helper.createServer(function (err, res) {
                                if (err) {
                                        cb(err);
                                } else {
                                        self.server = res.server;
                                        self.zk = res.zk;
                                        cb();
                                }
                        });
                },

                function mkdir(_, cb) {
                        self.zk.mkdirp(PATH, cb);
                },

                function setRecord(_, cb) {
                        var record = {
                                type: 'host',
                                host: {
                                        address: ADDR
                                }
                        };
                        self.zk.update(PATH, record, cb);
                }
        ];

        vasync.pipeline({funcs: funcs}, function (err) {
                if (err) {
                        console.error(err.stack);
                        process.exit(1);
                }

                callback();
        });
});


after(function (callback) {
        var self = this;
        this.zk.rmr('/com', function (err) {
                self.zk.on('close', function () {
                        self.server.stop(callback);
                });
                self.zk.close();
        });
});


test('resolve record ok', function (t) {
        dig(RECORD, 'A', function (err, results) {
                t.ifError(err);
                t.ok(results);
                t.ok(results.answers);
                t.equal(results.answers.length, 1);
                t.deepEqual(results.answers[0], {
                        name: RECORD,
                        ttl: 5,
                        type: 'A',
                        target: ADDR
                });
                t.end();
        });
});
