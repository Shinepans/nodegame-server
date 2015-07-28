/**
 * # GameServer
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Parses incoming messages and emits correspondings events
 *
 * Contains methods that are instantiated / overwritten
 * by two inheriting classes:
 *
 *  - `AdminServer`
 *  - `PlayerServer`
 */

"use strict";

// ## Global scope

module.exports = GameServer;

var util = require('util'),
    EventEmitter = require('events').EventEmitter;

util.inherits(GameServer, EventEmitter);

var jwt = require('jsonwebtoken');

var Logger = require('./Logger');

var SocketManager = require('./SocketManager'),
    GameMsgGenerator = require('./GameMsgGenerator'),
    SocketIo = require('./sockets/SocketIo'),
    SocketDirect = require('./sockets/SocketDirect');

var ngc = require('nodegame-client');

var GameMsg = ngc.GameMsg,
    PlayerList = ngc.PlayerList,
    Player = ngc.Player,
    GameDB = ngc.GameDB;

/**
 * ### GameServer.codes
 *
 * Success and error numerical codes. For internal use only.
 */
GameServer.codes = {
    OPERATION_OK: 0,
    DUPLICATED_CLIENT_ID: -1,
    ROOM_NOT_FOUND: -2,
    INVALID_CLIENT_ID: -3
};

/**
 * ## GameServer constructor
 *
 * Creates a new instance of GameServer
 *
 * @param {object} options Configuration object
 */
function GameServer(options, channel) {
    EventEmitter.call(this);
    this.setMaxListeners(0);

    /**
     * ### GameServer.options
     *
     * Reference to the user options defined in the server channel
     */
    this.options = options;

    /**
     * ### GameServer.channel
     *
     * Reference to the _ServerChannel_ in which the game server is created
     *
     * @see ServerChannel
     */
    this.channel = channel;

    /**
     * ### GameServer.servernode
     *
     * Reference to the _ServerNode_
     *
     * @see ServerNode
     */
    this.servernode = this.channel.servernode;

    /**
     * ### GameServer.registry
     *
     * Reference to _ChannelRegistry_ inside the server channel
     *
     * @see GameServer.channel
     * @see ChannelRegistry
     */
    this.registry = channel.registry;

    /**
     * ### GameServer.session
     *
     * The session ID as created by the channel.
     */
    this.session = channel.session;

    /**
     * ### GameServer.endpoint
     *
     * The endpoint under which the server is reachable
     */
    this.endpoint = '/' + options.endpoint;

    /**
     * ### GameServer.name
     *
     * The name of the server
     */
    this.name = options.name;

    /**
     * ### GameServer.serverid
     *
     * A random id for the server
     */
    this.serverid = '' + Math.random()*1000000000;

    /**
     * ### GameServer.sysLogger
     *
     * Logger of system events
     */
    this.sysLogger = Logger.get('channel', {name: this.name});

    /**
     * ### GameServer.msgLogger
     *
     * Logger of incoming / outgoing game messages
     */
    this.msgLogger = Logger.get('messages', {name: this.name});

    /**
     * ### GameServer.socket
     *
     * Socket manager for the server
     *
     * @see SocketManager
     */
    this.socketManager = new SocketManager(this);

    /**
     * ### GameServer.msg
     *
     * Game message generator
     *
     * @see GameMsgGenerator
     */
    this.msg = new GameMsgGenerator(this);

    /**
     * ### GameServer.partner
     *
     * The partner game server (Admin or Player)
     *
     * @see AdminServer
     * @see PlayerServer
     */
    this.partner = null;

    /**
     * ### GameServer.sio
     *
     * Reference to the Socket.io App in the ServerNode
     *
     * @see ServerNode
     * @see ServerChannel
     */
    this.sio = channel.sio;

    /**
     * ### GameServer.authCb
     *
     * An authorization callback
     */
    this.authCb = null;

    /**
     * ### GameServer.accessDeniedUrl
     *
     * The url of the page to which unauthorized clients will be redirected
     */
    this.accessDeniedUrl = options.accessDeniedUrl;

    /**
     * ### GameServer.generateClientId
     *
     * Client IDs generator callback.
     */
    this.generateClientId = null;


    /**
     * ### GameServer.enableReconnections
     *
     * If TRUE, clients will be matched with previous game history based on
     * the clientId found in their cookies.
     */
    this.enableReconnections = !!options.enableReconnections;

}

