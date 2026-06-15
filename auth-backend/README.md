# Enterprise Authentication Backend

Production-ready authentication backend built with Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT, and Redis.

## 🚀 Features

- ✅ User registration with email verification
- ✅ Secure login with bcrypt password hashing
- ✅ JWT access & refresh tokens
- ✅ Token rotation on refresh
- ✅ Account locking after failed login attempts
- ✅ Password reset flow
- ✅ HTTP-only secure cookies for refresh tokens
- ✅ Redis for token management & rate limiting
- ✅ Rate limiting on all endpoints
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Zod input validation
- ✅ Centralized error handling
- ✅ TypeScript strict mode

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Redis (v6 or higher)

## 🛠️ Installation

### 1. Install Dependencies

```bash
cd auth-backend
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Update the following variables in `.env`:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Strong secret for access tokens
- `JWT_REFRESH_SECRET` - Strong secret for refresh tokens
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis configuration
- `FRONTEND_URL` - Your frontend URL for CORS

### 3. Setup Database

Generate Prisma client:
```bash
npm run prisma:generate
```

Run database migrations:
```bash
npm run prisma:migrate
```

Or push schema to database:
```bash
npm run prisma:push
```

### 4. Start Redis

Make sure Redis is running:
```bash
# Windows (if installed)
redis-server

# Linux/Mac
sudo service redis-server start
```

### 5. Run the Application

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

The server will start on `http://localhost:5000`

## 📡 API Endpoints

### Public Routes

#### **POST** `/api/auth/register`
Register a new user.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "STUDENT"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "uuid-here"
  }
}
```

---

#### **POST** `/api/auth/verify-email`
Verify email address.

**Body:**
```json
{
  "token": "verification-token-from-email"
}
```

---

#### **POST** `/api/auth/login`
Login to get access & refresh tokens.

**Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-access-token",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "STUDENT"
    }
  }
}
```

**Note:** Refresh token is set as HTTP-only cookie.

---

#### **POST** `/api/auth/refresh`
Refresh access token using refresh token.

**Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

Or send refresh token via HTTP-only cookie.

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-jwt-access-token"
  }
}
```

---

#### **POST** `/api/auth/forgot-password`
Request password reset.

**Body:**
```json
{
  "email": "john@example.com"
}
```

---

#### **POST** `/api/auth/reset-password`
Reset password using token.

**Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123"
}
```

---

### Protected Routes

**Note:** Include access token in Authorization header:
```
Authorization: Bearer <access-token>
```

#### **GET** `/api/auth/me`
Get current user profile.

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### **POST** `/api/auth/logout`
Logout and invalidate refresh token.

**Body (optional):**
```json
{
  "refreshToken": "refresh-token"
}
```

---

## 🔐 Token Flow

### Initial Login
1. User submits email & password
2. Server validates credentials
3. Server generates:
   - **Access Token** (15 min expiry) - for API authentication
   - **Refresh Token** (7 days expiry) - for getting new access tokens
4. Refresh token stored in:
   - Database (hashed)
   - Redis (for quick invalidation)
   - HTTP-only cookie (client-side)
5. Access token returned in response body

### Token Refresh
1. Client sends refresh token (from cookie or body)
2. Server verifies refresh token
3. Server generates NEW access & refresh tokens
4. Old refresh token invalidated
5. New refresh token stored & returned

### Logout
1. Refresh token deleted from database
2. Refresh token removed from Redis
3. HTTP-only cookie cleared
4. Client discards access token

### Security Features
- All tokens stored as SHA-256 hashes
- Refresh tokens rotate on every refresh
- Redis used for immediate token revocation
- HTTP-only cookies prevent XSS attacks
- Account locking after 5 failed login attempts (15 min lock)

## 🛡️ Security Features

- **Helmet** - Sets secure HTTP headers
- **CORS** - Configured for specific origins
- **Rate Limiting:**
  - 5 login attempts per 15 minutes
  - 3 registrations per hour
  - 3 password resets per 15 minutes
  - 100 general requests per 15 minutes
- **Password Requirements:**
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
- **bcrypt** - 12 rounds for password hashing
- **Token Hashing** - SHA-256 for stored tokens
- **Account Locking** - After 5 failed attempts

## 📁 Project Structure

```
auth-backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   ├── index.ts           # Environment config
│   │   ├── database.ts        # Prisma client
│   │   └── redis.ts           # Redis client
│   ├── controllers/
│   │   └── auth.controller.ts # Auth endpoints
│   ├── middleware/
│   │   ├── authenticate.ts    # JWT verification
│   │   ├── errorHandler.ts    # Error handling
│   │   ├── rateLimiter.ts     # Rate limiting
│   │   └── validate.ts        # Zod validation
│   ├── routes/
│   │   └── auth.routes.ts     # Route definitions
│   ├── services/
│   │   └── auth.service.ts    # Business logic
│   ├── utils/
│   │   ├── jwt.ts             # Token utilities
│   │   ├── password.ts        # Password hashing
│   │   └── response.ts        # Response formatting
│   ├── validators/
│   │   └── auth.validator.ts  # Zod schemas
│   └── server.ts              # Express app
├── .env                       # Environment variables
├── .env.example              # Example env file
├── package.json
└── tsconfig.json
```

## 🧪 Testing the API

You can test the API using tools like:
- **Postman**
- **Thunder Client** (VS Code extension)
- **cURL**
- **Insomnia**

### Example cURL Commands

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Get Profile:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📊 Database Schema

### Users Table
- `id` - UUID (Primary Key)
- `name` - String
- `email` - String (Unique)
- `password` - String (Hashed)
- `role` - Enum (STUDENT, TRAINER, INSTITUTE_ADMIN, PLATFORM_ADMIN)
- `status` - Enum (ACTIVE, SUSPENDED, PENDING_VERIFICATION)
- `emailVerified` - Boolean
- `failedLoginAttempts` - Integer
- `lockUntil` - DateTime (Nullable)
- `createdAt` - DateTime
- `updatedAt` - DateTime

### Tokens Table
- `id` - UUID (Primary Key)
- `userId` - UUID (Foreign Key → users.id)
- `tokenHash` - String
- `type` - Enum (ACCESS, REFRESH, EMAIL_VERIFICATION, PASSWORD_RESET)
- `expiresAt` - DateTime
- `createdAt` - DateTime

## 🔧 Development Scripts

```bash
npm run dev              # Run in development mode
npm run build            # Build for production
npm start                # Run production build
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:push      # Push schema to DB
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection | - |
| `JWT_ACCESS_SECRET` | Access token secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `BCRYPT_ROUNDS` | Bcrypt rounds | `12` |
| `MAX_LOGIN_ATTEMPTS` | Max failed logins | `5` |
| `LOCK_TIME_MINUTES` | Account lock duration | `15` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

## 🚨 Important Notes

1. **Change JWT Secrets** - Use strong, random secrets in production
2. **Email Service** - Currently tokens are logged to console. Implement email service (SendGrid, AWS SES, etc.) for production
3. **HTTPS** - Enable HTTPS in production for secure cookie transmission
4. **Redis** - Ensure Redis is running before starting the server
5. **Database Migrations** - Run migrations before first use

## 📄 License

MIT
