/**
 * # SocketIo
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Handles network connections through Socket.IO
 */

"use strict";

// Global scope

module.exports = SocketIo;

var ngc = require('nodegame-client');

/**
 * ## SocketIo constructor
 *
 * Creates an instance of SocketIo
 *
 * @param {GameServer} server A GameServer instance
 *
 * @see GameServer
 */
function SocketIo(gameServer) {

    /**
     * ### SocketIo.name
     *
     * The name of the socket.
     */
    this.name = 'sio';

    /**
     * ### Socket.gameServer
     *
     * Reference to the game server in which the socket is created.
     *
     * @see GameServer
     */
    this.gameServer = gameServer;

    /**
     * ### Socket.sio
     *
     * Reference to the Socket.IO app of the game server
     *
     * @see GameServer
     */
    this.sio = this.gameServer.sio;

    /**
     * ### SocketIo.channel
     *
     * The Socket.IO internal channel
     *
     * Notice: do not confound with ServerChannel
     * TODO: rename.
     */
    this.channel = null;

    /**
     * ### SocketIo.sidPrefix
     *
     * The prefix to be added to the id of every client connected to the socket
     *
     * Must have exactly 2 characters and be unique for every socket.
     */
    this.sidPrefix = this.gameServer.ADMIN_SERVER ? 'SA' : 'SP';

    /**
     * ### SocketIo.messagingQueue
     *
     * Messaging Queue to handle reliable transfer of messages.
     *
     * @type {MessagingQueue}
     */
    this.messagingQueue = new ngc.MessagingQueue();
}


// ## SocketIo methods

/**
 * ### SocketIo.attachListeners
 *
 * Activates the socket to accepts incoming connections
 */
SocketIo.prototype.attachListeners = function() {
    var that = this;
    this.channel = this.sio.of(this.gameServer.endpoint).on('connection',
        function(socket) {
            var res, prefixedSid;
            var startingRoom, clientType;
            var gameMsg;

//            console.log('hello!', socket.handshake.decoded_token.name);


            prefixedSid = that.sidPrefix + socket.id;

            if (that.gameServer.options.sioQuery && socket.handshake.query) {
                startingRoom = socket.handshake.query.startingRoom;
                clientType = socket.handshake.query.clientType;

                // Cleanup clientType (sometimes browsers add quotes).
                if (clientType &&
                    ((clientType.charAt(0) === '"' &&
                     clientType.charAt(clientType.length-1) === '"') ||
                    (clientType.charAt(0) === "'" &&
                     clientType.charAt(clientType.length-1) === "'"))) {

                    clientType = clientType.substr(1,clientType.length -2);
                }
            }

            // Add information about the IP in the headers.
            // This might change in different versions of Socket.IO
            socket.handshake.headers.address = socket.handshake.address;

            res = that.gameServer.onConnect(prefixedSid, that,
                socket.handshake.headers, clientType, startingRoom);

            if (res) {
                socket.on('message', function(msg) {
                    try {
                        var obj = JSON.parse(msg);
                        gameMsg = ngc.GameMsg.clone(obj);
                        that.gameServer.msgLogger.log(gameMsg);

                    }
                    catch(e) {
                        that.gameServer.sysLogger.log(
                            'SocketIo: malformed msg received: ' + e,
                            'error');
                        return false;
                    }

                    if (gameMsg.target === ngc.constants.target.ACK) {
                        console.log("Received ACK for " + gameMsg.text);
                        that.messagingQueue
                            .deleteMessageWithInterval(gameMsg.text);
                        return true;
                    }
                    else if (gameMsg.reliable) {
                        var ack = that.gameServer.msg.create({
                            target: ngc.constants.target.ACK,
                            text: gameMsg.id,
                        });

                        that.gameServer.socketManager.send2client(
                            ack, gameMsg.from);
                        console.log('Sent ACK for ' + gameMsg.id);
                    }

                    that.gameServer.onMessage(gameMsg);
                });
                socket.on('disconnect', function() {
                    that.gameServer.onDisconnect(prefixedSid, socket);
                });
            }
        });

    this.sio.sockets.on("shutdown", that.gameServer.onShutdown);
};

/**
 * ### SocketIo.disconnect
 *
 * Disconnects the client registered under the specified socket id
 *
 * @param {string} sid The socket id of the client to disconnect
 */