// ## GameServer methods

/**
 * ### GameServer.setPartner
 *
 * Sets a twin server, i.e. AdminServer for PlayerServer and viceversa
 *
 * @param {object} server The partner server
 */
GameServer.prototype.setPartner = function(server) {
    this.partner = server;
};

/**
 * ### GameServer.listen
 *
 * Attaches standard, and custom listeners
 */
GameServer.prototype.listen = function() {
    var sio, direct, socket_count;
    socket_count = 0;

    if (this.options.sockets) {
        // Open Socket.IO
        if (this.options.sockets.sio) {
            sio = new SocketIo(this);
            sio.attachListeners();
            this.socketManager.registerSocket(sio);
            socket_count++;
        }
        // Open Socket Direct
        if (this.options.sockets.direct) {
            direct = new SocketDirect(this);
            this.socketManager.registerSocket(direct);
            socket_count++;
        }

    }
    if (!socket_count) {
        this.sysLogger.log('No open sockets', 'warn');
    }
    this.attachListeners();
    this.attachCustomListeners();
};

/**
 * ### GameServer.secureParse
 *
 * Verifies that an incoming message is valid
 *
 * Performs the following operations:
 *
 * - tries to parse a string into a `GameMsg` object,
 * - verifies that _from_, _action_, and _target_ are non-empty strings,
 * - checks if the sender exists.
 *
 * Logs the outcome of the operation.
 *
 * _to_ and _from_ are validated separately.
 *
 * @param {string} msgString A string to transform in `GameMSg`
 * @return {boolean|GameMsg} The parsed game message, or FALSE
 *   if the msg is invalid or from an unknown sender.
 *
 * @see GameServer.validateRecipient
 * @see GameServer.validateSender
 */
GameServer.prototype.secureParse = function(gameMsg) {
    var server;

    server = this.ADMIN_SERVER ? 'Admin' : 'Player';

    if (gameMsg.from.trim() === '') {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.from is empty.', 'error');
        return false;
    }

    if ('string' !== typeof gameMsg.target) {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.target is not string.', 'error');
        return false;
    }

    if (gameMsg.target.trim() === '') {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.target is empty.', 'error');
        return false;
    }

    if ('string' !== typeof gameMsg.action) {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.action is not string.', 'error');
        return false;
    }

    if (gameMsg.action.trim() === '') {
        this.sysLogger.log(server + 'Server.secureParse: Received msg ' +
                           'but msg.action is empty.', 'error');
        return false;
    }

    // Checking if the FROM field is known.
    if (!this.channel.registry.clients.exist(gameMsg.from)) {
        this.sysLogger.log(server + 'Server.secureParse: Received msg from ' +
                           'unknown client: ' + gameMsg.from, 'error');
        return false;
    }

    return gameMsg;
};

/**
 * ### GameServer.onMessage
 *
 * Parses an incoming string into a GameMsg, and emits it as an event.
 *
 * This method must be called by a socket to notify an incoming message.
 *
 * @param {string} msg The string representing a game message.
 *
 * @see GameServer.secureParse
 * @see GameServer.validateRecipient
 */
GameServer.prototype.onMessage = function(msg) {
    var i, recipientList;
    var origSession, origStage, origFrom;

    msg = this.secureParse(msg);
    if (!msg) return;
    msg = this.validateRecipient(msg);
    if (!msg) return;
    msg = this.validateSender(msg);
    if (!msg) return;

    // Parsing successful, and recipient validated.

    // If gameMsg.to is an array, validate and send to each element separately.
    if (Object.prototype.toString.call(msg.to) === '[object Array]') {
        recipientList = msg.to;
        for (i in recipientList) {
            if (recipientList.hasOwnProperty(i)) {
                msg.to = recipientList[i];
                msg = this.validateRecipient(msg);
                if (!msg) continue;

                // Save properties that might be changed by the
                // obfuscation in the emit handler.
                origSession = msg.session;
                origStage = msg.stage;
                origFrom = msg.from;

                this.emit(msg.toEvent(), msg);

                // Restore the properties.
                msg.session = origSession;
                msg.stage = origStage;
                msg.from = origFrom;
            }
        }
    }
    else {
        this.emit(msg.toEvent(), msg);
    }
};

