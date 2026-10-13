import crypto from 'crypto';
import QRCode from 'qrcode';
import { query, withTransaction } from '../config/db.js';
import {
  generateRandomToken,
  hashSha256,
  createSignedQrToken,
  verifySignedQrToken,
} from '../services/cryptoService.js';
import { recordAuditLog } from '../services/auditService.js';
import { config } from '../config/env.js';

/**
 * 1. POST /api/auth/qr/initiate
 * Initiates an unpredictable, cryptographically secured QR authentication request.
 */
export const initiateQrRequest = async (req, res) => {
  const { email } = req.body || {};
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    let targetUserId = null;
    if (email) {
      const userRes = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (userRes.rows.length > 0) {
        targetUserId = userRes.rows[0].id;
      }
    }

    const requestId = crypto.randomUUID();
    const nonce = generateRandomToken(32);
    const tokenHash = hashSha256(nonce);
    const signedToken = createSignedQrToken(requestId, nonce);

    const ttlSeconds = config.qrTokenTtlSeconds;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await query(
      `INSERT INTO auth_requests (id, user_id, request_token_hash, status, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)`,
      [requestId, targetUserId, tokenHash, ipAddress, userAgent, expiresAt]
    );

    // Encode verification URL or raw payload for scanning
    // When scanned by a phone camera, it can point to the web app's approve page
    const scanUrl = `${config.frontendUrl}/qr-approve?token=${encodeURIComponent(signedToken)}`;

    // Generate high-resolution QR Code Data URL
    const qrCodeDataUrl = await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    await recordAuditLog({
      userId: targetUserId,
      eventType: 'QR_INITIATED',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
      details: { requestId, ttlSeconds, expiresAt },
    });

    return res.status(201).json({
      success: true,
      message: 'QR authentication challenge generated successfully',
      requestId,
      qrToken: signedToken,
      qrCodeDataUrl,
      scanUrl,
      expiresAt,
      ttlSeconds,
    });
  } catch (error) {
    console.error('[QR INITIATE ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate QR authentication challenge',
    });
  }
};

/**
 * 2. GET /api/auth/qr/:requestId
 * Polling endpoint for client to check the status of authentication challenge
 */
export const getQrStatus = async (req, res) => {
  const { requestId } = req.params;

  try {
    const requestRes = await query(
      `SELECT id, status, expires_at, approved_at, consumed_at, created_at, user_id
       FROM auth_requests
       WHERE id = $1`,
      [requestId]
    );

    if (requestRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Authentication request not found',
      });
    }

    const authReq = requestRes.rows[0];
    const now = new Date();

    // Check expiration if still pending
    if (authReq.status === 'pending' && new Date(authReq.expires_at) <= now) {
      await query(
        `UPDATE auth_requests SET status = 'expired' WHERE id = $1 AND status = 'pending'`,
        [requestId]
      );
      authReq.status = 'expired';

      await recordAuditLog({
        userId: authReq.user_id,
        eventType: 'QR_EXPIRED',
        result: 'WARNING',
        details: { requestId },
      });
    }

    return res.json({
      success: true,
      requestId: authReq.id,
      status: authReq.status,
      expiresAt: authReq.expires_at,
      approvedAt: authReq.approved_at,
      consumedAt: authReq.consumed_at,
      createdAt: authReq.created_at,
    });
  } catch (error) {
    console.error('[QR STATUS ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve challenge status',
    });
  }
};

/**
 * 3. POST /api/auth/qr/inspect
 * Allows scanning device to inspect request details (IP, timestamp, expiration) before approving
 */
export const inspectQrToken = async (req, res) => {
  const { token } = req.body;

  const verification = verifySignedQrToken(token);
  if (!verification.valid) {
    return res.status(400).json({
      success: false,
      error: verification.error || 'Cryptographic verification of QR token failed',
    });
  }

  const { requestId, nonce } = verification;
  const tokenHash = hashSha256(nonce);

  try {
    const authRes = await query(
      `SELECT r.id, r.status, r.ip_address, r.user_agent, r.created_at, r.expires_at,
              u.email as target_email
       FROM auth_requests r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = $1 AND r.request_token_hash = $2`,
      [requestId, tokenHash]
    );

    if (authRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Authentication request does not exist or has been tampered with',
      });
    }

    const row = authRes.rows[0];
    const isExpired = new Date(row.expires_at) <= new Date();

    return res.json({
      success: true,
      valid: !isExpired && row.status === 'pending',
      requestId: row.id,
      status: isExpired && row.status === 'pending' ? 'expired' : row.status,
      targetEmail: row.target_email || null,
      requestingIp: row.ip_address,
      requestingUserAgent: row.user_agent,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    });
  } catch (error) {
    console.error('[INSPECT QR ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to inspect authentication request',
    });
  }
};

