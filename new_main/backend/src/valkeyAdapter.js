/**
 * valkeyAdapter.js — Valkey (Redis-compatible) connection manager.
 *
 * Responsibilities:
 *   1. Manage a persistent connection to Valkey with 15-second retry on failure.
 *   2. Attach the @socket.io/redis-adapter (Pub/Sub) to the Socket.IO server
 *      so that io.to(room).emit() broadcasts reach all Cloud Run instances.
 *   3. Expose a publish/subscribe API for application-level state synchronization
 *      (used by valkeySync.js).
 *   4. Gracefully degrade: if Valkey is unreachable, the server works exactly
 *      as a standalone single-instance server (all sync calls become no-ops).
 */

'use strict';

const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const logger = require('./utils/logger');

const VALKEY_HOST = process.env.VALKEY_HOST || '127.0.0.1';
const VALKEY_PORT = process.env.VALKEY_PORT || '6379';
const VALKEY_ENABLED = (process.env.VALKEY_ENABLED || 'true').toLowerCase() !== 'false';
const RETRY_INTERVAL_MS = 15000;

let client = null;         // Main redis client (pub + general commands)
let connected = false;
let io = null;             // Socket.IO server reference
let adapterAttached = false;
const subscriptions = new Map(); // channel → Set<callback>
let subClient = null;      // Dedicated subscriber client

/**
 * Initialize the Valkey adapter.  Call once after the Socket.IO server is created.
 *
 * @param {import('socket.io').Server} ioServer
 */
async function init(ioServer) {
    io = ioServer;
    if (!VALKEY_ENABLED) {
        logger.info('Valkey', 'Valkey disabled via VALKEY_ENABLED=false — running in single-instance mode.');
        return;
    }
    _tryConnect();
}

/** @returns {boolean} Whether Valkey is currently connected. */
function isConnected() {
    return connected;
}

/** @returns {import('redis').RedisClientType | null} The raw redis client, or null. */
function getClient() {
    return connected ? client : null;
}

/**
 * Publish a message to a Valkey channel.  No-op if disconnected.
 *
 * @param {string} channel
 * @param {string} message  JSON string
 */
async function publish(channel, message) {
    if (!connected || !client) return;
    try {
        await client.publish(channel, message);
    } catch (e) {
        logger.warn('Valkey', `Publish failed on ${channel}:`, e.message);
    }
}

/**
 * Subscribe to a Valkey channel.  The callback is (re-)registered automatically
 * on reconnect.  No-op if disconnected (will subscribe when connection is established).
 *
 * @param {string} channel
 * @param {(message: string) => void} callback
 */
function subscribe(channel, callback) {
    if (!subscriptions.has(channel)) {
        subscriptions.set(channel, new Set());
    }
    subscriptions.get(channel).add(callback);

    // If already connected, subscribe immediately on the sub client
    if (connected && subClient) {
        _subscribeChannel(channel).catch(() => {});
    }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function _tryConnect() {
    const url = `redis://${VALKEY_HOST}:${VALKEY_PORT}`;
    logger.info('Valkey', `Attempting connection to ${url} …`);

    try {
        // Main client for PUBLISH + general commands (SET, GET, etc.)
        client = createClient({
            url,
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: false,  // we handle retries ourselves
            },
        });
        client.on('error', _onError);

        // Dedicated subscriber client (Redis requires a separate connection for SUBSCRIBE)
        subClient = createClient({
            url,
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: false,
            },
        });
        subClient.on('error', _onError);

        await client.connect();
        await subClient.connect();

        connected = true;
        logger.info('Valkey', `Connected to ${url}`);

        // Attach Socket.IO Pub/Sub adapter (once)
        // The adapter needs its own dedicated subscriber client, separate from
        // our subClient which is used for nd6:sync app-level pub/sub.
        if (io && !adapterAttached) {
            const adapterSubClient = client.duplicate();
            await adapterSubClient.connect();
            io.adapter(createAdapter(client, adapterSubClient));
            adapterAttached = true;
            logger.info('Valkey', 'Socket.IO Pub/Sub adapter attached.');
        }

        // (Re-)subscribe to all registered channels
        for (const channel of subscriptions.keys()) {
            await _subscribeChannel(channel);
        }

    } catch (e) {
        connected = false;
        logger.warn('Valkey', `Connection failed (${e.message}), retrying in ${RETRY_INTERVAL_MS / 1000}s…`);
        _cleanupClients();
        setTimeout(_tryConnect, RETRY_INTERVAL_MS);
    }
}

async function _subscribeChannel(channel) {
    if (!subClient || !connected) return;
    try {
        await subClient.subscribe(channel, (message) => {
            const cbs = subscriptions.get(channel);
            if (cbs) {
                for (const cb of cbs) {
                    try { cb(message); } catch (e) {
                        logger.error('Valkey', `Subscriber callback error on ${channel}:`, e.message);
                    }
                }
            }
        });
    } catch (e) {
        logger.warn('Valkey', `Subscribe to ${channel} failed:`, e.message);
    }
}

function _onError(err) {
    if (connected) {
        logger.warn('Valkey', `Connection lost: ${err.message}. Retrying in ${RETRY_INTERVAL_MS / 1000}s…`);
        connected = false;
        _cleanupClients();
        setTimeout(_tryConnect, RETRY_INTERVAL_MS);
    }
    // If not connected, we're already in a retry loop — ignore duplicate errors
}

function _cleanupClients() {
    try { client?.quit().catch(() => {}); } catch (_) {}
    try { subClient?.quit().catch(() => {}); } catch (_) {}
    client = null;
    subClient = null;
    // Don't reset adapterAttached — Socket.IO adapter persists even if the underlying
    // redis connection drops; the streams adapter handles reconnection internally.
}

module.exports = {
    init,
    isConnected,
    getClient,
    publish,
    subscribe,
};
