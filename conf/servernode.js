/**
 * # servernode.js
 *
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for ServerNode in nodegame-server.
 *
 * @see ServerNode
 *
 * http://www.nodegame.org
 */
module.exports = configure;

var path = require('path');

function configure(servernode) {

    var rootDir;
    var player, admin;

    rootDir = servernode.rootDir;
    if (!rootDir) {
        servernode.logger.error('configure servernode: rootDir not found.');
        return false;
    }

    // 1. Servernode configuration.

    // The name of the server.
    servernode.name = "nodeGame server";

    // Default games directory.
    servernode.defaultGamesDir = rootDir + '/games/';

    // Array of games directories. They will be scanned sequentially
    // at loading time, and every subfolder containing a package.json
    // file will be added as a new game.
    // Important: games found in folders down in lower positions of the
    // array can override games defined before.
    servernode.gamesDirs = [servernode.defaultGamesDir];

    if (process && process.env.PORT) {
        // If app is running on a cloud service (e.g. Heroku)
        // then the assigned port has to be used.
        servernode.port = process.env.PORT;
    }
    else {
        // Port of the HTTP server and the Socket.IO app.
        servernode.port = '8080';
    }

    // The maximum number of channels allowed. 0 means unlimited.
    servernode.maxChannels = 0;

    // The maximum number of listeners allowed. 0 means unlimited.
    // Every channel defines 1 or more game servers, and each defines
    // a certain number of Node.JS listeners.
    servernode.maxListeners = 0;

    // If TRUE, it is possible to get information from the server by
    // via querystring (?q=).
    servernode.enableInfoQuery = false;

    // Url prefix do add in front of every route. Useful if nodegame is used
    // together with a reverse proxy engine like Ngix. (e.g. /mybasepath).
    servernode.basepath = null;

    // 2. Channels configuration.

    // AdminServer default options.
    adminServer = {

        // A PLAYER_UPDATE / PCONNECT / PDISCONNECT message will be sent to
        // all clients connected to the PlayerServer endpoint when:
        notify: {

            // A new authorized client connects;
            onConnect: true,

            // A client enters a new stage;
            onStageUpdate: false,

            // A client changes stageLevel (e.g. INIT, CALLBACK_EXECUTED);
            onStageLevelUpdate: false,

            // A client is LOADED (this option is needed in combination with
            // the option syncOnLoaded used on the clients). It is much less
            // expensive than setting onStageLevelUpdate = true;
            onStageLoadedUpdate: false
        },

        // Restricts the available recipient options.
        canSendTo: {

            // ALL
            all: true,

            // CHANNEL
            ownChannel: true,

            // ROOM
            ownRoom: true,

            // CHANNEL_XXX
            anyChannel: true,

            // ROOM_XXX
            anyRoom: true
        },

        // If the recipient of a _gameMsg_ is an array, it can contain at most
        // _maxMsgRecipients_ elements.
        maxMsgRecipients: 1000,

// Commented for the moment.

//        // All messages exchanged between players will be forwarded to the
//        // clients connected to the admin endpoint (ignores the _to_ field).
//        forwardAllMessages: true,
//
//        // If TRUE, players can invoke GET commands on admins.
//        // TODO: rename in a more generic way, or distinguish get from admins
//        // and get from players.
//        getFromAdmins: false,

        // Allow setting data (e.g. startingRoom, client type) in the query
        // data of a SocketIO connection.
        sioQuery: true,

        // Enable reconnections.
        // If TRUE, clients will be matched with previous game history based on
        // the clientId found in their cookies.
        enableReconnections: true
    };

    // PlayerServer default options.
    playerServer = {

        // A PLAYER_UPDATE / PCONNECT / PDISCONNECT message will be sent to
        // all clients connected to the PlayerServer endpoint when:
        notify: {

            // A new authorized client connects;
            onConnect: false,

            // A client enters a new stage;
            onStageUpdate: false,

            // A client changes stageLevel (e.g. INIT, CALLBACK_EXECUTED);
            onStageLevelUpdate: false,

            // A client is LOADED (this option is needed in combination with
            // the option syncOnLoaded used on the clients). It is much less
            // expensive than setting onStageLevelUpdate = true;
            onStageLoadedUpdate: false
        },

        // Restricts the available recipient options.
        canSendTo: {

            // ALL
            all: false,

            // CHANNEL
            ownChannel: false,

            // ROOM
            ownRoom: true,

            // CHANNEL_XXX
            anyChannel: false,

            // ROOM_XXX
            anyRoom: false
        },

        // If the recipient of a _gameMsg_ is an array, it can contain at most
        // _maxMsgRecipients_ elements.
        maxMsgRecipients: 0,

        // All messages exchanged between players will be forwarded to the
        // clients connected to the admin endpoint (ignores the _to_ field).
        forwardAllMessages: true,

        // If TRUE, players can invoke GET commands on admins.
        // TODO: rename in a more generic way, or distinguish get from admins
        // and get from players.
        getFromAdmins: false,

        // See above, in admin defaults.
        sioQuery: true,

        // See above, in the admin defaults.
        enableReconnections: true
    };

    // Defaults option for a channel.
    servernode.defaults.channel = {
        // Common options.
        // Which sockets will be enabled.
        sockets: {
            sio: true,
            direct: true
        },
        accessDeniedUrl: '/pages/accessdenied.htm',
        // Admin and Player server specific options.
        // Can overwrite common ones.
        playerServer: playerServer,
        adminServer: adminServer
    };

    // Returns TRUE to signal successful configuration of the server.
    return true;
}
