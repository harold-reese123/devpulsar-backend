# DevPulsar Backend

![Build Status](https://img.shields.io/github/actions/workflow/status/devpulsar/backend/ci.yml?branch=main&style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)

The backend API layer for **DevPulsar** — a developer contribution tracking platform built on the Stellar blockchain. DevPulsar monitors open-source contributors' merged GitHub pull requests, assigns on-chain points, and distributes USDC rewards at the end of each wave cycle.

This service sits between GitHub, Stellar, and the DevPulsar frontend, handling everything from webhook ingestion and contribution scoring to reward distribution and KYC verification.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [GitHub Webhook Setup](#github-webhook-setup)
- [Database Setup](#database-setup)
- [Running Tests](#running-tests)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

DevPulsar Backend is a RESTful API server built with Node.js and TypeScript. It serves as the central orchestration layer responsible for:

- **Ingesting GitHub events** via webhooks to detect and record merged pull requests
- **Scoring contributions** using a configurable points calculation engine
- **Managing wave cycles** — time-bounded contribution periods that determine reward eligibility
- **Distributing USDC rewards** on-chain via the Stellar network at the close of each wave
- **Enforcing KYC verification** for contributors crossing high-value payout thresholds
- **Exposing a REST API** consumed by the DevPulsar frontend and third-party integrations

---

## Key Features

- **GitHub Webhook Listener** — Receives `pull_request` events, validates signatures, and records merged PRs in real time
- **Wave Cycle Management** — Create, activate, and close contribution waves; automate reward snapshots at cycle end
- **Points Calculation Engine** — Configurable scoring rules based on PR complexity, repository weight, and contributor history
- **USDC Reward Distribution** — Trustless on-chain payouts via Stellar SDK using the USDC asset contract
- **KYC Verification** — Flags and gates high-value payouts pending identity verification
- **Contributor Profiles** — Aggregated stats per contributor including total points, wave history, and payout records
- **Idempotent Event Processing** — Deduplication of webhook events to prevent double-counting contributions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Language | TypeScript 5 |
| Framework | Express.js |
| Database | PostgreSQL 15 |
| ORM / Query Builder | Prisma |
| Blockchain SDK | Stellar SDK (`@stellar/stellar-sdk`) |
| GitHub Integration | GitHub REST API + Webhooks |
| Authentication | JWT + HMAC signature verification |
| Testing | Jest + Supertest |
| Process Manager | PM2 |

---

## Prerequisites

Before getting started, make sure you have the following installed:

- **Node.js** `>= 18.0.0` ([download](https://nodejs.org))
- **npm** `>= 9.0.0` or **Yarn** `>= 1.22`
- **PostgreSQL** `>= 15` running locally or via a managed service
- A **Stellar account** with testnet/mainnet funding ([Stellar Laboratory](https://laboratory.stellar.org))
- A **GitHub App or webhook** configured on the target repository (see [GitHub Webhook Setup](#github-webhook-setup))

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/devpulsar/backend.git
cd backend
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values. See [Environment Variables](#environment-variables) for the full reference.

### 4. Run database migrations

```bash
npm run db:migrate
```

### 5. (Optional) Seed the database

```bash
npm run db:seed
```

### 6. Start the development server

```bash
npm run dev
```

The server will start on the port defined in your `.env` (default: `3000`).

### 7. Build for production

```bash
npm run build
npm start
```

---

## Project Structure

```
src/
├── routes/             # Express route definitions
│   ├── contributors.ts # Contributor profile endpoints
│   ├── waves.ts        # Wave cycle management endpoints
│   ├── contributions.ts# Contribution record endpoints
│   └── webhooks.ts     # GitHub webhook ingestion endpoint
│
├── services/           # Core business logic
│   ├── github.service.ts       # GitHub API client & webhook validation
│   ├── wave.service.ts         # Wave lifecycle management
│   ├── points.service.ts       # Points calculation engine
│   ├── stellar.service.ts      # Stellar SDK wrapper & USDC distribution
│   ├── kyc.service.ts          # KYC verification gating logic
│   └── contributor.service.ts  # Contributor profile aggregation
│
├── models/             # Prisma schema & typed model interfaces
│   ├── schema.prisma   # Database schema definition
│   ├── contributor.ts  # Contributor model types
│   ├── wave.ts         # Wave model types
│   └── contribution.ts # Contribution model types
│
├── utils/              # Shared utilities and helpers
│   ├── logger.ts       # Structured logging (Winston)
│   ├── crypto.ts       # HMAC signature verification helpers
│   ├── pagination.ts   # Cursor-based pagination helpers
│   └── errors.ts       # Typed error classes and HTTP error factory
│
├── middleware/         # Express middleware
│   ├── auth.ts         # JWT authentication middleware
│   ├── validate.ts     # Request schema validation (Zod)
│   └── rateLimiter.ts  # Rate limiting per IP/contributor
│
├── jobs/               # Scheduled background jobs
│   ├── waveClose.job.ts        # Auto-closes waves at deadline
│   └── rewardDistribution.job.ts # Triggers USDC payouts post-wave
│
├── app.ts              # Express app initialization
└── server.ts           # HTTP server entry point
```

---

## API Endpoints

### Waves

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/waves` | List all wave cycles |
| `GET` | `/api/v1/waves/:id` | Get a single wave by ID |
| `POST` | `/api/v1/waves` | Create a new wave cycle |
| `PATCH` | `/api/v1/waves/:id` | Update wave metadata |
| `POST` | `/api/v1/waves/:id/close` | Manually close a wave and trigger payouts |
| `GET` | `/api/v1/waves/:id/leaderboard` | Get ranked contributors for a wave |

### Contributions

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/contributions` | List all contributions (paginated) |
| `GET` | `/api/v1/contributions/:id` | Get a single contribution record |
| `GET` | `/api/v1/contributions/wave/:waveId` | List contributions for a specific wave |
| `GET` | `/api/v1/contributions/contributor/:contributorId` | List contributions by contributor |
| `DELETE` | `/api/v1/contributions/:id` | Remove a contribution (admin only) |

### Contributors

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/contributors` | List all contributors |
| `GET` | `/api/v1/contributors/:id` | Get contributor profile and stats |
| `GET` | `/api/v1/contributors/:id/payouts` | Get payout history for a contributor |
| `PATCH` | `/api/v1/contributors/:id/kyc` | Update KYC verification status |
| `GET` | `/api/v1/contributors/:id/stellar` | Get linked Stellar account details |

### Webhooks

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/webhooks/github` | GitHub webhook receiver (HMAC-verified) |

---

## Environment Variables

Create a `.env` file at the project root. All variables marked **required** must be set before the server will start.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Port the HTTP server listens on |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`, `test`) |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/devpulsar`) |
| `JWT_SECRET` | Yes | — | Secret key used to sign and verify JWTs |
| `GITHUB_WEBHOOK_SECRET` | Yes | — | Secret token used to verify GitHub webhook HMAC signatures |
| `GITHUB_APP_ID` | No | — | GitHub App ID (if using GitHub App auth instead of PAT) |
| `GITHUB_PRIVATE_KEY` | No | — | GitHub App private key (PEM format) |
| `GITHUB_TOKEN` | No | — | Personal access token for GitHub REST API calls |
| `STELLAR_NETWORK` | Yes | `testnet` | Stellar network to connect to (`testnet` or `mainnet`) |
| `STELLAR_SECRET_KEY` | Yes | — | Secret key of the Stellar account used to sign reward transactions |
| `STELLAR_PUBLIC_KEY` | Yes | — | Public key of the Stellar distribution account |
| `USDC_CONTRACT_ADDRESS` | Yes | — | Stellar contract/asset address for USDC |
| `KYC_THRESHOLD_USDC` | No | `500` | USDC amount above which KYC verification is required before payout |
| `LOG_LEVEL` | No | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |

Example `.env`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://devpulsar:secret@localhost:5432/devpulsar_db
JWT_SECRET=your_jwt_secret_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
STELLAR_NETWORK=testnet
STELLAR_SECRET_KEY=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STELLAR_PUBLIC_KEY=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
USDC_CONTRACT_ADDRESS=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
KYC_THRESHOLD_USDC=500
LOG_LEVEL=info
```

> Never commit your `.env` file. It is listed in `.gitignore` by default.

---

## GitHub Webhook Setup

DevPulsar listens for `pull_request` events on any repository you want to track.

### 1. Generate a webhook secret

```bash
openssl rand -hex 32
```

Copy the output and set it as `GITHUB_WEBHOOK_SECRET` in your `.env`.

### 2. Register the webhook on GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings → Webhooks → Add webhook**
3. Set the **Payload URL** to your server's public endpoint:
   ```
   https://your-domain.com/api/v1/webhooks/github
   ```
4. Set **Content type** to `application/json`
5. Paste your generated secret into the **Secret** field
6. Under **Which events would you like to trigger this webhook?**, select **Let me select individual events** and check **Pull requests**
7. Ensure **Active** is checked and click **Add webhook**

### 3. Verify delivery

GitHub will send a `ping` event on creation. Check the **Recent Deliveries** tab to confirm a `200 OK` response from your server.

> For local development, use [ngrok](https://ngrok.com) or [smee.io](https://smee.io) to expose your local server to the internet.

```bash
npx smee-client --url https://smee.io/your-channel-id --target http://localhost:3000/api/v1/webhooks/github
```

---

## Database Setup

DevPulsar uses **Prisma** as the ORM. The schema is defined in `src/models/schema.prisma`.

### Run migrations

```bash
# Apply all pending migrations
npm run db:migrate

# Create a new migration after schema changes
npm run db:migrate:create -- --name your_migration_name
```

### Seed the database

Populates the database with initial wave configuration and test contributor data:

```bash
npm run db:seed
```

### Reset the database (destructive)

```bash
npm run db:reset
```

> This drops all tables and re-runs migrations from scratch. Do not run in production.

### Open Prisma Studio

```bash
npm run db:studio
```

---

## Running Tests

### Unit tests

Tests for individual services and utilities, using mocked dependencies:

```bash
npm run test:unit
```

### Integration tests

End-to-end API tests against a real test database. Requires `DATABASE_URL` pointing to a test database:

```bash
npm run test:integration
```

### All tests

```bash
npm test
```

### Coverage report

```bash
npm run test:coverage
```

Coverage output is written to `coverage/` and an HTML report is available at `coverage/lcov-report/index.html`.

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes, ensuring all existing tests pass and new functionality is covered by tests.

3. Run the linter before committing:
   ```bash
   npm run lint
   npm run lint:fix
   ```

4. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add wave auto-close job
   fix: correct HMAC signature validation for GitHub webhooks
   chore: update Stellar SDK to v12
   ```

5. Open a pull request against `main` with a clear description of the change and any relevant context.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for the full code of conduct and contribution guidelines.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.
