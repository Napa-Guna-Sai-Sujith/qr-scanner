import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  createSignedQrToken,
  verifySignedQrToken,
  safeCompare,
  hashSha256,
} from '../src/services/cryptoService.js';

describe('1. Cryptographic Primitives & HMAC Token Integrity', () => {
  it('should generate valid HMAC signature and verify successfully', () => {
    const requestId = '11111111-2222-3333-4444-555555555555';
    const nonce = 'abcdef0123456789abcdef0123456789';
    const signedToken = createSignedQrToken(requestId, nonce);

    const verified = verifySignedQrToken(signedToken);
    expect(verified.valid).toBe(true);
    expect(verified.requestId).toBe(requestId);
    expect(verified.nonce).toBe(nonce);
  });

  it('should detect and reject tampered token payloads (integrity protection)', () => {
    const requestId = '11111111-2222-3333-4444-555555555555';
    const nonce = 'abcdef0123456789abcdef0123456789';
    const signedToken = createSignedQrToken(requestId, nonce);

    // Tamper with nonce
    const tampered = signedToken.replace(nonce, 'badbeef0123456789abcdef0123456789');
    const result = verifySignedQrToken(tampered);
    expect(result.valid).toBe(false);
  });

  it('should perform constant-time comparisons safely', () => {
    const hash1 = hashSha256('secret1');
    const hash2 = hashSha256('secret1');
    const hash3 = hashSha256('secret2');

    expect(safeCompare(hash1, hash2)).toBe(true);
    expect(safeCompare(hash1, hash3)).toBe(false);
  });
});

describe('2. User Registration & Password Authentication API', () => {
  const uniqueEmail = `test_${Date.now()}@security.edu`;

  it('should successfully register a new user with strong password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Dr. Alan Turing',
        email: uniqueEmail,
        password: 'SecurePassword@2026',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(uniqueEmail);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject registration if email is duplicate', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Duplicate Alan',
        email: uniqueEmail,
        password: 'SecurePassword@2026',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid password format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Weak Password User',
        email: `weak_${Date.now()}@security.edu`,
        password: 'short',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should successfully log in with seeded account (alice@security.edu)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@security.edu',
        password: 'Password@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('alice@security.edu');
  });

  it('should reject incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@security.edu',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('3. QR Authentication Challenge Lifecycle & Atomic Single-Use', () => {
  let qrChallenge;
  let approverSessionCookie;

  it('should authenticate approver device (alice) to acquire session cookie', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@security.edu',
        password: 'Password@123',
      });

    expect(loginRes.status).toBe(200);
    approverSessionCookie = loginRes.headers['set-cookie'];
  });

  it('should initiate a new QR authentication challenge with signed token & data URL', async () => {
    const res = await request(app)
      .post('/api/auth/qr/initiate')
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.requestId).toBeDefined();
    expect(res.body.qrToken).toBeDefined();
    expect(res.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(res.body.ttlSeconds).toBeGreaterThan(0);

    qrChallenge = res.body;
  });

  it('should poll challenge status as pending', async () => {
    const res = await request(app).get(`/api/auth/qr/${qrChallenge.requestId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
  });

  it('should reject unauthenticated attempt to approve QR challenge', async () => {
    const res = await request(app)
      .post('/api/auth/qr/approve')
      .send({
        token: qrChallenge.qrToken,
      });

    expect(res.status).toBe(401);
  });

  it('should allow authenticated device (alice) to approve the challenge', async () => {
    const res = await request(app)
      .post('/api/auth/qr/approve')
      .set('Cookie', approverSessionCookie)
      .send({
        token: qrChallenge.qrToken,
        deviceName: 'Alice Google Pixel 9 Pro',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reflect approved status upon polling', async () => {
    const res = await request(app).get(`/api/auth/qr/${qrChallenge.requestId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('should atomically complete the QR login on browser A and establish session', async () => {
    const res = await request(app)
      .post('/api/auth/qr/complete')
      .send({
        requestId: qrChallenge.requestId,
        token: qrChallenge.qrToken,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('alice@security.edu');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('REPLAY ATTACK PREVENTION: should reject secondary completion attempt for the same token', async () => {
    const res = await request(app)
      .post('/api/auth/qr/complete')
      .send({
        requestId: qrChallenge.requestId,
        token: qrChallenge.qrToken,
      });

    expect(res.status).toBe(409); // Conflict / Replay prevented
    expect(res.body.success).toBe(false);
  });
});
