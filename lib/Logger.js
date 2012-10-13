/**
 * # ServerLog
 * 
 * Copyright(c) 2012 Stefano Balietti
 * MIT Licensed
 *
 * Handles the log stream to file and to stdout
 * 
 * ---
 * 
 */
 
// ## Global scope

var util = require('util'),
	fs = require('fs'),
	path = require('path'),
	winston = require('winston');

var J = require('nodegame-client').JSUS;

ServerLog.verbosity_levels = require('nodegame-client').verbosity_levels;

//console.log(ServerLog.verbosity_levels);

module.exports = ServerLog;

var defaultLogDir = __dirname + './../log';

/**
 * ## ServerLog constructor
 * 
 * Creates an instance of ServerLog
 * 
 * @param {object} options The configuration options for the SeverLog
 */
function Logger (options) {
	
	this.name = options.name;
	this.level = options.level || 'silly';
	
	this.verbosity = options.verbosity;
	
	this.logger = winston.loggers.get(options.logger);
};


//## ServerLog methods



/**
 * ### ServerLog.log
 * 
 * Logs a string to stdout and to file, depending on
 * the current log-level and the  configuration options 
 * for the current ServerLog instance
 * 
 * @param {string} text The string to log
 * @param {string|Number} level The log level for this log 
 * 
 */
ServerLog.prototype.log = function (text, level) {
	
	level = level || 0;
	
	if ('string' === typeof level) {
		level = ServerLog.verbosity_levels[level];
	}
	
	this.logger.log(level, this.name, text);
	
	if (this.verbosity > level) 
};




///**
//* ### ServerLog.checkLogDir
//* 
//* Creates the log directory if not existing
//* 
//*/
//ServerLog.prototype.checkLogDir = function() {
//	// skip warning for node 8
//	if ('undefined' !== typeof fs.existsSync) {
//		if (!fs.existsSync(this.logdir)) {
//			fs.mkdirSync(this.logdir, 0755);
//		}
//	}
//	else if (!path.existsSync(this.logdir)) {
//		fs.mkdirSync(this.logdir, 0755);
//	}
//};


///**
//* ### ServerLog.console
//* 
//* Fancifies the output to console
//* 
//* @param {object|string} data The text to log
//* @param {string} type A flag that determines the color of the output
//*/
//ServerLog.prototype.console = function(data, type){
//	
//	var ATT = '0;32m'; // green text;
//	
//	switch (type) {
//		
//		case 'ERR':
//			ATT = '0;31m'; // red text;
//			break;
//			
//		case 'WARN':
//			ATT = '0;37m'; // gray text;
//			break;
//	}
//		
//	util.log("\033[" + ATT + this.name + '\t' + data.toString() + "\033[0m");
//};
//
///**
// * ### ServerLog.close
// * 
// * Closes open output streams
// */
//ServerLog.prototype.close = function() {
//	if (this.logSysStream) this.logSysStream.close();
//	if (this.logMsgStream) this.logMsgStream.close();
//};