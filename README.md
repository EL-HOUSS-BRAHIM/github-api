# GitHub Data Aggregation API

A robust backend API service for collecting, processing, and serving GitHub user data with location-based rankings and analytics.

## Last Update
    08/02/2025
    updating all files, fixing some bugs, restracture the repo to add the frontend, editing and fixing the frontend.
    09/02/2025
    updating all pages and styles.
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

1. Clone the repository:
```bash
git clone https://github.com/EL-HOUSS-BRAHIM/github-api.git
cd github-api
```

2. Install backend dependencies and prepare an environment file:
```bash
npm run install:backend
cp my-backend-app/.env.example my-backend-app/.env
```

3. Install frontend dependencies:
```bash
npm run install:frontend
```

4. Update `.env` with the values that match your setup. The defaults are tuned for local MySQL + Redis deployments:

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

The `.env.example` file in `my-backend-app/` documents these options for quick reference.

### Installation

Run the following commands from the repository root to install dependencies for each service:

```bash
npm run install:backend
npm run install:frontend
```

To install everything in one step, run:

```bash
npm run install:all
```

### Workspace scripts

The root `package.json` exposes helper commands for day-to-day tasks:

| Command | Description |
| --- | --- |
| `npm run install:backend` | Install backend dependencies |
| `npm run install:frontend` | Install frontend dependencies |
| `npm run install:all` | Install dependencies for both services |
| `npm run lint` | Lint backend and frontend projects |
| `npm run lint:backend` | Lint backend code only |
| `npm run lint:frontend` | Lint frontend code only |
| `npm run test` | Execute backend and frontend test suites |
| `npm run test:backend` | Run backend tests |
| `npm run test:frontend` | Run frontend tests |

### Git hooks

Husky and lint-staged enforce linting before commits. After installing dependencies, enable the hooks with:

```bash
npm run prepare
```

The configured pre-commit hook runs `lint-staged`, which currently triggers the backend and frontend lint tasks for staged JavaScript files.

### Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) installs dependencies, runs the aggregated lint command, and executes the backend and frontend test suites for every push and pull request targeting `main`.

### Running locally

Start the API (from `my-backend-app/`):
```bash
npm run dev
```

Start the Vite development server (from `frontend/`):
```bash
npm run dev
```

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

API contract tests are implemented with Jest and Supertest:
```bash
cd my-backend-app
npm test
```

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