/**
 * ### GameServer.onDisconnect
 *
 * Handles client disconnections
 *
 * This method is called by a socket (Direct or SIO) when
 * it detects the client's disconnection.
 *
 * @param {string} sid The socket id of the client
 * @param {Socket} socket The sockect object
 *
 * @emit disconnect
 */
GameServer.prototype.onDisconnect = function(sid, socket) {
    var client, roomName, room, res;

    client = this.registry.clients.sid.get(sid);
    if (!client) {
        throw new Error('GameServer.onDisconnect: client has invalid sid.');
    }

    // Remove client from its room:
    roomName = this.registry.getClientRoom(client.id);
    room = this.channel.gameRooms[roomName];
    if (!room) {
        // This can happen with transports different from websockets.
        // They can trigger another disconnect event after first disconnect.
        throw new Error(
                'GameServer.onDisconnect: Could not determine room for ' +
                'disconnecting ' + (this.ADMIN_SERVER ? 'admin' : 'player') +
                ': ' + client.id, 'error');
    }

    room.clients.remove(client.id);

    this.registry.markDisconnected(client.id);

    // Emit so that it can be handled different by Admin and Player Server.
    this.emit('disconnect', client, room);
};

/**
 * ### GameServer.onShutdown
 *
 * Callback when the server is shut down
 *
 * TODO: implement it
 */
GameServer.prototype.onShutdown = function() {
    this.sysLogger.log("GameServer is shutting down.");

    // TODO save state to disk
};

/**
 * ### GameServer.attachCustomListeners
 *
 * Abstract method that will be overwritten by inheriting classes
 */
GameServer.prototype.attachCustomListeners = function() {};

/**
 * ### GameServer.notifyRoomConnection
 *
 * Send notifications when a clients connects to a room
 *
 * Abstract method that will be overwritten by inheriting classes
 *
 * @param {string} clientId The id of the client
 * @param {object} room The game room object
 */
GameServer.prototype.notifyRoomConnection = function(clientId, room) {};

/**
 * ### GameServer.notifyRoomDisconnection
 *
 * Send notifications when a clients disconnects from a room
 *
 * Abstract method that will be overwritten by inheriting classes
 *
 * @param {string} clientId The id of the client
 * @param {object} room The game room object
 */
GameServer.prototype.notifyRoomDisconnection = function(clientId, room) {};

/**
 * ### GameServer.onConnect
 *
 * Send a HI msg to the client, and log its arrival
 *
 * This method is called by a socket upon receiving a new connection.
 *
 * @param {string} socketId The id of the socket connection
 * @param {Socket} socketObj The socket object (Direct or SIO)
 * @param {object} headers The connection headers passed by the Socket
 * @param {string} clientType The type of the client (player, bot, etc.)
 * @param {string} startingRoom Optional. The name of the room in which
 *   the client is to be placed. Default: Waiting or Requirements room
 *
 * @return {boolean} TRUE on success
 *
 * @see GameServer.handleReconnectingClient
 * @see GameServer.handleConnectingClient
 */
