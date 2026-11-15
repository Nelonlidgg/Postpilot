
# PostPilot

A full-stack social content scheduling and automation
platform for creators, businesses, and teams.

## Overview

PostPilot enables users to compose, manage, and
schedule social media content from a centralized
workspace. It uses background job processing to
automate scheduled publishing and handle failures
through retry mechanisms.

## Planned Features

- Secure authentication and session management
- Workspace management and role-based access control
- Simulated social media account connections
- Post composition and media uploads
- Content scheduling and calendar management
- Background publishing with Redis and BullMQ
- Publishing status tracking and automatic retries
- Responsive content management dashboard

## Technology Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query

### Backend
- NestJS
- TypeScript
- PostgreSQL
- Prisma

### Infrastructure
- Redis
- BullMQ
- Docker
- GitHub Actions

## Project Structure

This project uses a monorepo architecture managed
with npm workspaces.

## Development Status

Currently in active development.

See [PROGRESS.md](./PROGRESS.md) for the development
roadmap and completed milestones.

## Integration Notice

Social media publishing is simulated for
demonstration and development purposes.

## Author

Developed as a full-stack software engineering
portfolio project.


## Local Infrastructure Setup

### Prerequisites

- Node.js
- npm
- Git
- Docker Desktop
- Docker Compose

### Getting Started

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Configure your local environment variables.
4. Start the infrastructure:

   ```bash
   docker compose up -d
   ```

5. Verify the containers:

   ```bash
   docker compose ps
   ```

### Local Services

| Service | Host | Port |
|---------|------|------|
| PostgreSQL | localhost | 5433 |
| Redis | localhost | 6380 |

To stop the infrastructure:

```bash
docker compose stop
```
