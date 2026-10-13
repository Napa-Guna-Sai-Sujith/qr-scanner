# Secure QR-Based Authentication System Using Cryptography

A complete, full-stack, production-grade cybersecurity and engineering project demonstrating an out-of-band, password-free QR authentication system using cryptographic HMAC-SHA-256 signatures, single-use high-entropy nonces, and atomic serverless PostgreSQL transactions on Neon.

---

## 1. System Architecture Overview

```
       +-------------------------------------------------------------+
       |               CLIENT BROWSER (Terminal A)                   |
       |  - Requests Challenge (POST /api/auth/qr/initiate)          |
       |  - Renders QR Challenge with 90s Expiration Countdown       |
       |  - Polls Status (GET /api/auth/qr/:requestId)               |
       |  - Completes Atomic Handshake (POST /api/auth/qr/complete)  |
       +------------------------------+------------------------------+
                                      |
                     TLS 1.3 / HTTPS  |  REST API
                                      v
       +-------------------------------------------------------------+
       |                 EXPRESS BACKEND SERVER                      |
       |  - HMAC-SHA-256 Token Signature Minting                     |
       |  - Constant-Time Comparison (crypto.timingSafeEqual)        |
       |  - Zero-Knowledge Storage: SHA-256(Nonce) in DB             |
       |  - Atomic 2PC Row-Level Lock (SELECT ... FOR UPDATE)        |
       |  - Stateful HttpOnly, SameSite Session Cookies              |
       |  - Privacy-Conscious Audit Trail Engine                     |
       +------------------------------+------------------------------+
                                      |
                       Pooled TLS     |  pg Driver
                                      v
       +-------------------------------------------------------------+
       |             NEON SERVERLESS POSTGRESQL                      |
       |  - users (bcrypt-hashed passwords, status)                  |
       |  - auth_requests (token hashes, 90s TTL, atomic status)     |
       |  - user_devices (enrolled mobile authenticators)            |
       |  - sessions (hashed session tokens, revocations)            |
       |  - audit_logs (immutable chronological security ledger)     |
       +-------------------------------------------------------------+
                                      ^
                                      | Approved via Mobile Channel
       +------------------------------+------------------------------+
       |            AUTHORIZED MOBILE AUTHENTICATOR                  |
       |                   (Device B)                                |
       |  - Scans High-Resolution QR Code                            |
       |  - Verifies HMAC Signature locally & remotely               |
       |  - Inspects challenger IP & timestamp                       |
       |  - Explicit user authorization (POST /api/auth/qr/approve)  |
       +-------------------------------------------------------------+
```

---

## 2. Technology Stack

- **Frontend:** React 18, Vite, JavaScript, Tailwind CSS, Lucide React, HTML5-QRCode scanner, React Router v6.
- **Backend:** Node.js v24+, Express.js, native `node:crypto` (HMAC, SHA-256, timing-safe compare), `bcryptjs`, `cookie-parser`, `helmet`, `express-rate-limit`, `zod`.
- **Database:** Neon Serverless PostgreSQL with connection pooling and SSL/TLS.
- **Testing:** Vitest and Supertest testing suites.

---

## 3. Directory Structure

