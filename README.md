# GitHub Data Aggregation API

A robust backend API service for collecting, processing, and serving GitHub user data with location-based rankings and analytics.

## Last Update
    05/02/2025
    tasting ranking future
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

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
```
PORT=3000
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=github_data
GITHUB_TOKEN=your_github_token
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the services using Docker:
```bash
docker-compose up -d
```

3. Run the application:
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

Run the development server with hot reload:
```bash
npm run dev
```

Run the worker process:
```bash
npm run worker
```

Clear Redis cache:
```bash
npm run clear-cache
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