GameServer.prototype.onConnect = function(socketId, socketObj, headers,
                                          clientType, startingRoom) {

    var decoded, res, clientId, clientObj;
    var cookies, disconnected, returningRoom;
    var newConnection, invalidSessionCookie;
    var tmpSid, tmpId, tmpType;

    newConnection = true;
    invalidSessionCookie = false;

    if (headers && headers.cookie) {
        cookies = parseCookies(headers.cookie);
    }
    else {
        cookies = {};
    }

    decoded = {};
    if (cookies && cookies.nodegame_token) {
        decoded = decodeJWT(cookies.nodegame_token, this.channel.secret);
        if (!decoded) {
            this.sysLogger.log(this.ADMIN_SERVER ? 'Admin' : 'Player' +
                               'Server: decoding jwt failed.', 'error');
        }
    }

    // If a valid identification cookie is found, it will be used.
    if (decoded.session !== this.channel.session) {
        invalidSessionCookie = true;
    }
    else if (decoded.clientId) {
        clientId = decoded.clientId;
    }

    // Set default clientType.
    if (!clientType) {
        if (this.ADMIN_SERVER) clientType = 'admin';
        else clientType = 'player';
    }

    // Authorization check, if an authorization function is defined.
    if (this.authCb) {
        res = this.authCb(this, {
            headers: headers,
            cookies: cookies,
            room: startingRoom,
            clientId: clientId,
            clientType: clientType,
            validSessionCookie: !invalidSessionCookie,
        });
        if (!res) {
            // Warns and disconnect client if auth failed.
            this.disposeUnauthorizedClient(socketId, socketObj);
            return false;
        }
    }

    // A custom callback can assign / overwrite the value of clientId.
    if (this.generateClientId) {
        res = this.generateClientId(this, {
            headers: headers,
            cookies: cookies,
            room: startingRoom,
            clientId: clientId,
            validSessionCookie: !invalidSessionCookie,
            socketId: socketId,
        });

        // If clientId is not string (for a failure or because the custom
        // id generator function did no accept the connection) the connection
        // is disposed, exactly as it was not authorized.
        if (res && 'string' !== typeof res) {
            sys.log('GameServer.handleConnectingClient: generateClientId ' +
                    'did not return a valid id for incoming ' +
                    (this.ADMIN_SERVER ? 'admin' : 'player' ), 'error');

            return GameServer.codes.INVALID_CLIENT_ID;
        }
        // Assign client id.
        clientId = res;
    }

    // Generate a new id if none was given.
    if (!clientId) clientId = this.registry.generateClientId();
    // See if a match in the registry is found.
    clientObj = this.registry.getClient(clientId);
    // If not, generate a new unique client id (assume this always works).
    if (!clientObj) clientObj = this.registry.addClient(clientId, {});

    // Decorate: the clientObj can be altered by a user-defined callback.
    if (this.decorateClientObj) {

        tmpId = clientObj.id;
        tmpSid = clientObj.sid;
        tmpType = clientObj.clientType;

        this.decorateClientObj(clientObj, {
            headers: headers,
            cookies: cookies,
            room: startingRoom,
            clientId: clientId,
            validSessionCookie: !invalidSessionCookie,
            socketId: socketId,
        });
        // Some properties cannot be changed.
        if (clientObj.id !== tmpId ||
            clientObj.sid !== tmpSid ||
            clientObj.admin !== this.ADMIN_SERVER ||
            clientObj.clientType !== tmpType) {

            throw new Error('GameServer.onConnect: ' +
                            'decorateClientObj cannot alter properties: ' +
                            'id, sid, admin, clientType');
        }
    }

    // Check if it is a reconnection.
    if (this.enableReconnections) {
        // Client must have connected at least once.
        if (clientObj.connected || clientObj.disconnected) {

            res = this.handleReconnectingClient(clientObj, socketObj, socketId);

            // TODO: if reconnection fails should the client be kicked out?

            // If reconnection failed, it will be treated as a new connection.
            newConnection = res !== GameServer.codes.OPERATION_OK;
        }
    }

    // New connection.
    if (newConnection) {

        // Add new connection properties to clientObj.
        clientObj.admin = this.ADMIN_SERVER || false;
        clientObj.clientType = clientType;
        clientObj.sid = socketId;

        res = this.handleConnectingClient(clientObj, socketObj, startingRoom);
    }

    // In case of failure, dispose of the client.
    if (res !== GameServer.codes.OPERATION_OK) {
        // Warns and disconnect client if auth failed.
        this.disposeUnauthorizedClient(socketId, socketObj);
        return false;
    }

    return true;
};

/**
 * ### GameServer.handleConnectingClient
 *
 * Handles a client (supposedly) connecting for the first time to the channel
 *
 * If a custom client id generator function is defined, and if the id returned
 * is already existing, then `handleReconnectingClient` is called.
 *
 * @param {object} clientObj The client object
 * @param {Socket} socketObj The socket object (Direct or SIO)
 * @param {string} startingRoom Optional. The name of the room in which
 *    the client is to be placed. Default: Waiting or Requirements room
 *
 * @return {number} A numeric code describing the outcome of the operation.
 *
 * @see GameServer.codes
 * @see GameServer.handleReconnectingClient
 * @see GameServer.registerClient
 */
