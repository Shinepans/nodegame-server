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
    var options = {
        update: {
            indexes: true
        }
    };

    this.queue = new NDDB(options);
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

    // Non strict equality checking is used to trigger errors on both 'null' and
    // 'undefined' (http://contribute.jquery.org/style-guide/js/#type-checks).
    if (message.id == null) {
        throw new TypeError("MessagingQueue.addMessage: " +
        "message must have an 'id' property.");
    }

    if (message.to == null) {
        throw new TypeError("MessagingQueue.addMessage: " +
        "message must have a 'to' property.");
    }

    if (message.created == null) {
        throw new TypeError("MessagingQueue.addMessage: " +
        "message must have a 'created' property.");
    }

    this.queue.insert(message);
}

MessagingQueue.prototype.deleteMessageById = function(messageId) {
    this.queue['msgIdIdx'].remove(messageId);
}

MessagingQueue.prototype.getAllMessagesForClient = function(clientId) {
    return this.queue.selexec('to', '=', clientId).fetch();
}