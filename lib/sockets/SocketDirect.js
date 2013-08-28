/**
 * # SocketDirect
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 * 
 * Handles direct connection by shared object
 * 
 * ---
 * 
 */

// Global scope

module.exports = SocketDirect;

var gsc = require('nodegame-client');

var GameMsg = gsc.GameMsg,
    J = gsc.JSUS;


  
/**
 * ## SocketDirect constructor
 * 
 * Creates an instance of SocketDirect
 * 
 * @param {GameServer} server A GameServer instance
 */
function SocketDirect(game_server) {
    this.game_server = game_server;
    this.clients = {};
}

SocketDirect.prototype.generateID = function() {
    return J.uniqueKey(this.clients);
};

//## METHODS

SocketDirect.prototype.connect = function(client) {	
    var id, res;
    debugger;
    id = this.generateID();
    
    // add it temporarily
    this.clients[id] = client;
    res = this.game_server.onConnect(id, this);
    if (!res) {
        delete this.clients[id];
    }
};

SocketDirect.prototype.message = function(msg) {
    this.game_server.onMessage(msg);
};

SocketDirect.prototype.disconnect = function(client) {
    delete this.clients[client];
};


SocketDirect.prototype.attachListeners = function() {};


SocketDirect.prototype.send = function(msg) {
    
    var to = msg.to,
        rel = msg.reliable.
        gameMsg, client;
		

    if (to === 'SERVER' || to === null) {
	this.game_server.sysLogger.log('Trying to send msg to nobody: ' + to, 'ERR');
	return false;
    }
	
    try {
	gameMsg = JSON.stringify(msg);
    }
    catch(e) {
	this.game_server.sysLogger.log('An error has occurred. Cannot send message: ' + msg);
	return false;
    }
		
    // Broadcast
    if (to === 'ALL') {
	
	for (client in this.clients) {
	    if (this.clients.hasOwnProperty(client)) {
		// no self-send 
		if (client !== msg.from) {
		    this.clients[client].message(gameMsg);
		}
		
	    }
	}
	
	this.game_server.sysLogger.log('Msg ' + msg.toSMS() + ' broadcasted to ' + to);
	this.game_server.msgLogger.log('B', msg);
    }
    // Send to a specific client
    else {
	client = this.clients[to]; 
	
	if (client) {
	    
	    client.message(gameMsg);
	    
	    this.game_server.sysLogger.log('Msg ' + msg.toSMS() + ' sent to ' + to);
	    this.game_server.msgLogger.log('S', msg);
	}
	else {
	    this.game_server.sysLogger.log('msg not sent. Unexisting recipient: ' + to, 'ERR');
	    return false;
	}
    }
    return true;
};