SocketIo.prototype.disconnect = function(sid) {
    var socket, strippedSid;
    // Remove socket name from sid (exactly 2 characters, see constructor):
    strippedSid = sid.slice(2);

    // Ste: was.
    //socket = this.sio.sockets.sockets[strippedSid];
    socket = this.sio.sockets.connected[strippedSid];

    if (!socket) {
        throw new Error('SocketIo.disconnect: ' +
                        'socket not found for sid "' + sid + '".');
    }

    socket.disconnect(true);
    // This is already triggered by the method above.
    // this.gameServer.onDisconnect(sid, socket);
};

/**
 * ### SocketIo.send
 *
 * Sends a game message to the client registered under the specified socket id
 *
 * The _to_ field of the game message is usually different from the _sid_ and
 * it is not used to locate the client.
 *
 * @param {GameMsg} gameMsg The game message
 * @param {string} sid The socket id of the receiver
 * @param {boolean} broadcast If TRUE, the message will not be sent to
 *   the client with sid = sid. Default: FALSE
 * @return {boolean} TRUE, on success
 */
SocketIo.prototype.send = function(gameMsg, sid, broadcast) {
    var msg, client, rel, strippedSid, clientSid, that;
    var sysLogger, msgLogger;
    that = this;

    if (sid === 'SERVER' || sid === null) {
        sysLogger.log('SocketIo.send: Trying to send msg to ' +
                      'nobody: ' + sid, 'error');
        return false;
    }

    broadcast = broadcast || false;

    sysLogger = this.gameServer.sysLogger;
    msgLogger = this.gameServer.msgLogger;

    if (sid === 'ALL' && broadcast) {
        sysLogger.log('SocketIo.send: Incompatible options: broadcast = true ' +
                      'and sid = ALL', 'error');
        return false;
    }

    // Cleanup msg, if necessary.
    if (gameMsg._to) {
        if (!gameMsg._originalTo) {
            sysLogger.log('SocketIo.send: _to field found, but no _originalTo ',
                          'error');
            return false;
        }
        gameMsg.to = gameMsg._orginalTo;
        delete gameMsg._to;
        delete gameMsg._originalTo;
    }

    if (gameMsg._sid) delete gameMsg._sid;
    if (gameMsg._channelName) delete gameMsg._channelName;
    if (gameMsg._roomName) delete gameMsg._roomName;

    rel = gameMsg.reliable;
    msg = gameMsg.stringify();

    if (msg.indexOf('PCONNECT') !== -1) {
        console.log(msg);
    }

    // Send to ALL.
    if (sid === 'ALL') {
        if (rel) {
            if (gameMsg.target !== ngc.constants.target.ACK) {
                this.messagingQueue.addMessageWithInterval(
                    gameMsg,
                    function() {
                        that.channel.json.send(msg);
                    },
                    that.gameServer.servernode.reliableRetryInterval
                );
            }
        }

        this.channel.json.send(msg);
        sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to ALL');
        msgLogger.log(gameMsg);
    }

    // Either send to a specific client(1), or to ALL but a specific client(2).
    else {
        // Remove socket name from sid (exactly 2 characters, see constructor):
        strippedSid = sid.slice(2);

        // (1)
        if (!broadcast) {

            // Ste: Was:
            // client = this.channel.sockets[strippedSid];

            // Ste: Now:
            client = this.channel.connected[strippedSid];


            if (!client) {
                sysLogger.log('SocketIo.send: msg not sent. Unexisting ' +
                              'recipient sid: ' + strippedSid, 'error');
                return false;
            }

            if (rel) {
                if (gameMsg.target !== ngc.constants.target.ACK) {
                    this.messagingQueue.addMessageWithInterval(
                        gameMsg,
                        function () {
                            client.json.send(msg);
                        },
                        that.gameServer.servernode.reliableRetryInterval
                    );
                }

            }

            client.json.send(msg);
            sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to sid ' +
                          strippedSid);
            msgLogger.log(gameMsg);

        }
        // (2)
        else {

            // Ste: was.
//             for (clientSid in this.channel.sockets) {
//                 if (strippedSid === clientSid) continue;
//
//                 client = this.channel.sockets[clientSid];

            for (clientSid in this.channel.connected) {
                if (strippedSid === clientSid) continue;

                client = this.channel.connected[clientSid];


                if (rel) {
                    if (gameMsg.target !== ngc.constants.target.ACK) {
                        this.messagingQueue.addMessageWithInterval(
                            gameMsg,
                            function() {
                                client.json.send(msg);
                            },
                            that.gameServer.servernode.reliableRetryInterval
                        );
                    }
                }

                client.json.send(msg);
                sysLogger.log('Msg ' + gameMsg.toSMS() + ' sent to sid ' +
                              clientSid);
                msgLogger.log(gameMsg);
            }
        }
    }
    return true;
};
