# Cryptographic Security Design & Threat Analysis

This document provides a cybersecurity engineering analysis of the **Secure QR-Based Authentication System**.

---

## 1. Cryptographic Primitives & Design Principles

### A. High-Entropy Random Nonce Generation
- Generated using Node.js's native `crypto.randomBytes(32)` (256 bits of entropy).
- Guarantees collision resistance ($\approx 2^{128}$ operations required to find a collision under the birthday paradox).
- Guarantees unpredictability against pseudo-random number generator (PRNG) prediction attacks.

### B. HMAC-SHA-256 Signature Verification
- Every QR token payload adheres to:
  $$\text{Payload} = \text{RequestUUID} \parallel \text{Nonce}$$
  $$\text{Signature} = \text{HMAC-SHA256}(\text{Payload}, K_{\text{HMAC}})$$
  $$\text{Token} = \text{RequestUUID} \cdot \text{Nonce} \cdot \text{Signature}$$
- **Integrity Guarantee:** Any alteration to the request UUID or nonce renders the HMAC signature invalid.
- **Authenticity Guarantee:** Only the backend possessing $K_{\text{HMAC}}$ can mint valid tokens.

### C. Timing-Safe Comparison (`crypto.timingSafeEqual`)
- Standard string equality operators (`===`) terminate immediately upon detecting the first mismatched byte, creating a measurable timing disparity (nanosecond-scale side-channel).
- This application computes fixed-length hex buffers and evaluates them strictly using constant-time comparisons:
  ```javascript
  export const safeCompare = (a, b) => {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  };
  ```

### D. Zero-Knowledge Token & Session Storage
- The database **never stores plaintext nonces or session cookies**.
- Upon challenge generation, the backend computes:
  $$\text{TokenHash} = \text{SHA-256}(\text{Nonce})$$
- Even in the event of an adversary acquiring full SQL read access (e.g., database backup dump), the adversary cannot forge QR codes or authenticate because SHA-256 is a pre-image resistant one-way function.

---

## 2. Threat Modeling & Attack Mitigation Matrix

| Threat Category | Attack Vector | System Defense Mechanism | Result |
| :--- | :--- | :--- | :--- |
| **Replay Attack** | Attacker intercepts a previously scanned QR code and attempts to submit it again. | **Atomic Status Transition:** In PostgreSQL transaction: `UPDATE auth_requests SET status = 'consumed' WHERE status = 'approved'`. Subsequent requests receive HTTP 409 Conflict. | **Mitigated** |
| **Man-In-The-Middle (MITM)** | Attacker proxies communication between challenger browser and server. | Out-of-band mobile approval channel. The challenger IP and timestamp are displayed on the mobile device for explicit visual confirmation before approval. | **Mitigated** |
| **Credential Stuffing** | Attacker tests leaked password lists against authentication endpoints. | **Rate Limiting:** `express-rate-limit` enforces strict limits on login and QR initiation. QR login transmits zero password credentials over the wire. | **Mitigated** |
| **Keylogging** | Malware logs keyboard input on the user's desktop/laptop. | User never types any credentials on the host machine; approval occurs exclusively on the isolated mobile authenticator. | **Mitigated** |
| **Session Hijacking** | Malicious scripts attempt to steal session identifiers from the browser DOM. | **HttpOnly Cookies:** `res.cookie('cns_session', ...)` with `HttpOnly`, `SameSite=Lax`, and `Secure` (production) completely blocks JavaScript `document.cookie` access. | **Mitigated** |
| **SQL Injection** | Attacker injects SQL payloads into inputs. | Parameterized queries with `pg` driver (`$1, $2, ...`) across all database interactions. No dynamic query string concatenation. | **Mitigated** |
| **Race Conditions** | Concurrent threads attempt to approve/complete the same challenge simultaneously. | Row-level locking via `SELECT ... FOR UPDATE` inside an isolated atomic database transaction (`BEGIN ... COMMIT`). | **Mitigated** |

---

## 3. Cryptographic State Machine

```
   [Browser]               [Neon DB]               [Phone]
   Initiate challenge ----> Status: 'pending'
                                |
                                +--- 90s TTL expires ---> Status: 'expired'
                                |
                                +--- User clicks reject -> Status: 'rejected'
                                |
                                +--- Enrolled User Approves
                                          |
                                          v
                                   Status: 'approved'
                                          |
                           (FOR UPDATE Lock Transaction)
                                          |
                                          v
                           Status: 'consumed' (Terminal)
                                          |
                                   Mints Session Cookie
```

---

## 4. Security Audit Log Classification

Audit logs are recorded in the `audit_logs` table for all critical events:
- `USER_REGISTERED`
- `PASSWORD_LOGIN_SUCCESS` / `PASSWORD_LOGIN_FAILED`
- `QR_INITIATED`
- `QR_APPROVED`
- `QR_REJECTED`
- `QR_LOGIN_COMPLETED`
- `QR_EXPIRED`
- `SESSION_REVOKED`

*Note: All details objects are strictly scrubbed of passwords, keys, tokens, and cookie strings prior to insertion.*
