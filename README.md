# Notification Preferences Service

A unified source of truth for user notification preferences management. This service handles user preferences, global policies, and quiet hours to determine whether notifications can be sent.

## Features

- **User Preferences Management**: Store and retrieve individual user notification preferences
- **Global Policies**: Define region-based notification restrictions
- **Quiet Hours**: Configure time-based notification blocking per user timezone
- **Idempotent Operations**: Safe, repeatable preference updates
- **Comprehensive Evaluation**: Check if a notification can be sent based on all rules

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Database**: PostgreSQL
- **API**: RESTful Express.js
- **Testing**: Jest + Supertest
- **Validation**: Zod
- **Logging**: Winston

## Architecture

The service follows Clean Architecture principles with clear separation of concerns:

```
src/
├── domain/           # Business entities and rules
├── application/      # Use cases and services
├── infrastructure/   # External adapters (DB, API)
└── shared/          # Shared utilities and types
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (optional)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd notification-preferences-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

### Using Docker (Recommended)

1. Start the services:
   ```bash
   npm run docker:up
   ```

2. Run database migrations:
   ```bash
   npm run migrate:up
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Manual Setup

1. Start PostgreSQL:
   ```bash
   # Create databases
   createdb notification_preferences
   createdb notification_preferences_test
   ```

2. Run migrations:
   ```bash
   npm run migrate:up
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### 1. Get User Preferences
```http
GET /users/:userId/preferences
```

**Response:**
```json
{
  "userId": "user-123",
  "preferences": [
    {
      "notificationType": "marketing_email",
      "channel": "email",
      "enabled": true
    }
  ],
  "quietHours": {
    "start": "22:00",
    "end": "08:00",
    "timezone": "Europe/London"
  }
}
```

### 2. Update User Preferences
```http
POST /users/:userId/preferences
```

**Request Body:**
```json
{
  "preferences": [
    {
      "notificationType": "marketing_email",
      "channel": "email",
      "enabled": false
    }
  ],
  "quietHours": {
    "start": "22:00",
    "end": "08:00",
    "timezone": "Europe/London"
  }
}
```

### 3. Evaluate Notification
```http
POST /evaluate
```

**Request Body:**
```json
{
  "userId": "user-123",
  "notificationType": "marketing_email",
  "channel": "email",
  "region": "EU",
  "datetime": "2026-05-21T21:30:00Z"
}
```

**Response:**
```json
{
  "decision": "allow",
  "reason": "notification_allowed"
}
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Database Schema

The service uses the following main tables:

- `users`: User information
- `user_preferences`: Individual notification preferences
- `global_policies`: Region-based notification restrictions
- `default_preferences`: Default settings for new users

## Development

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Linting with auto-fix
npm run lint:fix
```

### Building for Production

```bash
npm run build
npm start
```

## Production Considerations

If I were to take this service to production, I would:

1. **Add Authentication & Authorization**: Integrate with OAuth2/JWT for secure API access
2. **Implement Caching**: Add Redis for frequently accessed preferences
3. **Add Monitoring**: Integrate with Prometheus/Grafana for metrics
4. **Implement Rate Limiting**: Protect API endpoints from abuse
5. **Add Circuit Breakers**: Handle database/third-party service failures gracefully
6. **Implement Message Queue**: Use RabbitMQ/Kafka for async preference updates
7. **Add API Versioning**: Support backward compatibility
8. **Implement Feature Flags**: Gradual rollout of new features
9. **Add Distributed Tracing**: Use OpenTelemetry for request tracing
10. **Enhance Security**: Add request validation, input sanitization, and security headers

## License

ISC
## Testing

The service includes comprehensive test coverage:

### Test Structure

```
src/__tests__/
├── test-utils.ts              # Test utilities and constants
├── setup.ts                   # Test setup and teardown
├── db-test-utils.ts          # Database test utilities
├── business-scenarios.test.ts # Business requirement tests
├── e2e-flow.test.ts          # End-to-end flow tests
└── integration/
    └── api.test.ts           # API integration tests

src/domain/__tests__/
├── UserPreferences.entity.test.ts
└── NotificationEvaluator.service.test.ts

src/application/__tests__/
└── GetUserPreferences.use-case.test.ts
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run CI tests
npm run test:ci
```

### Test Coverage

The tests cover:

1. **Domain Layer**: Business entities, services, and rules
2. **Application Layer**: Use cases and DTO validation
3. **Infrastructure Layer**: Repositories and API controllers
4. **Integration**: API endpoints and database interactions
5. **Business Scenarios**: All requirements from the specification
6. **End-to-End**: Complete user journeys

### Test Database

Tests use a separate test database (`notification_preferences_test`). The test database is automatically:
- Created and migrated before tests
- Cleared between test cases
- Torn down after tests

### Test Scenarios Covered

Based on the requirements, tests verify:

1. **New User and Defaults**: Default preferences for new users
2. **User Preference Changes**: Idempotent updates and reflection in evaluation
3. **Quiet Hours**: Time-based blocking for marketing notifications
4. **Global Policies**: Region-based notification restrictions
5. **Idempotent Operations**: Safe, repeatable preference updates
6. **Complex Combinations**: Multiple rules applied together
7. **Error Handling**: Validation errors and edge cases
8. **Performance**: Concurrent requests and rapid updates

### Test Data

Test data includes:
- Sample users with various preference configurations
- Default preferences matching common use cases
- Global policies for different regions
- Quiet hours configurations
- Notification evaluation test cases