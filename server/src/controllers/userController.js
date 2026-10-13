import { query } from '../config/db.js';
import { hashPassword, verifyPassword } from '../services/cryptoService.js';
import { recordAuditLog } from '../services/auditService.js';

export const getProfile = async (req, res) => {
  try {
    const userRes = await query(
      `SELECT id, full_name, email, account_status, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    const deviceCountRes = await query(
      `SELECT COUNT(*) FROM user_devices WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.user.id]
    );

    const sessionCountRes = await query(
      `SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [req.user.id]
    );

    return res.json({
      success: true,
      profile: userRes.rows[0],
      stats: {
        activeDevices: parseInt(deviceCountRes.rows[0].count, 10),
        activeSessions: parseInt(sessionCountRes.rows[0].count, 10),
      },
    });
  } catch (error) {
    console.error('[GET PROFILE ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve user profile' });
  }
};

export const updateProfile = async (req, res) => {
  const { fullName, currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    // If changing password, verify current password first
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password is required to set a new password.',
        });
      }

      const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      const isMatch = await verifyPassword(currentPassword, userRes.rows[0].password_hash);
      if (!isMatch) {
        await recordAuditLog({
          userId,
          eventType: 'PASSWORD_CHANGE_FAILED',
          result: 'FAILURE',
          ipAddress,
          userAgent,
          details: { reason: 'Incorrect current password' },
        });
        return res.status(400).json({
          success: false,
          error: 'The current password you entered is incorrect.',
        });
      }

      const newHash = await hashPassword(newPassword);
      await query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [newHash, userId]
      );

      // Invalidate all sessions except current
      await query(
        `UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND id != $2 AND revoked_at IS NULL`,
        [userId, req.sessionId]
      );

      await recordAuditLog({
        userId,
        eventType: 'PASSWORD_CHANGED',
        result: 'SUCCESS',
        ipAddress,
        userAgent,
        details: { sessionsRevoked: true },
      });
    }

    if (fullName) {
      await query(
        `UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2`,
        [fullName, userId]
      );
    }

    const updated = await query(
      `SELECT id, full_name, email, account_status, updated_at FROM users WHERE id = $1`,
      [userId]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updated.rows[0],
    });
  } catch (error) {
    console.error('[UPDATE PROFILE ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

export const getHistory = async (req, res) => {
  try {
    const logsRes = await query(
      `SELECT id, event_type, result, ip_address, user_agent, details, created_at
       FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    return res.json({
      success: true,
      logs: logsRes.rows,
    });
  } catch (error) {
    console.error('[GET HISTORY ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
};

export const getDevices = async (req, res) => {
  try {
    const devicesRes = await query(
      `SELECT id, device_name, created_at, last_used_at, revoked_at
       FROM user_devices
       WHERE user_id = $1
       ORDER BY last_used_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      devices: devicesRes.rows,
    });
  } catch (error) {
    console.error('[GET DEVICES ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch enrolled devices' });
  }
};

export const revokeDevice = async (req, res) => {
  const { deviceId } = req.params;

  try {
    const updateRes = await query(
      `UPDATE user_devices
       SET revoked_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, device_name`,
      [deviceId, req.user.id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    return res.json({
      success: true,
      message: `Device '${updateRes.rows[0].device_name}' revoked successfully.`,
    });
  } catch (error) {
    console.error('[REVOKE DEVICE ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Failed to revoke device' });
  }
};
