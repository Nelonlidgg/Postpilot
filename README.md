
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