```
f:\cns project\
├── package.json                 # Root script runner
├── .gitignore                   # Ignores node_modules, .env, and dist
├── README.md                    # Setup and execution guide
├── SECURITY.md                  # Cryptographic threat model & analysis
├── ACADEMIC_REPORT.md           # Full IEEE report & 20 Viva Q&As
│
├── server/                      # Backend application
│   ├── .env                     # Live Neon DB configuration & secrets
│   ├── .env.example             # Configuration reference
│   ├── package.json
│   ├── src/
│   │   ├── app.js               # Express app config (CORS, Helmet, Rate limits)
│   │   ├── server.js            # Server entry point & DB check
│   │   ├── config/
│   │   │   ├── env.js           # Env validator with entropy checks
│   │   │   └── db.js            # Neon PostgreSQL pool & transaction helper
│   │   ├── controllers/
│   │   │   ├── authController.js# Registration, password login, logout, me
│   │   │   ├── qrController.js  # Initiate, inspect, approve, reject, complete
│   │   │   └── userController.js# Profile, device management, audit history
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js# HttpOnly cookie & session verification
│   │   │   ├── rateLimiter.js   # DoS and brute-force protection
│   │   │   ├── validate.js      # Zod request payload validation
│   │   │   └── errorHandler.js  # Centralized error handler
│   │   ├── routes/
│   │   │   ├── authRoutes.js    # /api/auth
│   │   │   ├── qrRoutes.js      # /api/auth/qr
│   │   │   ├── userRoutes.js    # /api/user
│   │   │   └── healthRoutes.js  # /api/health
│   │   ├── services/
│   │   │   ├── cryptoService.js # HMAC-SHA-256, constant-time compare, nonces
│   │   │   └── auditService.js  # Sanitized audit logger
│   │   └── db/
│   │       ├── schema.sql       # PostgreSQL schema & constraints
│   │       ├── migrate.js       # Migration runner
│   │       └── seed.js          # Demo accounts seeder
│   └── tests/
│       └── auth_and_qr.test.js  # Vitest test suite (16 security tests)
│
└── client/                      # Frontend application
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx              # Application router
    │   ├── index.css            # Cyber theme styling
    │   ├── context/
    │   │   └── AuthContext.jsx  # Global session state & cookie sync
    │   ├── services/
    │   │   └── api.js           # Axios client with credentials
    │   ├── components/
    │   │   ├── Navbar.jsx       # Navigation & session controls
    │   │   ├── Footer.jsx       # Crypto specs footer
    │   │   ├── ProtectedRoute.jsx# Auth guard
    │   │   ├── CountdownTimer.jsx# 90s countdown bar
    │   │   └── StatusBadge.jsx  # Dynamic status indicator
    │   └── pages/
    │       ├── LandingPage.jsx  # Project architecture & threat matrix
    │       ├── RegisterPage.jsx # Password strength validator
    │       ├── LoginPage.jsx    # Password login & fast demo fill
    │       ├── QRLoginPage.jsx  # Live QR challenge & auto-complete
    │       ├── QRScannerPage.jsx# Camera feed & manual fallback
    │       ├── QRApprovalPage.jsx# Scanned metadata inspector & approval
    │       ├── DashboardPage.jsx# Security metrics & quick actions
    │       ├── HistoryPage.jsx  # Audit log table & search filter
    │       ├── ProfilePage.jsx  # Account details
    │       ├── SecuritySettingsPage.jsx # Password rotation & device revocation
    │       └── NotFoundPage.jsx # Custom 404 page
```

---

## 4. Quick Start & Execution

### Step 1: Install Dependencies
Open a terminal in the root directory:
```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### Step 2: Database Migration & Seeding
The database schema has already been created on your Neon PostgreSQL cluster. To re-run migrations or seed test accounts:
```bash
cd ../server
npm run migrate
npm run seed
```

**Pre-Seeded Test Credentials:**
- User 1: `alice@security.edu` / Password: `Password@123`
- User 2: `bob@security.edu` / Password: `Password@123`

### Step 3: Run the Test Suite
Verify all 16 security and cryptographic test cases:
```bash
npm test
```

### Step 4: Run the Development Servers
Open two terminal windows:

**Terminal 1 (Backend Server on Port 5000):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend Client on Port 5173):**
```bash
cd client
npm run dev
```

Open your browser to: **`http://localhost:5173`**

---

## 5. Demonstration Walkthrough for Examiners

1. **Observe the Landing Page (`/`):**
   - Review the Threat Model Comparison Matrix (explaining why QR prevents Keylogging, Credential Stuffing, and MITM).
2. **Initiate QR Challenge (`/qr-login`):**
   - Click "Launch QR Login". An unpredictable challenge is generated with a 90-second countdown timer.
3. **Scan / Inspect Challenge (`/qr-scan` or simulated link):**
   - Use the camera or click the testing link: "Open Approval Page in New Tab".
   - Notice that merely visiting the link does not log in the user.
   - The approval page displays challenger IP, creation timestamp, and HMAC integrity.
4. **Approve Login:**
   - Log in as Alice on the approval page (simulating Alice's mobile device) and click "Approve Login".
5. **Observe Instant Handshake:**
   - Return to the original QR tab. It detects the approval status, executes the atomic single-use finalization, and seamlessly redirects to `/dashboard`.
6. **Replay Attack Demonstration:**
   - Attempt to reload or submit the same token again; the backend rejects it with HTTP 409 (Replay attack prevented: token has already been consumed).
7. **Inspect the Audit Trail (`/history`):**
   - Review the exact chronological ledger of `QR_INITIATED`, `QR_APPROVED`, and `QR_LOGIN_COMPLETED` records in the database.
