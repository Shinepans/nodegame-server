var GameMsg = require('./GameMsg');
var GameState = require('./GameState');

module.exports = GameMsgGenerator; 

function GameMsgGenerator (session,sender,state) {	
	this.session = session;
	this.sender = sender;
	this.state = state;
};

//GameMsgGenerator.prototype.setCurrentState = function (state) {
//	this.currentState = state;
//};
//
//GameMsgGenerator.prototype.getCurrentState = function () {
//	return this.currentState;
//};


// HI
GameMsgGenerator.prototype.createHI = function(text, to, reliable) {

  var rel = reliable || 1;
  
  return new GameMsg( {
            			session: this.session,
            			state: this.state,
            			action: GameMsg.actions.SAY,
            			target: GameMsg.targets.HI,
            			from: this.sender,
            			to: to,
            			text: text,
            			data: to,
            			priority: null,
            			reliable: rel
  });


};
	
//GameMsgGenerator.prototype.createHI = function(text,to,reliable) {
//	
//	var rel = reliable || 1;
//	
//	return new GameMsg(
//						this.session,
//						this.currentState,
//						GameMsg.actions.SAY,
//						GameMsg.targets.HI,
//						this.sender,
//						to,
//						text,
//						to,
//						null,
//						rel // Should be reliable
//						);
//};


// STATE

GameMsgGenerator.prototype.saySTATE = function (plist, to, reliable) {
	return this.createSTATE(GameMsg.SAY, plist, to,reliable);
};

GameMsgGenerator.prototype.setSTATE = function (plist, to, reliable) {
	return this.createSTATE(GameMsg.SET, plist, to,reliable);
};

GameMsgGenerator.prototype.getSTATE = function (plist, to, reliable) {
	return this.createSTATE(GameMsg.GET, plist, to,reliable);
};

GameMsgGenerator.prototype.createSTATE = function (action, state, to, reliable) {
	
	var rel = reliable || 1;
	
	
	return new GameMsg({
						session: this.session,
						state: this.state,
						action: action,
						target: GameMsg.targets.STATE,
						from: this.sender,
						to: to,
						text: 'New State: ' + GameState.stringify(state),
						data: state,
						priority: null,
						reliable: rel
	});
};

//GameMsgGenerator.prototype.saySTATE = function(plist,to,reliable) {
//return this.createSTATE(GameMsg.actions.SAY, plist, to,reliable);
//};
//
//GameMsgGenerator.prototype.setSTATE = function(plist,to,reliable) {
//return this.createSTATE(GameMsg.actions.SET, plist, to,reliable);
//};
//
//GameMsgGenerator.prototype.getSTATE = function(plist,to,reliable) {
//return this.createSTATE(GameMsg.actions.GET, plist, to,reliable);
//};

//GameMsgGenerator.prototype.createSTATE = function(action,state,to,reliable) {
//	
//	var rel = reliable || 1;
//	
//	return new GameMsg(
//						this.session,
//						this.currentState,
//						action,
//						GameMsg.targets.STATE,
//						this.sender,
//						to,
//						'New State: ' + GameState.stringify(state),
//						state,
//						null,
//						rel
//						);
//};


// PLIST

GameMsgGenerator.prototype.sayPLIST = function (plist, to, reliable) {
	return this.createPLIST(GameMsg.actions.SAY, plist, to,reliable);
};

GameMsgGenerator.prototype.setPLIST = function (plist, to, reliable) {
	return this.createPLIST(GameMsg.actions.SET, plist, to,reliable);
};

GameMsgGenerator.prototype.getPLIST = function (plist, to, reliable) {
	return this.createPLIST(GameMsg.actions.GET, plist, to, reliable);
};

GameMsgGenerator.prototype.createPLIST = function (action, plist, to, reliable) {
	
	//console.log('Creating plist msg ' + plist + ' ' + plist.size());
	
	var rel = reliable || 1;
	
	return new GameMsg({
						session: this.session, 
						state: this.state,
						action: action,
						target: GameMsg.targets.PLIST,
						from: this.sender,
						to: to,
						text: 'List of Players: ' + plist.size(),
						data: plist.pl,
						priority: null,
						reliable: rel
	});
};