GameServer.prototype.handleConnectingClient = function(
    clientObj, socketObj, startingRoom) {

    var res;

    // If not startingRoom is provided,
    // put the client in the requirements or waiting room.
    if (!startingRoom) {
        if (this.channel.gameInfo.requirements &&
            this.channel.gameInfo.requirements.enabled) {

            startingRoom = this.channel.requirementsRoom.name
        }
        else {
            startingRoom = this.channel.waitingRoom.name;
        }
    }

    // Register the client in the socket, mark connected, place in room.
    res = this.registerClient(clientObj, socketObj, startingRoom);

    if (res === GameServer.codes.OPERATION_OK) {
        // Let each Admin and Player Server registering the new connection.
        this.sysLogger.log('channel ' + this.channel.name + ' ' +
                           (this.ADMIN_SERVER ? 'admin' : 'player') +
                           ' connected: ' + clientObj.id);

        this.emit('connecting', clientObj, startingRoom);
    }

    return res;
};

/**
 * ### GameServer.handleReconnectingClient
 *
 * Handles a reconnecting client.
 *
 * @param {object} clientObj The client object
 * @param {Socket} socketObj The socket object (Direct or SIO)
 *
 * @return {number} A numeric code describing the outcome of the operation.
 *
 * @see GameServer.codes
 * @see GameServer.handleConnectingClient
 * @see GameServer.registerClient
 */
GameServer.prototype.handleReconnectingClient = function(clientObj, socketObj,
                                                         socketId) {

    var sys, clientId, returningRoom, res;
    var gameMsg, globalLookup, oldInfo;

    clientId = clientObj.id;
    sys = this.sysLogger;

    // It can happen that when the client disconnected the previous time,
    // its disconnection was not registered by the server (can happen
    // with ajax). We do it here.
    if (!clientObj.disconnected) {
        sys.log('GameServer.handleReconnectingClient: Reconnecting ' +
                (this.ADMIN_SERVER ? 'admin' : 'player' ) + ' that ' +
                'was not marked as disconnected: ' + clientId, 'warn');

        // Mark disconnected and try to resume the connection.
        gameMsg = {to: clientId};
        globalLookup = false;
        // Needs a game msg. TODO: update.
        oldInfo = this.socketManager.resolveClientAndSocket(gameMsg,
                                                            globalLookup);

        if (!oldInfo.success) {
            // The client will be treated as a new connection,
            // and a warning will be sent.
            return GameServer.codes.ROOM_NOT_FOUND;
        }

        // Force disconnection of old socket.
        oldInfo.socket.disconnect(oldInfo.sid);
    }

    // Set the new socket id in clientObj.
    clientObj.sid = socketId;

    returningRoom = this.registry.getClientRoom(clientId);

    // The old room must be still existing.
    if (!this.channel.gameRooms[returningRoom]) {
        sys.log('GameServer.handleReconnectingClient: ' +
                'Room no longer existing for re-connecting ' +
                (this.ADMIN_SERVER ? 'admin' : 'player' ) + ': ' +
                clientId, 'error');

        this.socketManager.send(this.msg.create({
            target: ngc.constants.target.ALERT,
            to: clientId,
            text: 'The game room you are looking for is not ' +
                'existing any more. You will be redirected to ' +
                'the initial room.'
        }));

        return GameServer.codes.ROOM_NOT_FOUND;
    }

    res = this.registerClient(clientObj, socketObj, returningRoom);

    if (res === GameServer.codes.OPERATION_OK) {

        // Let Admin and Player Server handle the new connection.
        sys.log('channel ' + this.channel.name + ' ' +
                (this.ADMIN_SERVER ? 'admin' : 'player') + ' re-connected: ' +
                clientId);

        this.emit('re-connecting', clientObj, returningRoom);
    }

    return res;
};


