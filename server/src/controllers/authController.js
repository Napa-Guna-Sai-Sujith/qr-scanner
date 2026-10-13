import { query } from '../config/db.js';
import {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  hashSha256,
} from '../services/cryptoService.js';
import { recordAuditLog } from '../services/auditService.js';
import { config } from '../config/env.js';

export const register = async (req, res) => {
  const { fullName, email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await recordAuditLog({
        eventType: 'USER_REGISTRATION_FAILED',
        result: 'FAILURE',
        ipAddress,
        userAgent,
        details: { reason: 'Email already registered', emailAttempt: email },
      });
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.',
      });
    }

    const passwordHash = await hashPassword(password);

    const insertRes = await query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, account_status, created_at`,
      [fullName, email, passwordHash]
    );

    const newUser = insertRes.rows[0];

    // Create initial session
    const rawSessionToken = generateRandomToken(32);
    const sessionTokenHash = hashSha256(rawSessionToken);
    const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000);

    await query(
      `INSERT INTO sessions (user_id, session_token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [newUser.id, sessionTokenHash, expiresAt, ipAddress, userAgent]
    );

    await recordAuditLog({
      userId: newUser.id,
      eventType: 'USER_REGISTERED',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
      details: { email: newUser.email },
    });

    res.cookie('cns_session', rawSessionToken, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      maxAge: config.sessionTtlSeconds * 1000,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        email: newUser.email,
        accountStatus: newUser.account_status,
        createdAt: newUser.created_at,
      },
      token: rawSessionToken, // for API tests/fallback
    });
  } catch (error) {
    console.error('[REGISTRATION ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed due to a server error. Please try again.',
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    const userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      await recordAuditLog({
        eventType: 'PASSWORD_LOGIN_FAILED',
        result: 'FAILURE',
        ipAddress,
        userAgent,
        details: { reason: 'User not found' },
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password credentials.',
      });
    }

    const user = userRes.rows[0];

    if (user.account_status !== 'active') {
      await recordAuditLog({
        userId: user.id,
        eventType: 'LOGIN_BLOCKED',
        result: 'WARNING',
        ipAddress,
        userAgent,
        details: { status: user.account_status },
      });
      return res.status(403).json({
        success: false,
        error: `Account is ${user.account_status}. Please contact administrator.`,
      });
    }

    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      await recordAuditLog({
        userId: user.id,
        eventType: 'PASSWORD_LOGIN_FAILED',
        result: 'FAILURE',
        ipAddress,
        userAgent,
        details: { reason: 'Incorrect password' },
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password credentials.',
      });
    }

    // Generate Session
    const rawSessionToken = generateRandomToken(32);
    const sessionTokenHash = hashSha256(rawSessionToken);
    const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000);

    await query(
      `INSERT INTO sessions (user_id, session_token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, sessionTokenHash, expiresAt, ipAddress, userAgent]
    );

    await recordAuditLog({
      userId: user.id,
      eventType: 'PASSWORD_LOGIN_SUCCESS',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
      details: { method: 'password' },
    });

    res.cookie('cns_session', rawSessionToken, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      maxAge: config.sessionTtlSeconds * 1000,
    });

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        accountStatus: user.account_status,
        createdAt: user.created_at,
      },
      token: rawSessionToken,
    });
  } catch (error) {
    console.error('[LOGIN ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed due to an internal error.',
    });
  }
};

export const logout = async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    if (req.sessionId) {
      await query('UPDATE sessions SET revoked_at = NOW() WHERE id = $1', [req.sessionId]);
    }

    if (req.user?.id) {
      await recordAuditLog({
        userId: req.user.id,
        eventType: 'SESSION_REVOKED',
        result: 'SUCCESS',
        ipAddress,
        userAgent,
        details: { reason: 'User initiated logout' },
      });
    }

    res.clearCookie('cns_session');

    return res.json({
      success: true,
      message: 'Logged out successfully. Session revoked.',
    });
  } catch (error) {
    console.error('[LOGOUT ERROR]:', error);
    res.clearCookie('cns_session');
    return res.json({ success: true, message: 'Logged out' });
  }
};

export const getMe = async (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
};
