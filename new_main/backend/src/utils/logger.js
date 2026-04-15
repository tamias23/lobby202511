/**
 * logger.js — Thin structured logger for the backend.
 *
 * Levels (controlled by LOG_LEVEL in backend-config.yaml or process.env):
 *   error  (0) — errors only
 *   warn   (1) — errors + warnings
 *   info   (2) — errors + warnings + key lifecycle events  ← default
 *   debug  (3) — everything, including per-move / per-socket events
 *
 * Every line is prefixed with an ISO timestamp and severity so that
 * GCP Cloud Logging can parse and filter it natively:
 *   [2026-04-15T20:18:04.123Z] [INFO]  [Game] Game created: abc123
 *   [2026-04-15T20:18:04.200Z] [DEBUG] [Move] Move applied: rook1 → e4
 *   [2026-04-15T20:18:04.500Z] [ERROR] [GCS]  Sync error: connection refused
 */

'use strict';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

/** Read the effective numeric level from process.env at call time (supports runtime changes). */
function getLevel() {
    const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
    return LEVELS[raw] !== undefined ? LEVELS[raw] : LEVELS.info;
}

function ts() {
    return new Date().toISOString();
}

/** Build the prefix: [timestamp] [LEVEL] [tag] */
function prefix(level, tag) {
    const levelStr = level.toUpperCase().padEnd(5); // e.g. 'INFO ' / 'DEBUG' / 'WARN '
    return `[${ts()}] [${levelStr}] [${tag}]`;
}

const logger = {
    /**
     * Log an error. Always visible regardless of LOG_LEVEL.
     * @param {string} tag   - Module/context label, e.g. 'Game', 'Bot', 'GCS'
     * @param {...*}   args  - Values passed directly to console.error
     */
    error(tag, ...args) {
        // level 0 — always on
        console.error(prefix('error', tag), ...args);
    },

    /**
     * Log a warning. Visible at log levels warn, info, debug.
     */
    warn(tag, ...args) {
        if (getLevel() >= LEVELS.warn) console.warn(prefix('warn', tag), ...args);
    },

    /**
     * Log a key lifecycle event (game created, round started, user connected, …).
     * Visible at log levels info and debug.
     */
    info(tag, ...args) {
        if (getLevel() >= LEVELS.info) console.log(prefix('info', tag), ...args);
    },

    /**
     * Log a verbose/debug event (move applied, socket event received, NAPI output, …).
     * Visible only at log level debug.
     */
    debug(tag, ...args) {
        if (getLevel() >= LEVELS.debug) console.log(prefix('debug', tag), ...args);
    },
};

module.exports = logger;