/**
 * ### GameServer.registerClient
 *
 * Registers a client with the socket manager, marks connected, and sends HI
 *
 * @param {object} clientObj The client object
 * @param {Socket} socketObj The socket object (Direct or SIO)
 * @param {string} room Optional. The name of the room in which
 *    the client is to be placed.
 *
 * @return {number} A numeric code describing the outcome of the operation.
 *
 * @see GameServer.codes
 * @see GameServer.handleReconnectingClient
 * @see GameServer.registerClient
 */
GameServer.prototype.registerClient = function(clientObj, socketObj, room) {
    var clientId, socketId;
    clientId = clientObj.id;
    socketId = clientObj.sid;

    // Officially register the client in the socket manager.
    this.socketManager.registerClient(clientId, socketObj);

    if (!this.channel.placeClient(clientObj, room)) {
        return GameServer.codes.ROOM_NOT_FOUND;
    }

    // Mark client as connected in the registry.
    this.registry.markConnected(clientId);

    // Notify the client of its ID.
    this.welcomeClient(clientId, socketId);

    return GameServer.codes.OPERATION_OK;
};

/**
 * ### GameServer.welcomeClient
 *
 * Sends a HI msg to the client, and logs its arrival
 *
 * @param {string} clientId The id of the connecting client
 * @param {string} socketId The socket id of the connecting client
 */
GameServer.prototype.welcomeClient = function(clientId, socketId) {
    this.socketManager.send(this.msg.create({
        target: 'HI',
        to: clientId,
        data: {
            id: clientId,
            sid: socketId,
            admin: this.ADMIN_SERVER
        },
        text: '/' + this.channel.name + '/'
    }));
};

/**
 * ### GameServer.disposeUnauthorizedClient
 *
 * Sends a sequence of HI, REDIRECT messages
 *
 * Cannot send ALERT because it gets destroyed by the REDIRECT.
 *
 * @param {string} socketObj The socket id of the connection
 * @param {string} socketObj The socket (IO, Direct) object
 */
GameServer.prototype.disposeUnauthorizedClient = function(socketId, socketObj) {
    var to, connStr;
    to = 'unauthorized_client';

    connStr = "Unauthorized client. Socket id: <" + socketId + ">";
    this.sysLogger.log(connStr, 'warn');

    // We need to send an HI message in any case because otherwise
    // the client will discard the messages.
    socketObj.send(this.msg.create({
        target: ngc.constants.target.HI,
        to: ngc.constants.UNAUTH_PLAYER,
        data: {
            id: to,
            sid: socketId
        }
    }), socketId);

    // Redirects the client.
    socketObj.send(this.msg.create({
        target: ngc.constants.target.REDIRECT,
        to: to,
        data: this.getAccessDeniedUrl()
    }), socketId);
};

/**
 * ### GameServer.authorization
 *
 * Sets the authorization function called on every new connection
 *
 * When called, the function receives two parameters:
 *
 * - the channel parameter
 * - an object literal with more information, such as cookies and other headers
 *
 * @param {function} cb The callback function
 */
GameServer.prototype.authorization = function(cb) {
    if ('function' !== typeof cb) {
        throw new TypeError('GameServer.authorization: cb must be function.');
    }
    this.authCb = cb;
};


/**
 * ### GameServer.clientIdGenerator
 *
 * Sets the function decorating client objects
 *
 * By default a client object contains the following keys: "id",
 * "sid", "admin", and "clientType". This function can add as many
 * other properties as needed. However, "id", "sid", and "admin" can
 * never be modified.
 *
 * The callback function receives two parameters:
 *
 *   - the standard client object
 *   - an object literal with more information, such as headers and cookies
 *
 * @param {function} cb The callback function
 */
GameServer.prototype.clientIdGenerator = function(cb) {
    if ('function' !== typeof cb) {
        throw new TypeError('GameServer.clientIdGenerator: cb must be ' +
                            'function.');
    }
    this.generateClientId = cb;
};

/**
 * ### GameServer.clientObjDecorator
 *
 * Sets the function for decorating the client object
 *
 * The callback function receives two parameters:
 *
 * - the standard client object
 * - an object literal with more information, such as client ids, and cookies
 *
 * @param {function} cb The callback function
 */