//GameMsgGenerator.prototype.sayPLIST = function(plist,to,reliable) {
//	return this.createPLIST(GameMsg.actions.SAY, plist, to,reliable);
//};
//
//GameMsgGenerator.prototype.setPLIST = function(plist,to,reliable) {
//	return this.createPLIST(GameMsg.actions.SET, plist, to,reliable);
//};
//
//GameMsgGenerator.prototype.getPLIST = function(plist,to,reliable) {
//	return this.createPLIST(GameMsg.actions.GET, plist, to,reliable);
//};
//
//GameMsgGenerator.prototype.createPLIST = function(target,plist,to,reliable) {
//	
//	//console.log('Creating plist msg ' + plist + ' ' + plist.size());
//	
//	var rel = reliable || 1;
//	
//	return new GameMsg(
//						this.session, 
//						this.currentState,
//						target,
//						GameMsg.targets.PLIST,
//						this.sender,
//						to,
//						'List of Players: ' + plist.size(),
//						plist.pl,
//						null,
//						rel
//						);
//};


// TXT

GameMsgGenerator.prototype.createTXT = function (text, to, reliable) {
	
	//console.log("STE: " + text);
	
	var rel = reliable || 0;
	
	return new GameMsg({
						session: this.session,
						state: this.state,
						action: GameMsg.actions.SAY,
						target: GameMsg.targets.TXT,
						from: this.sender,
						to: to,
						text: text,
						data: null,
						priority: null,
						reliable: rel
	});
	
	
};

//GameMsgGenerator.prototype.createTXT = function(text,to,reliable) {
//	
//	//console.log("STE: " + text);
//	
//	var rel = reliable || 0;
//	
//	return new GameMsg(
//						this.session,
//						this.currentState,
//						GameMsg.actions.SAY,
//						GameMsg.targets.TXT,
//						this.sender,
//						to,
//						text,
//						null,
//						null,
//						rel
//						);
//	
//	
//};


// DATA

GameMsgGenerator.prototype.createDATA = function (data, to, text, reliable) {
	
	var rel = reliable || 1;
	var text = text || 'data';
	
	return new GameMsg({
						session: this.session, 
						state: this.state,
						action: GameMsg.actions.SAY,
						target: GameMsg.targets.DATA,
						from: this.sender,
						to: to,
						text: text,
						data: data,
						priority: null,
						reliable: rel
	});
};

//GameMsgGenerator.prototype.createDATA = function(data, to, text, reliable) {
//	
//	var rel = reliable || 1;
//	var text = text || 'data';
//	
//	return new GameMsg(
//						this.session, 
//						this.currentState,
//						GameMsg.actions.SAY,
//						GameMsg.targets.DATA,
//						this.sender,
//						to,
//						text,
//						data,
//						null,
//						rel
//						);
//};


// ACK

GameMsgGenerator.prototype.createACK = function (gm, to, reliable) {
	
	var rel = reliable || 0;
	
	var newgm = new GameMsg({
							session: this.session, 
							state: this.state,
							action: GameMsg.actions.SAY,
							target: GameMsg.targets.ACK,
							from: this.sender,
							to: to,
							text: 'Msg ' + gm.id + ' correctly received',
							data: gm.id,
							priority: null,
							reliable: rel
	});
	
	if (gm.forward) {
		newgm.forward = 1;
	}
	
	return newgm;
}; 

//GameMsgGenerator.prototype.createACK = function(gm, to, reliable) {
//	
//	var rel = reliable || 0;
//	
//	var newgm = new GameMsg(
//							this.session, 
//							this.currentState,
//							GameMsg.actions.SAY,
//							GameMsg.targets.ACK,
//							this.sender,
//							to,
//							'Msg ' + gm.id + ' correctly received',
//							gm.id,
//							null,
//							rel
//							);
//	
//	if (gm.forward) {
//		newgm.forward = 1;
//	}
//	
//	return newgm;
//};