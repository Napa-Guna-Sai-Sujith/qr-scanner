import { query } from '../config/db.js';

/**
 * Record a security or authentication event in the audit log
 * Never log plaintext passwords, raw tokens, or session IDs.
 */
export const recordAuditLog = async ({
  userId = null,
  eventType,
  result,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
  details = {},
}) => {
  try {
    // Sanitize details to ensure sensitive keys are scrubbed
    const sanitizedDetails = { ...details };
    const forbiddenKeys = ['password', 'token', 'rawToken', 'secret', 'cookie', 'sessionToken'];
    for (const key of forbiddenKeys) {
      if (sanitizedDetails[key]) {
        delete sanitizedDetails[key];
      }
    }

    await query(
      `INSERT INTO audit_logs (user_id, event_type, result, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, eventType, result, ipAddress, userAgent, JSON.stringify(sanitizedDetails)]
    );
  } catch (error) {
    // Audit log failure should be printed to stderr but not crash the entire request
    console.error('[AUDIT LOG ERROR]:', error.message);
  }
};
