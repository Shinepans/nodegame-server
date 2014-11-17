/**
 * # MessagingQueue
 * Copyright(c) 2014 Jan Wilken Doerrie
 * MIT Licensed
 *
 * Handles network connections through Socket.IO
 * ---
 */

"use strict";

// Global scope

module.exports = MessagingQueue;

var NDDB = require('NDDB').NDDB;

/**
 * ## MessagingQueue constructor
 *
 * Creates an instance of MessagingQueue
 *
 * @param {GameServer} server A GameServer instance
 *
 * @see GameServer
 */
function MessagingQueue() {
    this.queue = new NDDB();
    this.queue.index('msgIdIdx', function(message) {
        return message.id;
    });

    this.queue.globalCompare = function(o1, o2) {
        var time1 = new Date(o1.created).getTime();
        var time2 = new Date(o2.created).getTime();
        console.log(time1 + ":" + time2);
        return time2 - time1;
    }
}

MessagingQueue.prototype.addMessage = function(message) {
    if (!message || "object" !== typeof message) {
        throw new TypeError('MessagingQueue.addMessage: ' +
        'message must be object.');
    }

    if (!message.id) {
        throw new TypeError('MessagingQueue.addMessage: ' +
        'message must have an \'id\' property.');
    }

    if (!message.to) {
        throw new TypeError('MessagingQueue.addMessage: ' +
        'message must have a \'to\' property.');
    }

    if (!message.created) {
        throw new TypeError('MessagingQueue.addMessage: ' +
        'message must have a \'created\' property.');
    }

    this.queue.insert(message);
}

MessagingQueue.prototype.deleteMessageById = function(messageId) {
    this.queue['msgIdIdx'].remove(messageId);
}

MessagingQueue.prototype.getAllMessagesForClient = function(clientId) {
    return this.queue.selexec('to', '=', clientId).fetch();
}