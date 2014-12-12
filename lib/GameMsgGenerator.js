/**
 * # GameMsgGenerator
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Game messages generator
 */

"use strict";

// ## Global scope

module.exports = GameMsgGenerator;

var node = require('nodegame-client');

var GameStage = node.GameStage,
    GameMsg = node.GameMsg,
    Player = node.Player,
    J = node.JSUS;

var constants = node.constants;

var action = constants.action,
    target = constants.target;

var SAY = action.SAY,
    GET = action.GET,
    SET = action.SET;

/**
 * ## GameMsgGenerator constructor
 *
 * Creates a new instance of GameMsgGenerator
 *
 * @param {GameServer} gameServer A reference to the Game Server where
 *   the generator is instanciated.
 */
function GameMsgGenerator(gameServer) {
    this.session = gameServer.session;
    this.sender = gameServer.name;
    this.reliableMessaging = gameServer.servernode.reliableMessaging;

    this.stage = null;
}

// ## GameMsgGenerator methods

/**
 * ### GameMsgGenerator.create
 *
 * Primitive for creating any type of game-message
 *
 * Merges a set of default settings with the object passed
 * as input parameter.
 *
 * @param {object} msg A stub of game message
 *
 * @return {GameMsg} The newly created message
 */
GameMsgGenerator.prototype.create = function(msg) {
    var priority, reliable;

    priority = ('undefined' !== typeof msg.priority)
        ? msg.priority
        : (msg.target === constants.target.GAMECOMMAND ||
           msg.target === constants.target.REDIRECT ||
           msg.target === constants.target.PCONNECT ||
           msg.target === constants.target.PDISCONNECT ||
           msg.target === constants.target.PRECONNECT ||
           msg.target === constants.target.SETUP);

    reliable = ('undefined' !== typeof msg.reliable) ? msg.reliable : priority;

    return new GameMsg({
        session:
            'undefined' !== typeof msg.session ? msg.session : this.session,
        stage: msg.stage || this.stage,
        action: msg.action || constants.action.SAY,
        target: msg.target || constants.target.DATA,
        from: msg.from || this.sender,
        to: 'undefined' !== typeof msg.to ? msg.to : 'SERVER',
        text: 'undefined' !== typeof msg.text ? "" + msg.text : null,
        data: 'undefined' !== typeof msg.data ? msg.data : null,
        priority: priority,
        reliable: reliable && this.reliableMessaging
    });
};

/**
 * ### GameMsgGenerator.obfuscate
 *
 * Overwrites the session, stage, and from properties
 * of a game message with default settings
 *
 * @param {GameMsg} msg The game message
 *
 * @return {GameMsg} The obfuscated message
 */
GameMsgGenerator.prototype.obfuscate = function(msg) {
    if (!msg) return;
    msg.session = this.session;
    msg.stage = this.stage;
    msg.from = this.sender;
    return msg;
};
