# GitHub Data Aggregation API

A robust backend API service for collecting, processing, and serving GitHub user data with location-based rankings and analytics.

## Last Update
    06/02/2025
    adding user info refresh endpoints and futures
## Features

- **User Data Collection**
  - Profile information
  - Repository statistics
  - Activity tracking
  - Contribution history

- **Location-Based Analytics**
  - Country-specific rankings
  - City-based developer discovery
  - Regional activity tracking
  - Multi-language location support

- **Performance Features**
  - Redis caching
  - Rate limit handling
  - Bull queue for background jobs
  - Pagination support

## Tech Stack

- Node.js & Express
- MySQL with Sequelize ORM
- Redis for caching
- Bull for job queues
- Docker support
- Swagger API documentation

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.0
- Redis
- GitHub API token

### Environment Setup

1. Install dependencies and prepare a local environment file:
```bash
npm install
cp .env.example .env
```

2. Configure your environment variables in `.env`:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port used by the Express API |
| `DB_HOST` | `127.0.0.1` | MySQL host name |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | Database user for the ingestion schema |
| `DB_PASSWORD` | _(blank)_ | Password for `DB_USER` |
| `DB_NAME` | `github_insights` | Database name used by Sequelize |
| `DB_SSL_CA_PATH` | _(blank)_ | Optional absolute path to a CA certificate when connecting over TLS |
| `DB_SSL_REJECT_UNAUTHORIZED` | `true` | Set to `false` to skip certificate validation in non-production environments |
| `GITHUB_TOKENS` | _(blank)_ | Comma separated list of GitHub personal access tokens used for rate-limit rotation |
| `REDIS_HOST` | `127.0.0.1` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_USERNAME` | _(blank)_ | Optional username when Redis ACLs are enabled |
| `REDIS_PASSWORD` | _(blank)_ | Redis password when authentication is required |
| `REDIS_TLS` | `false` | Set to `true` to enable TLS connections to Redis |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Duration of the API rate limit window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | `120` | Maximum number of requests allowed per IP per window |
| `QUEUE_CLEANUP_MODE` | `nonprod` | `always`, `never`, or `nonprod` to control startup queue cleanups |
| `QUEUE_CLEANUP_STATUSES` | _(blank)_ | Optional comma-separated Bull statuses to clean during startup |
| `QUEUE_CLEANUP_GRACE_MS` | `600000` | Grace period (ms) applied to queue cleanups when enabled |
| `RANKING_LOCK_TTL_MS` | `3600000` | TTL for the distributed scheduler lock ensuring single ranking updates |

### Installation

Install dependencies:
```bash
npm install
```

> **Note:** The backend now expects explicit database migrations. Run them before serving traffic:

```bash
npm run migrate
```

If you prefer Docker, the included `docker-compose.yml` spins up MySQL and Redis. Otherwise, provision the services manually and point the environment variables to them.

### Running locally

Start the API with hot reload:
```bash
npm run dev
```

The development server automatically:

- Runs any pending Sequelize migrations on boot.
- Skips destructive queue cleanups unless `QUEUE_CLEANUP_MODE=always`.
- Logs HTTP access details (suppressed in the test environment).
- Enforces a shared rate limit of `RATE_LIMIT_MAX_REQUESTS` per `RATE_LIMIT_WINDOW_MS` for all `/api/*` routes.

## API Documentation

Access the Swagger documentation at http://localhost:3000/api-docs



### Main Endpoints

- `GET /api/user/:username` - Get user profile
- `GET /api/user/:username/repos` - Get user repositories
- `GET /api/user/:username/activity` - Get user activity
- `GET /api/user/:username/report` - Get detailed user report
- `POST /api/ranking/harvest/:country` - Harvest users by country

## Development

### Testing

Run the Jest test suite:
```bash
npm test
```

### Database migrations

The service relies on Sequelize migrations managed via [Umzug](https://github.com/sequelize/umzug). Useful commands:

```bash
# Apply pending migrations
npm run migrate

# View execution status
npm run migrate:status

# Revert the latest migration
npm run migrate:down
```

Migrations run automatically during API startup, guaranteeing schema parity across environments without relying on `sequelize.sync({ alter: true })`.

### Operational controls

- **Queue hygiene:** Control Bull queue cleanup behaviour through `QUEUE_CLEANUP_MODE`. The default `nonprod` skips cleanup in production while keeping local/test environments tidy.
- **Scheduler safety:** Ranking refreshes acquire a Redis-backed distributed lock (`RANKING_LOCK_TTL_MS`) so that only one instance processes each cron window.
- **Secrets enforcement:** When `NODE_ENV=production`, the server refuses to start unless `DB_PASSWORD`, `REDIS_PASSWORD`, and at least one `GITHUB_TOKENS` entry are supplied.
- **Observability & protection:** Lightweight in-process HTTP access logging and an IP-based rate limiter are enabled by default. Tune their thresholds with the environment variables above.

### Deployment checklist

1. Provision MySQL, Redis, and a secrets manager (or environment variable store) with the credentials referenced in `.env.example`.
2. Seed the runtime environment with `DB_PASSWORD`, `REDIS_PASSWORD`, and rotated GitHub tokens. These are mandatory in production.
3. Run database migrations (`npm run migrate`) as part of your deployment pipeline before starting new application instances.
4. Ensure every instance can reach the shared Redis deployment—distributed locks depend on it for safe scheduling.
5. Set `QUEUE_CLEANUP_MODE=never` (or leave as `nonprod`) in production to avoid wiping in-flight jobs during rolling deploys.
6. Monitor application logs and 429 responses to fine-tune `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` for your workload.

## Docker Support

Build and run using Docker Compose:
```bash
docker-compose up --build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

EL-HOUSS-BRAHIM

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request