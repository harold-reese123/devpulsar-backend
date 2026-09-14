# DevPulsar Backend

![Build Status](https://img.shields.io/github/actions/workflow/status/devpulsar/devpulsar-backend/ci.yml?branch=main&style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)

The backend API layer for **DevPulsar** — a developer contribution tracking platform built on the Stellar blockchain. DevPulsar monitors open-source contributors' merged GitHub pull requests, assigns points, and distributes USDC rewards at the end of each wave cycle.

This service sits between GitHub, Stellar, and the [DevPulsar frontend](https://github.com/devpulsar/devpulsar-frontend). **This README's API contract is written to match what the frontend already expects and has been built against** — see [Reconciliation Notes](#reconciliation-notes) at the bottom for what changed from the original draft.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Project Structure](#project-structure)
- [Identity Model](#identity-model)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [GitHub Webhook Setup](#github-webhook-setup)
- [Database Setup](#database-setup)
- [Running Tests](#running-tests)
- [Reconciliation Notes](#reconciliation-notes)
- [License](#license)

---

## Project Overview

DevPulsar Backend is a RESTful API server built with Node.js and TypeScript. It is responsible for:

- **Ingesting GitHub events** via webhooks to detect and record merged pull requests (v1: seeded/mocked, real ingestion is a later phase)
- **Scoring contributions** using a points calculation engine (Trivial/Medium/High tiers, per Drips Wave convention)
- **Managing wave cycles** — time-bounded contribution periods that determine reward eligibility
- **Queuing USDC rewards** at the close of each wave, claimable by contributors via the frontend
- **Exposing a REST API** consumed directly by the DevPulsar frontend, keyed by Stellar wallet address

---

## Key Features

- **Wallet-Address-Keyed API** — no separate login/JWT flow; a connected Stellar wallet address is the identity, matching how the frontend already works
- **Wave Cycle Management** — current wave + full history, exposed as dedicated endpoints
- **Points Calculation Engine** — configurable scoring rules based on PR complexity (Trivial=100 / Medium=150 / High=200, matching Drips Wave conventions)
- **Leaderboard** — single endpoint, toggled by `scope` query param (`wave` | `all-time`)
- **Reward Claiming** — contributor-initiated claim endpoint (not fully automatic payout), matching the frontend's claim-button UX
- **Idempotent Event Processing** — dedup of webhook events to prevent double-counting contributions (future phase)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Language | TypeScript 5 |
| Framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Blockchain SDK | Stellar SDK (`@stellar/stellar-sdk`) |
| GitHub Integration | GitHub REST API + Webhooks (later phase) |
| Testing | Jest + Supertest |
| Process Manager | PM2 |

---

## Prerequisites

- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0` or **Yarn** `>= 1.22`
- **MongoDB** `>= 6` running locally or via a managed service (e.g. Atlas)
- A **Stellar account** for the distribution wallet (testnet to start — [Stellar Laboratory](https://laboratory.stellar.org))

---

## Installation & Setup

```bash
git clone https://github.com/devpulsar/devpulsar-backend.git
cd devpulsar-backend
npm install
cp .env.example .env
npm run db:seed
npm run dev
```

The server starts on the port defined in `.env` (default `4000` — deliberately different from the frontend's Vite dev port `5173`).

Build for production:

```bash
npm run build
npm start
```

---

## Project Structure

```
src/
├── routes/
│   ├── contributions.ts   # GET /contributions/:address
│   ├── wave.ts             # GET /wave/current, GET /wave/history
│   ├── leaderboard.ts      # GET /leaderboard
│   ├── rewards.ts          # GET /rewards/:address, POST /rewards/claim
│   └── webhooks.ts         # POST /webhooks/github (future phase)
│
├── services/
│   ├── points.service.ts       # Points calculation engine
│   ├── wave.service.ts         # Wave lifecycle management
│   ├── stellar.service.ts      # Stellar SDK wrapper, USDC transfers
│   └── contribution.service.ts # Contribution record aggregation
│
├── models/                 # Mongoose schemas
│   ├── Contribution.ts
│   ├── Wave.ts
│   ├── RewardDistribution.ts
│   └── Contributor.ts      # keyed by walletAddress, not an internal id
│
├── middleware/
│   ├── walletAddress.ts    # reads X-Wallet-Address header, attaches req.walletAddress
│   ├── validate.ts         # request schema validation (Zod)
│   └── rateLimiter.ts
│
├── utils/
│   ├── logger.ts
│   ├── pagination.ts
│   └── errors.ts
│
├── jobs/
│   └── waveClose.job.ts    # auto-closes waves at deadline, snapshots leaderboard
│
├── app.ts
└── server.ts
```

---

## Identity Model

**There is no separate login step and no internal `contributorId` exposed in the API.** The frontend already identifies users by their connected Stellar wallet address (see its `X-Wallet-Address` request header, set automatically by its Axios interceptor). The backend treats that address as the primary key for all contributor-scoped data.

Internally, a `Contributor` document may still have a Mongo `_id`, but no route requires the client to know or pass it — every contributor-scoped endpoint takes the wallet address directly in the path or header.

If GitHub-identity linking (associating a wallet address with a GitHub username) is added later, that's an additive field on the `Contributor` model, not a new identity scheme.

---

## API Endpoints

No version prefix (`/api/v1/...`) for now — kept flat to match what the frontend already calls. Add versioning later if/when there's a breaking-change need.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/contributions/:address` | Merged PRs + points for a contributor, identified by wallet address |
| `GET` | `/wave/current` | Metadata for the currently active wave (`id`, `label`, `status`, `startAt`, `endAt`, `totalPointsDistributed`, `totalRewardsUsdc`, `participantCount`) |
| `GET` | `/wave/history` | List of past, closed wave cycles |
| `GET` | `/leaderboard?scope=wave\|all-time` | Ranked contributor list. `scope` defaults to `wave` if omitted |
| `GET` | `/rewards/:address` | Reward history + claimable balance for a contributor |
| `POST` | `/rewards/claim` | Initiate a claim of the caller's full claimable balance. Body: `{ address: string }`. Returns a queued/pending distribution; actual on-chain signing happens via the frontend's wallet, not server-held keys — see note below |
| `POST` | `/webhooks/github` | GitHub webhook receiver (**not implemented in v1** — stub route returns `501`) |

### Response shape notes (matching frontend types exactly)

- All USDC amounts (`totalRewardsUsdc`, `amountUsdc`, `claimableUsdc`) are serialized as **decimal strings**, e.g. `"1250.50"` — never raw numbers, to avoid float precision loss. The frontend's `formatUsdc()` util assumes this.
- Timestamps (`startAt`, `endAt`, `distributedAt`, `mergedAt`) are **ISO 8601 strings**.
- `Contribution.status` is one of: `"points_assigned" | "reward_queued" | "rewarded"`.
- `RewardDistribution.status` is one of: `"claimable" | "claimed"`; `txHash` is `null` until claimed.
- Wave `label` (e.g. `"Wave 12"`) is a real stored field, not derived client-side from an id/number.

### On claiming

`POST /rewards/claim` marks a distribution as claim-initiated server-side and returns the transaction parameters needed for the **frontend to build and sign via the contributor's own wallet** (Stellar Wallets Kit) — the backend does not hold contributor funds or sign on their behalf. The frontend's current `claimReward()` is a stub that no-ops; wiring this up for real is a follow-up phase once the reward contract/distribution mechanism is finalized.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `STELLAR_NETWORK` | Yes | `testnet` | `testnet` \| `mainnet` — should match the frontend's `VITE_STELLAR_NETWORK` |
| `STELLAR_DISTRIBUTION_PUBLIC_KEY` | Yes | — | Public key of the account funding USDC rewards |
| `STELLAR_DISTRIBUTION_SECRET_KEY` | Yes | — | Secret key for the distribution account (server-side signing for future automated flows only — never used to sign a contributor's claim) |
| `USDC_ASSET_ISSUER` | Yes | — | Issuer address of the USDC asset used on the configured network |
| `CORS_ORIGIN` | Yes | — | Frontend origin allowed to call this API (e.g. `http://localhost:5173`) |
| `LOG_LEVEL` | No | `info` | `debug` \| `info` \| `warn` \| `error` |
| `GITHUB_WEBHOOK_SECRET` | No | — | Unused until webhook ingestion phase; reserved |

Example `.env`:

```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/devpulsar
STELLAR_NETWORK=testnet
STELLAR_DISTRIBUTION_PUBLIC_KEY=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STELLAR_DISTRIBUTION_SECRET_KEY=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
USDC_ASSET_ISSUER=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

> Never commit your `.env` file. It is listed in `.gitignore`.

---

## GitHub Webhook Setup

**Not implemented in v1.** `POST /webhooks/github` exists as a route stub returning `501 Not Implemented`. Contribution data is seeded/mocked for now (see [Database Setup](#database-setup)). Real webhook ingestion — signature verification, `pull_request` event handling, points assignment on merge — is a planned follow-up phase, at which point this section will be filled in with the real setup steps.

---

## Database Setup

```bash
# Seed with realistic fake wave/contribution/leaderboard/reward data
npm run db:seed

# Reset (destructive — do not run in production)
npm run db:reset
```

Seed data is intentionally shaped to match the frontend's mock data structures 1:1, so switching the frontend's `USE_MOCK_DATA` flag to `false` against a locally running backend should require no frontend code changes.

---

## Running Tests

```bash
npm run test:unit          # services/utils, mocked dependencies
npm run test:integration   # real API tests against a test Mongo instance
npm test                   # all
npm run test:coverage
```

---

## Reconciliation Notes

This README was revised from an initial draft to match the contract the frontend was already built against, rather than the reverse. Changes made:

1. **Identity model** — replaced internal `contributorId`-based routes with wallet-address-based routes (`/contributions/:address`, `/rewards/:address`), matching the frontend's `X-Wallet-Address` header pattern. No JWT/login flow.
2. **Added `POST /rewards/claim`** — the original draft only had automatic payout via a background job with no contributor-initiated claim action; the frontend's UI requires an explicit claim endpoint.
3. **Added a flat `GET /leaderboard?scope=`** — original draft only had `/waves/:id/leaderboard`, with no all-time view.
4. **Added `GET /wave/current` and `GET /wave/history`** — original draft required listing all waves and filtering client-side.
5. **Dropped the `/api/v1` prefix** — kept flat to match what the frontend already calls; can be added later behind a proxy rule if needed without a frontend change.
6. **Dropped JWT auth requirement** — wallet address is sufficient identity for v1; add real auth if/when write actions beyond claiming are introduced.
7. **USDC amounts specified as strings everywhere**, not numbers — matches the precision fix already made in the frontend.
8. **Switched Postgres/Prisma → MongoDB/Mongoose** — matches the primary stack used elsewhere.
9. **Documented the exact `ContributionStatus` and `RewardDistribution.status` enums** the frontend already assumed, rather than leaving them unspecified.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.