/**
 * 4. POST /api/auth/qr/approve
 * Scanning device explicitly approves the login request.
 * Must be authenticated as a logged-in user!
 */
export const approveQrRequest = async (req, res) => {
  const { token, deviceName = 'Enrolled Mobile Device' } = req.body;
  const approverUserId = req.user.id;
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // 1. Verify HMAC signature on the signed QR token
  const verification = verifySignedQrToken(token);
  if (!verification.valid) {
    await recordAuditLog({
      userId: approverUserId,
      eventType: 'QR_SIGNATURE_INVALID',
      result: 'WARNING',
      ipAddress,
      userAgent,
      details: { error: verification.error },
    });
    return res.status(400).json({
      success: false,
      error: `Cryptographic integrity check failed: ${verification.error}`,
    });
  }

  const { requestId, nonce } = verification;
  const tokenHash = hashSha256(nonce);

  try {
    // Register or update approver device
    const deviceFingerprint = hashSha256(`${approverUserId}-${userAgent}`);
    let deviceId = null;

    const deviceRes = await query(
      `SELECT id FROM user_devices WHERE user_id = $1 AND device_fingerprint = $2`,
      [approverUserId, deviceFingerprint]
    );

    if (deviceRes.rows.length > 0) {
      deviceId = deviceRes.rows[0].id;
      await query(
        `UPDATE user_devices SET last_used_at = NOW(), device_name = $1 WHERE id = $2`,
        [deviceName, deviceId]
      );
    } else {
      const newDevRes = await query(
        `INSERT INTO user_devices (user_id, device_name, device_fingerprint)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [approverUserId, deviceName, deviceFingerprint]
      );
      deviceId = newDevRes.rows[0].id;
    }

    // 2. Perform Atomic Update with optimistic lock
    const updateRes = await query(
      `UPDATE auth_requests
       SET status = 'approved',
           approved_at = NOW(),
           user_id = $1,
           approver_device_id = $2
       WHERE id = $3
         AND request_token_hash = $4
         AND status = 'pending'
         AND expires_at > NOW()
       RETURNING *`,
      [approverUserId, deviceId, requestId, tokenHash]
    );

    if (updateRes.rows.length === 0) {
      // Find out why update didn't match
      const checkRes = await query(`SELECT status, expires_at FROM auth_requests WHERE id = $1`, [requestId]);
      if (checkRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Challenge request not found.' });
      }
      const existing = checkRes.rows[0];
      if (existing.status !== 'pending') {
        return res.status(409).json({
          success: false,
          error: `Challenge cannot be approved. Current status is already '${existing.status}'.`,
        });
      }
      if (new Date(existing.expires_at) <= new Date()) {
        await query(`UPDATE auth_requests SET status = 'expired' WHERE id = $1`, [requestId]);
        return res.status(410).json({ success: false, error: 'QR Code challenge has expired.' });
      }

      return res.status(400).json({ success: false, error: 'Challenge approval failed.' });
    }

    await recordAuditLog({
      userId: approverUserId,
      eventType: 'QR_APPROVED',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
      details: { requestId, deviceName, deviceId },
    });

    return res.json({
      success: true,
      message: 'Login request approved successfully! The requesting browser will now authenticate.',
      requestId,
    });
  } catch (error) {
    console.error('[APPROVE QR ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal error approving QR request',
    });
  }
};

/**
 * 5. POST /api/auth/qr/reject
 * Explicit rejection by user
 */
export const rejectQrRequest = async (req, res) => {
  const { token, reason = 'User rejected authorization' } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const verification = verifySignedQrToken(token);
  if (!verification.valid) {
    return res.status(400).json({
      success: false,
      error: verification.error,
    });
  }

  const { requestId, nonce } = verification;
  const tokenHash = hashSha256(nonce);

  try {
    const updateRes = await query(
      `UPDATE auth_requests
       SET status = 'rejected'
       WHERE id = $1
         AND request_token_hash = $2
         AND status = 'pending'
       RETURNING *`,
      [requestId, tokenHash]
    );

    if (updateRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Unable to reject: challenge is no longer pending or does not exist.',
      });
    }

    await recordAuditLog({
      userId: req.user?.id || null,
      eventType: 'QR_REJECTED',
      result: 'WARNING',
      ipAddress,
      userAgent,
      details: { requestId, reason },
    });

    return res.json({
      success: true,
      message: 'Authentication request has been rejected.',
    });
  } catch (error) {
    console.error('[REJECT QR ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reject authentication request',
    });
  }
};

/**
 * 6. POST /api/auth/qr/complete
 * Called by Device A (the browser displaying the QR code)
 * Must provide both requestId AND the original signed token to prove possession.
 * Atomic transaction marks status = 'consumed' and creates session!
 */
export const completeQrRequest = async (req, res) => {
  const { requestId, token } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Cryptographic integrity check
  const verification = verifySignedQrToken(token);
  if (!verification.valid || verification.requestId !== requestId) {
    return res.status(400).json({
      success: false,
      error: 'Cryptographic token mismatch or signature invalid',
    });
  }

  const { nonce } = verification;
  const tokenHash = hashSha256(nonce);

  try {
    // Atomic PostgreSQL transaction: ensures single-use and eliminates race conditions
    const result = await withTransaction(async (client) => {
      // 1. Lock record FOR UPDATE to prevent concurrency attacks
      const reqRes = await client.query(
        `SELECT r.id, r.user_id, r.status, r.expires_at, r.request_token_hash
         FROM auth_requests r
         WHERE r.id = $1 AND r.request_token_hash = $2
         FOR UPDATE`,
        [requestId, tokenHash]
      );

      if (reqRes.rows.length === 0) {
        throw { statusCode: 404, message: 'Authentication challenge not found' };
      }

      const challenge = reqRes.rows[0];

      if (challenge.status === 'consumed') {
        throw { statusCode: 409, message: 'Replay attack prevented: token has already been consumed.' };
      }

      if (challenge.status === 'rejected') {
        throw { statusCode: 403, message: 'Authentication challenge was rejected by the approving device.' };
      }

      if (challenge.status !== 'approved') {
        throw { statusCode: 400, message: `Challenge is in state '${challenge.status}', not approved.` };
      }

      if (new Date(challenge.expires_at) <= new Date()) {
        await client.query(`UPDATE auth_requests SET status = 'expired' WHERE id = $1`, [requestId]);
        throw { statusCode: 410, message: 'Authentication challenge expired before completion.' };
      }

      if (!challenge.user_id) {
        throw { statusCode: 500, message: 'Internal error: approved challenge lacks user binding.' };
      }

      // 2. Mark token atomically consumed
      await client.query(
        `UPDATE auth_requests
         SET status = 'consumed',
             consumed_at = NOW()
         WHERE id = $1`,
        [requestId]
      );

      // 3. Fetch user details
      const userRes = await client.query(
        `SELECT id, full_name, email, account_status, created_at FROM users WHERE id = $1`,
        [challenge.user_id]
      );

      if (userRes.rows.length === 0 || userRes.rows[0].account_status !== 'active') {
        throw { statusCode: 403, message: 'User account is inactive or not found.' };
      }

      const user = userRes.rows[0];

      // 4. Create new stateful session for Device A
      const rawSessionToken = generateRandomToken(32);
      const sessionTokenHash = hashSha256(rawSessionToken);
      const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000);

      await client.query(
        `INSERT INTO sessions (user_id, session_token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, sessionTokenHash, expiresAt, ipAddress, userAgent]
      );

      return { user, rawSessionToken };
    });

    await recordAuditLog({
      userId: result.user.id,
      eventType: 'QR_LOGIN_COMPLETED',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
      details: { requestId, method: 'qr_cryptographic' },
    });

    res.cookie('cns_session', result.rawSessionToken, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      maxAge: config.sessionTtlSeconds * 1000,
    });

    return res.json({
      success: true,
      message: 'QR authentication completed successfully! Session established.',
      user: {
        id: result.user.id,
        fullName: result.user.full_name,
        email: result.user.email,
        accountStatus: result.user.account_status,
        createdAt: result.user.created_at,
      },
      token: result.rawSessionToken,
    });
  } catch (error) {
    if (error.statusCode) {
      await recordAuditLog({
        eventType: 'QR_COMPLETION_FAILED',
        result: 'FAILURE',
        ipAddress,
        userAgent,
        details: { requestId, reason: error.message },
      });
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }

    console.error('[QR COMPLETE ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal error finalizing QR authentication session',
    });
  }
};
