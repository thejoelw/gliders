var ClientError = require('./clienterror.js');

module.exports = function(app, remote)
{
    var name;
    var name_locked = false;
    var in_games = [];

    remote.get_name = function() {return name;};

    var init = function()
    {
        name = app.make_guest_name();
        remote.write({
            'q': 'set_name',
            'name': name,
        });

        app.subscribe_open_games(remote);
    };

    var join_game = function(data)
    {
        if (!name) {return;}
        name_locked = true;

        app.join_game(data.game_id, remote);
    };

    remote.register_handler('set_name', function(data)
    {
        if (!name_locked)
        {
            if (typeof data.name === 'string' && data.name.length >= 4 && data.name.length <= 16)
            {
                if (app.use_name(data.name))
                {
                    app.free_name(name);
                    name = data.name;
                    remote.write({
                        'q': 'set_name',
                        'name': name,
                    });
                }
                else
                {
                    throw new ClientError('Name already in use', 'set_name');
                }
            }
            else
            {
                throw new ClientError('Invalid name', 'set_name');
            }
        }
        else
        {
            throw new ClientError('You cannot change your name right now', 'set_name');
        }
    });

    remote.register_handler('create_game', function(data)
    {
        if (!name) {return;}

        data.game.player_names = [];
        var game = app.create_game(data.game);

        join_game({'game_id': game.get_game_id()});
    });

    remote.register_handler('join_game', join_game);

    remote.get_spark().on('end', function()
    {
        app.unsubscribe_open_games(remote);
    });

    init();
};