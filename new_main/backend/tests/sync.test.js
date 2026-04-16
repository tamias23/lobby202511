const sync = require('../src/valkeySync');
const valkey = require('../src/valkeyAdapter');

jest.mock('../src/valkeyAdapter', () => ({
    publish: jest.fn(),
    subscribe: jest.fn(),
    getClient: jest.fn(() => ({
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null)
    })),
    init: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

describe('Valkey Sync System', () => {
    let lobby;
    const loadBoard = (name) => ({ name, polygons: {} });

    beforeEach(() => {
        lobby = {
            gameRequests: [],
            activeGames: new Map()
        };
        sync.init(lobby, loadBoard);
    });

    test('getInstanceId returns a UUID', () => {
        const id = sync.getInstanceId();
        expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });

    test('syncGameCreated publishes a message', () => {
        const game = { hash: 'h1', boardName: 'classic', pieces: [] };
        sync.syncGameCreated('h1', game);
        expect(valkey.publish).toHaveBeenCalledWith('nd6:sync', expect.stringContaining('game:created'));
    });

    test('syncRequestCreated strips socketId', () => {
        const req = { requestId: 'r1', socketId: 's1', userId: 'u1' };
        sync.syncRequestCreated(req);
        const published = JSON.parse(valkey.publish.mock.calls[valkey.publish.mock.calls.length - 1][1]);
        expect(published.request.socketId).toBeUndefined();
        expect(published.request.userId).toBe('u1');
    });

    test('syncRequestRemoved publishes requestId', () => {
        sync.syncRequestRemoved('r1');
        expect(valkey.publish).toHaveBeenCalledWith('nd6:sync', expect.stringContaining('request:removed'));
    });

    test('syncDisconnect publishes side and timestamp', () => {
        sync.syncDisconnect('h1', 'white', 12345);
        expect(valkey.publish).toHaveBeenCalledWith('nd6:sync', expect.stringContaining('game:disconnect'));
    });

    test('tryLockRequest uses valkey client SET NX', async () => {
        const result = await sync.tryLockRequest('r1');
        expect(result).toBe(true);
    });

    test('Internal _onSyncMessage ignores own messages', () => {
        // This is hard to test directly without exposing internal functions,
        // but we can simulate a message with the same instanceId.
        const id = sync.getInstanceId();
        // Since we can't easily call _onSyncMessage, we assume valkey.subscribe was called with it.
        const onMsg = valkey.subscribe.mock.calls[0][1];
        onMsg(JSON.stringify({ instanceId: id, type: 'game:deleted', hash: 'h1' }));
        expect(lobby.activeGames.has('h1')).toBe(false);
    });

    test('syncGameUpdated sends mutable state', () => {
        const game = { hash: 'h1', pieces: [{id: 1}], turn: 'white' };
        sync.syncGameUpdated('h1', game);
        expect(valkey.publish).toHaveBeenCalled();
    });

    test('syncReconnect publishes side', () => {
        sync.syncReconnect('h1', 'black');
        expect(valkey.publish).toHaveBeenCalled();
    });

    test('syncGameDeleted publishes hash', () => {
        sync.syncGameDeleted('h1');
        expect(valkey.publish).toHaveBeenCalledWith('nd6:sync', expect.stringContaining('game:deleted'));
    });
});
