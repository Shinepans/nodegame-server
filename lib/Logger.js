/**
 * # Logger
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Handles the log stream to file and to stdout
 */

"use strict";

// ## Global scope

var util = require('util'),
fs = require('fs'),
path = require('path'),
winston = require('winston');

var J = require('JSUS').JSUS;

module.exports = LoggerManager;

function LoggerManager() {}

LoggerManager.get = function(logger, options) {
    return new Logger(logger, options);
};

/**
 * ## Logger constructor
 *
 * Creates an instance of Logger
 *
 * @param {object} options The configuration options for the SeverLog
 */
function Logger(logger, options) {
    options = options || {};

    this.logger = winston.loggers.get(logger);

    this.name = options.name;
    this.level = options.level || 'silly';
    this.verbosity = options.verbosity || 0;
}

//## Logger methods


/**
 * ### Logger.log
 *
 * Logs a string to stdout and / or to file depending on configuration
 *
 * @param {string} text The string to log
 * @param {string|Number} level The log level for this log
 * @param {object} meta Additional meta-data written to be written
 */
Logger.prototype.log = function(text, level, meta) {
    level = level || 'info';
    meta = meta || {};

    if (this.name) {
        meta.name = this.name;
    }

    this.logger.log(level, text, meta);
};