GameServer.prototype.clientObjDecorator = function(cb) {
    if ('function' !== typeof cb) {
        throw new TypeError('GameServer.clientObjDecorator: cb must be ' +
                            'function.');
    }
    this.decorateClientObj = cb;
};

/**
 * ### GameServer.getAccessDeniedUrl
 *
 * Returns the url for unauthorized access to the server.
 *
 * @return {string|null} The url to the access denied page, if defined
 */
GameServer.prototype.getAccessDeniedUrl = function() {
    return this.accessDeniedUrl;
};

/**
 * ### GameServer.validateRecipient
 *
 * Validates the _to_ field of a game msg
 *
 * The original object is modified. The _to_ field will be adjusted according to
 * the permissions currently granted to the sender of the message.
 *
 * The syntattic validitity of the _GameMsg_ object should be checked before
 * invoking this method, which evaluates the semantic meaning of the _to_
 * field.
 *
 * @param {GameMsg} gameMsg The message to validate
 *
 * @return {GameMsg|false} The validated/updated game msg, or FALSE, if invalid
 */
GameServer.prototype.validateRecipient = function(gameMsg) {
    var server, errStr, opts;
    var _name, _to, _originalTo;

    errStr = '';
    opts = this.options;
    server = this.ADMIN_SERVER ? 'Admin' : 'Player';

    if ('string' === typeof gameMsg.to) {
        if (gameMsg.to.trim() === '') {
            this.sysLogger.log(server + 'Server.validateRecipient: ' +
                               'msg.to is empty.', 'error');
            return false;
        }

        // TODO: avoid cascading and use else if instead.

        if (gameMsg.to === 'ALL' && !opts.canSendTo.all) {
            errStr += 'ALL/';
            gameMsg.to = 'CHANNEL';
        }

        if (gameMsg.to === 'CHANNEL' && !opts.canSendTo.ownChannel) {
            errStr += 'CHANNEL/';
            gameMsg.to = 'ROOM';
        }

        if (gameMsg.to === 'ROOM' && !opts.canSendTo.ownRoom) {
            this.sysLogger.log(server + 'Server.validateRecipient: ' +
                               'sending to "' + errStr +
                               'ROOM" is not allowed.', 'error');
            return false;
        }

        if ((gameMsg.to.lastIndexOf('CHANNEL_', 0) === 0)) {

            if (!opts.canSendTo.anyChannel) {

                this.sysLogger.log(server + 'Server.validateRecipient: ' +
                                   'sending to "CHANNEL_" is not allowed.',
                                   'error');
                return false;
            }

            // Extract channel name from _to_ field.
            _name = gameMsg.to.substr(8);
            // Fetch channel object.
            _to = this.channel.servernode.channels[_name];
            if (!_to) {
                this.sysLogger.log(server + 'Server.validateRecipient: ' +
                                   gameMsg.to + ' points to an unexisting ' +
                                   'channel.', 'error');
                return false;
            }

            // Encapsulate validated channel data in the message.
            gameMsg._originalTo = gameMsg.to;
            gameMsg._to = _to;
            gameMsg.to = 'CHANNEL_X';
        }
        if ((gameMsg.to.lastIndexOf('ROOM_', 0) === 0)) {

            if (!opts.canSendTo.anyRoom) {

                this.sysLogger.log(server + 'Server.validateRecipient: ' +
                                   'sending to "ROOM_" is not allowed.',
                                   'error');
                return false;
            }
            // Extract room id from _to_ field.
            _name = gameMsg.to.substr(5);
            // Fetch channel object.
            _to = this.channel.servernode.rooms[_name];

            if (!_to) {
                this.sysLogger.log(server + 'Server.validateRecipient: ' +
                                   gameMsg.to + ' points to an unexisting ' +
                                   'room.', 'error');
                return false;
            }

            // Encapsulate validated channel data in the message.
            gameMsg._originalTo = gameMsg.to;
            gameMsg._to = _to;
            gameMsg.to = 'ROOM_X';
        }
        // Otherwise it's either SERVER (always allowed) or a client ID, which
        // will be checked at a later point.

    }
    else if (Object.prototype.toString.call(gameMsg.to) === '[object Array]') {

        if (gameMsg.to.length > opts.maxMsgRecipients) {
            this.sysLogger.log(server + 'Server.validateRecipient: ' +
                               'number of recipients exceeds limit. ' +
                               gameMsg.to.length + '>' +
                               opts.maxNumRecipients, 'error');
            return false;
        }

    }
    else {
        this.sysLogger.log(server + 'Server.validateRecipient: ' +
                           'gameMsg.to is neither string nor array.', 'error');
        return false;
    }
    return gameMsg;
};

