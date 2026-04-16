const { generateGuestId } = require('../src/utils/auth');
const jwt = require('jsonwebtoken');

describe('Authentication Utilities', () => {
    test('generateGuestId returns a string starting with guest_', () => {
        const id = generateGuestId();
        expect(id).toMatch(/^guest_/);
    });

    test('generateGuestId returns unique IDs', () => {
        const id1 = generateGuestId();
        const id2 = generateGuestId();
        expect(id1).not.toBe(id2);
    });

    test('JWT signing and verification', () => {
        const secret = 'test-secret';
        const payload = { userId: '123' };
        const token = jwt.sign(payload, secret);
        const decoded = jwt.verify(token, secret);
        expect(decoded.userId).toBe('123');
    });

    test('JWT verification fails with wrong secret', () => {
        const secret = 'test-secret';
        const token = jwt.sign({ userId: '123' }, secret);
        expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
    });

    test('JWT signing with expiration', () => {
        const secret = 'test-secret';
        const token = jwt.sign({ userId: '123' }, secret, { expiresIn: '1h' });
        const decoded = jwt.verify(token, secret);
        expect(decoded.exp).toBeDefined();
    });

    test('JWT verification fails for expired token', (done) => {
        const secret = 'test-secret';
        const token = jwt.sign({ userId: '123' }, secret, { expiresIn: '1ms' });
        setTimeout(() => {
            expect(() => jwt.verify(token, secret)).toThrow();
            done();
        }, 10);
    });

    test('Guest ID is sufficiently random', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
            ids.add(generateGuestId());
        }
        expect(ids.size).toBe(100);
    });

    test('JWT payload preserves object structure', () => {
        const secret = 'test-secret';
        const payload = { userId: '123', roles: ['user', 'admin'] };
        const token = jwt.sign(payload, secret);
        const decoded = jwt.verify(token, secret);
        expect(decoded.roles).toEqual(['user', 'admin']);
    });

    test('JWT verification returns object with iat', () => {
        const secret = 'test-secret';
        const token = jwt.sign({ userId: '123' }, secret);
        const decoded = jwt.verify(token, secret);
        expect(decoded.iat).toBeDefined();
    });

    test('JWT verification of malformed token throws', () => {
        expect(() => jwt.verify('not-a-token', 'secret')).toThrow();
    });
});
