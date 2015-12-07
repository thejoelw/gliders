#!/bin/env node

'use strict';

var express = require('express');
var Primus = require('primus');
var fs = require('fs');

var Player = require('./player.js');
var PublicObject = require('./publicobject.js');

var ServerApp = function()
{
    var app;
    var primus;
    var script;

    var open_games = [];
    PublicObject.create(open_games, []);

    var running_games = [];
    PublicObject.create(running_games, []);

    var init = function()
    {
        // Log message when server goes down
        process.on('exit', function()
        {
            console.log('Server stopped at ' + new Date());
        });

        // Setup signal handlers
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array)
        {
            process.on(element, function()
            {
                console.log('Received ' + element + ' at ' + new Date() + ', exiting...');
                process.exit(1);
            });
        });

        // Create server
        app = express();

        // Setup routes
        app.get('/bundle.js', send_script);
        app.use(express.static('public'));

        // Start listening
        var server = app.listen(get_port(), get_ip_address(), function()
        {
            var host = server.address().address;
            var port = server.address().port;

            console.log('Server listening at ' + host + ':' + port);
        });

        primus = new Primus(server, {
            'transformer': 'websockets',
        });
        compile_script();
        primus.on('connection', Player);
    };

    var get_ip_address = function()
    {
        return process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
    };
    var get_port = function()
    {
        return process.env.OPENSHIFT_NODEJS_PORT || 8080;
    };

    var compile_script = function()
    {
        script = [
            '// Autogenerated by js/server.js',
            primus.library(),
            'var module = {};',
            fs.readFileSync('client.js'),
            fs.readFileSync('game.js'),
            fs.readFileSync('gamecontroller.js'),
            fs.readFileSync('gamerenderer.js'),
            fs.readFileSync('hexgrid.js'),
            fs.readFileSync('hexgridview.js'),
            fs.readFileSync('util.js'),
        ].join('\n\n');

        var script_hash = require('crypto').createHash('md5').update(script).digest('hex');
        script += '\n\n';
        script += 'var script_hash = ' + JSON.stringify(script_hash) + ';';
    };

    var send_script = function(req, res)
    {
        // Debug: This re-compiles the script for every request to aid debugging
        compile_script();

        if (script)
        {
            res.send(script);
        }
        else
        {
            // I don't think this should ever happen, but just in case...
            res.send('alert("Script not available yet, please refresh the page after a few seconds");');
        }
    };

    init();
};

var app = new ServerApp();

/*
var hex_pool = [];
var hex_pool_next = 0;

var hide_cells = function()
{
    hex_pool_next = 0;
};

var show_cell = function(row, col, type)
{
    if (hex_pool_next >= hex_pool.length)
    {
        hex_pool.push(make_cell());
    }

    set_transform(hex_pool[hex_pool_next], _this.get_loc(row, col));
    set_type(hex_pool[hex_pool_next], type);
    hex_pool_next++;
};

var finalize_cells = function()
{
    for (var i = hex_pool_next; i < hex_pool.length; i++)
    {
        hex_pool[i].style.display = 'none';
    }
};

box.onchange = box.onkeyup = function()
{
    hide_cells();

    var type_map = {
        'n': _this.CELL_EMPTY,
        'v': _this.CELL_EDGE,
        'w': _this.CELL_WALL,
    };
    var warning_callback = function(msg)
    {
        console.error(msg);
    };
    construct_hex_grid(this.value, type_map, _this.CELL_EMPTY, show_cell, warning_callback);

    finalize_cells();
};
*/