/**
 * ### GameServer.validateSender
 *
 * Validates the _from_ field of a game msg
 *
 * The original object is modified. The _from_ field remains unchanged, but
 * adds the room name of the sender under __roomName_, the name
 * of the channel under __channelName_, and the socket id under __sid_.
 *
 * The syntattic validitity of the _GameMsg_ object should be checked before
 * invoking this method, which evaluates only if the sender exists.
 *
 * @param {GameMsg} gameMsg The message to validate
 *
 * @return {GameMsg|false} The validated/updated game msg, or FALSE, if invalid
 */
GameServer.prototype.validateSender = function(gameMsg) {
    var server, errStr, opts;
    var _room;

    errStr = '';
    opts = this.options;
    server = this.ADMIN_SERVER ? 'Admin' : 'Player';

    if ('string' !== typeof gameMsg.from) {
        this.sysLogger.log(server + 'Server.validateSender: msg.from must be ' +
                           'string.', 'error');
        return false;
    }

    _room = this.channel.registry.getClientRoom(gameMsg.from);

    if (!_room) {
        this.sysLogger.log(server + 'Server.validateSender: sender was not ' +
                           'found in any room: ' + gameMsg.toEvent() + ' - ' +
                           gameMsg.from + '.', 'error');
        return false;
    }

    gameMsg._roomName = _room;
    gameMsg._channelName = this.channel.name;
    gameMsg._sid = this.channel.registry.getClient(gameMsg.from).sid;
    return gameMsg;
};

/**
 * ### GameServer.attachListeners
 *
 * Attaches listeners shared by both servers.
 */
GameServer.prototype.attachListeners = function() {
    var that = this,
    sys = this.sysLogger,
    action = ngc.constants.action,
    say = action.SAY + '.',
    set = action.SET + '.',
    get = action.GET + '.';

    // #### get.LANG
    // It sends the object of language objects for the game back to the client.
    this.on(get + 'LANG', function(msg) {
        var room, roomName;
        var response, serverName;

        if (msg.to === 'SERVER') {

            // Get the room of the player to infer the game.
            roomName = msg._roomName || that.registry.getClientRoom(msg.from);
            room = that.channel.gameRooms[roomName];

            if (!room) {
                serverName = that.ADMIN_SERVER ? 'Admin' : 'Player';
                sys.log(serverName + '.on.get.LANG: Could not determine room ' +
                        'of sender: ' + msg.from, 'error');
                return;
            }

            response = that.msg.create({
                target: 'LANG',
                from: 'SERVER',
                to: msg.from,
                data: that.servernode.info.games[room.gameName].languages
            });

            that.socketManager.send2client(response);
        }
    });
};


// ## Helper methods

/**
 * ## decodeJWT
 *
 * Tries to decode a jwt token and catches the possible error
 *
 * @param {string} token The encrypted token
 * @param {strong} secret The secret for decoding
 *
 * @return {object|boolean} The decoded token, or FALSE on failure
 */
function decodeJWT(token, secret) {
    try {
        return jwt.verify(token, secret);
    }
    catch(e) {
        return false;
    }
}

/**
 * ### parseCookies
 *
 * Parses the cookie string and returns a cookies object
 *
 * @param {string} cookieString The cookie string
 *
 * @return {object} An object containing a map of cookie-values
 *
 * Kudos to:
 * http://commandlinefanatic.com/cgi-bin/showarticle.cgi?article=art013
 */
function parseCookies(cookieString) {
    return cookieString.split(';')
        .map(cookieMap)
        .reduce(cookieReduce, {});
}

function cookieMap(x) { return x.trim().split('='); }
function cookieReduce(a, b) { a[ b[ 0 ] ] = b[ 1 ];  return a; }
