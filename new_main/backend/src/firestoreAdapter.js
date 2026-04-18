/**
 * firestoreAdapter.js — Firestore connection manager.
 *
 * Responsibilities:
 *   1. Manage a persistent connection to Firestore with 15-second retry on failure.
 *   2. Expose isConnected() and getDb() for use by other modules.
 *   3. On startup, verify connectivity by performing a health-check read.
 *   4. Locally: connects to the Firestore emulator (FIRESTORE_EMULATOR_HOST).
 *      GCP: uses default credentials (auto-detected by the SDK).
 *   5. Gracefully degrade: if Firestore is unreachable, the website still serves
 *      (game engine works in memory), but auth/storage operations fail gracefully.
 */

'use strict';

const { Firestore } = require('@google-cloud/firestore');
const logger = require('./utils/logger');

const FIRESTORE_PROJECT_ID = process.env.FIRESTORE_PROJECT_ID || 'my-local-firestore';
const RETRY_INTERVAL_MS = 15000;

let db = null;          // Firestore instance
let connected = false;
let _initResolve = null; // resolve function for the init() promise

/**
 * Initialize the Firestore adapter. Call once at startup.
 * Returns a promise that resolves once the first successful connection is made,
 * or after a configurable timeout (so the server can start even if Firestore is down).
 */
function init() {
    return new Promise((resolve) => {
        _initResolve = resolve;
        _tryConnect();
        // Don't block startup forever — resolve after 20s even if not connected
        setTimeout(() => {
            if (!connected) {
                logger.warn('Firestore', 'Initial connection timed out — server starting without Firestore.');
                resolve();
            }
        }, 20000);
    });
}

/** @returns {boolean} Whether Firestore is currently connected. */
function isConnected() {
    return connected;
}

/** @returns {Firestore|null} The Firestore database instance, or null if not connected. */
function getDb() {
    return connected ? db : null;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function _tryConnect() {
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    const projectId = FIRESTORE_PROJECT_ID;

    logger.info('Firestore', `Attempting connection (project=${projectId}${emulatorHost ? `, emulator=${emulatorHost}` : ', GCP default credentials'}) …`);

    try {
        // Create a new Firestore instance
        const options = { projectId };

        // When FIRESTORE_EMULATOR_HOST is set, the SDK auto-connects to the emulator.
        // No additional config is needed; the env var is read internally by the SDK.

        db = new Firestore(options);

        // Health check: try to list collections (lightweight read)
        await db.listCollections();

        connected = true;
        logger.info('Firestore', `Connected successfully (project=${projectId}).`);

        // Ensure required collections exist (Firestore creates collections implicitly
        // on first write, but we seed a sentinel doc to make them visible in the console)
        await _ensureCollections();

        if (_initResolve) {
            _initResolve();
            _initResolve = null;
        }

    } catch (e) {
        connected = false;
        db = null;
        logger.warn('Firestore', `Connection failed (${e.message}), retrying in ${RETRY_INTERVAL_MS / 1000}s…`);
        setTimeout(_tryConnect, RETRY_INTERVAL_MS);
    }
}

/**
 * Ensure required collections exist by reading them.
 * Firestore creates collections implicitly when you write to them,
 * so we just verify we can read.  If a collection doesn't exist yet,
 * we write a placeholder document at `_meta/schema` with version info.
 */
async function _ensureCollections() {
    const requiredCollections = ['users', 'profiles', 'games', 'tournaments', 'tournament_participants'];

    for (const name of requiredCollections) {
        try {
            const metaRef = db.collection(name).doc('_meta');
            const metaDoc = await metaRef.get();
            if (!metaDoc.exists) {
                await metaRef.set({
                    _created_at: Date.now(),
                    _description: `Schema placeholder for ${name} collection`,
                    _version: 1,
                });
                logger.info('Firestore', `Created collection '${name}' with _meta document.`);
            }
        } catch (e) {
            logger.warn('Firestore', `Failed to verify collection '${name}':`, e.message);
        }
    }
}

module.exports = {
    init,
    isConnected,
    getDb,
};
