/**
 * # PageManager
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Handles caching, and templating options for each game
 */

"use strict";

module.exports = PageManager;

var games = {};

/**
 * ## PageManager constructor
 *
 * Constructs a new instance of PageManager
 */
function PageManager() {

    // Testing.
    this.games = games;

    // Adding servernode resources caching.
    this.addGame('/');
}

// ## PageManager methods

/**
 * ### PageManager.addGame
 *
 * Setup an empty data structure for holding game info
 *
 * @param {string} gameName The name of the game as it appears in http requests
 */
PageManager.prototype.addGame = function(gameName) {
    if ('string' !== typeof gameName) {
        throw new Error('PageManager.addGame: gameName must be string.');
    }
    games[gameName] = {
        cachePublic: {},
        cacheTemplate: {},
        cacheContext: {},
        contextCallbacks: {}
    };
};

/**
 * ### PageManager.createAlias
 *
 * Creates an alias for a cached game.
 *
 * @param {string} alias The name of the alias
 * @param {string} gameName The name of the game
 */
PageManager.prototype.createAlias = function(alias, gameName) {
    if ('string' !== typeof alias) {
        throw new TypeError('PageManager.createAlias: alias must be string.');
    }
    if ('string' !== typeof gameName) {
        throw new TypeError('PageManager.createAlias: ' +
                            'gameName must be string.');
    }
    if (!games[gameName]) {
        throw new Error('PageManager.createAlias: ' +
                        'game not found: ' + gameName + '.');
    }
    games[alias] = games[gameName];
};

/**
 * ### PageManager.inPublic
 *
 * Sets/Gets whether a file was previously found in `/public/`
 *
 * If `found` is specified, it stores the value.
 * Else returns the value, TRUE if previously found, FALSE, otherwise.
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/public/`
 * @param {boolean|undefined} found The state
 *
 * @return {boolean|undefined} TRUE, if previously found, FALSE, if not found,
 *   undefined if no previous record was set
 */
PageManager.prototype.inPublic = function(gameName, path, found) {
    if ('undefined' === typeof found) return games[gameName].cachePublic[path];
    games[gameName].cachePublic[path] = found;
    return found;
};

/**
 * ### PageManager.inTemplates
 *
 * Sets/Gets whether a file was previously found in `/public/`
 *
 * If `found` is specified, it stores the value.
 * Else returns the value, TRUE if previously found, FALSE, otherwise.
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/public/`
 * @param {boolean|undefined} found The state
 *
 * @return {boolean|undefined} TRUE, if previously found, FALSE, if not found,
 *   undefined if no previous record was set
 */
PageManager.prototype.inTemplates = function(gameName, path, found) {
    if ('undefined' === typeof found) {
        return games[gameName].cacheTemplate[path];
    }
    games[gameName].cacheTemplate[path] = found;
    return found;
};

/**
 * ### PageManager.cacheContext
 *
 * Stores in memory a copy of a fully instantiated context object
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/views/templates/`
 * @param {object} context The context object
 *
 * @see PageManager.getContext
 */
PageManager.prototype.cacheContext = function(gameName, path, context) {
    games[gameName].cacheContext[path] = context;
};

/**
 * ### PageManager.cacheContextCallback
 *
 * Stores in memory a copy of a context callback
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} path The path to the file in `/views/contexts/`
 * @param {function} cb The context callback
 */
PageManager.prototype.cacheContextCallback = function(gameName, path, cb) {
    games[gameName].contextCallbacks[path] = cb;
};

/**
 * ### PageManager.getContext
 *
 * Returns a context object instantiated from a context callback
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} contextPath The path to the file in `/views/contexts/`
 * @param {object} gameSettings Game settings to pass to the context callback
 * @param {object} headers Headers of the connection to pass to the
 *   context callback
 *
 * @return {object} context The fully instantiated context object
 */
PageManager.prototype.getContext = function(gameName, contextPath,
                                            gameSettings, headers) {
    var context, cb;
    if (!games[gameName]) return null;
    cb = games[gameName].contextCallbacks[contextPath];
    if (!cb) return null;
    context = cb(gameSettings, headers);
    return context;
};

/**
 * ### PageManager.getSandBox
 *
 * Returns a object containing only safe methods
 *
 * Useful when you need to give game developer access to the page manager,
 * and you need to maintain game separation.
 *
 * No type-checking for increasing speed.
 *
 * @param {string} gameName The name of the game
 * @param {string} gamePath The path to game directory
 *
 * @return {object} A sandboxed version of the page manager
 */
PageManager.prototype.getSandBox = function(gameName, gamePath) {
    var sb = {};
    sb.modifyContext = function(contextPath, cb) {
        var context, cb, fullPath;
        if ('string' !== typeof contextPath) {
            throw new TypeError('PageManager.modifyContext: contextPath ' +
                                'must be string.');
        }
        if ('function' !== typeof cb) {
            throw new TypeError('PageManager.modifyContext: cb must be ' +
                                'function.');
        }
        fullPath = gamePath + 'views/contexts/' + contextPath;
        games[gameName].contextCallbacks[fullPath] = cb;
    };
    return sb;
};
