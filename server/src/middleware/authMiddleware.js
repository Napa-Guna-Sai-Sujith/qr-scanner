import { query } from '../config/db.js';
import { hashSha256 } from '../services/cryptoService.js';

export const requireAuth = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.cns_session || req.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!rawToken) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No session cookie or token provided.',
      });
    }

    const tokenHash = hashSha256(rawToken);

    const sessionRes = await query(
      `SELECT s.id as session_id, s.user_id, s.expires_at, s.revoked_at,
              u.id, u.full_name, u.email, u.account_status, u.created_at as user_created_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND u.account_status = 'active'`,
      [tokenHash]
    );

    if (sessionRes.rows.length === 0) {
      // Invalidate cookie if stale or revoked
      res.clearCookie('cns_session');
      return res.status(401).json({
        success: false,
        error: 'Invalid, revoked, or expired session. Please log in again.',
      });
    }

    const row = sessionRes.rows[0];
    req.user = {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      accountStatus: row.account_status,
      createdAt: row.user_created_at,
    };
    req.sessionId = row.session_id;

    next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication verification error',
    });
  }
};
