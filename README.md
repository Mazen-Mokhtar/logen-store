# E-Commerce System

A comprehensive e-commerce platform built with NestJS, featuring a modern backend API and Next.js frontend.

## Features

- 🛍️ **Complete E-commerce Solution**: Product catalog, shopping cart, checkout, and order management
- 🔐 **Authentication & Authorization**: JWT-based auth with role-based access control
- 💳 **Payment Integration**: Stripe payment processing with webhook support
- 📧 **Email System**: Automated email notifications and confirmations
- 🔒 **Security**: Helmet.js, rate limiting, CSRF protection, and input validation
- 📊 **Monitoring**: Health checks, logging, and performance monitoring
- 🐳 **Docker Support**: Containerized deployment with Docker Compose
- 📱 **Modern Frontend**: Next.js with TypeScript and Tailwind CSS

## Tech Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens
- **Payment**: Stripe
- **File Storage**: Cloudinary
- **Email**: SMTP with Gmail
- **Caching**: Redis
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **UI Components**: Custom components with modern design

## Description

A full-stack e-commerce platform with secure payment processing, user management, and modern UI/UX.

## Project setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Redis (for caching)
- Git

### Installation

1. **Clone the repository:**
```bash
git clone <your-repository-url>
cd my-system
```

2. **Install backend dependencies:**
```bash
npm install
```

3. **Install frontend dependencies:**
```bash
cd frontend
npm install
cd ..
```

4. **Environment setup:**
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
# Update database URLs, API keys, and other settings
```

5. **Database setup:**
```bash
# Make sure MongoDB is running
# The application will connect automatically using DB_URL from .env
```

## Development

### Backend Development
```bash
# Start in development mode with hot reload
npm run start:dev

# Start in debug mode
npm run start:debug
```

### Frontend Development
```bash
# Navigate to frontend directory
cd frontend

# Start Next.js development server
npm run dev
```

### Full Stack Development
```bash
# Start both backend and frontend (if configured)
npm run start:dev
```

## Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Run test coverage
npm run test:cov

# Run integration tests
npm run test:integration

# Run smoke tests
npm run test:smoke
```

## API Documentation

When running in development mode, API documentation is available at:
- Swagger UI: `http://localhost:3000/api/docs`

## Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Database
DB_URL=mongodb://localhost:27017/your-database

# Server
PORT=3000
NODE_ENV=development

# Authentication
SIGNATURE_USER=your-jwt-secret
SIGNATURE_ADMIN=your-admin-jwt-secret

# Email
EMAIL=your-email@example.com
EMAIL_PASS=your-email-password

# Payment (Stripe)
STRIPE_SECRET=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# File Storage (Cloudinary)
CLOUD_NAME=your-cloudinary-name
API_KEY=your-cloudinary-key
API_SECRET=your-cloudinary-secret
```

## Git Setup

This project is ready for Git version control:

1. **Initialize Git repository (if not already done):**
```bash
git init
```

2. **Add files to Git:**
```bash
git add .
git commit -m "Initial commit"
```

3. **Add remote repository:**
```bash
git remote add origin <your-repository-url>
git push -u origin main
```

## Security Notes

- The `.env` file contains sensitive information and is excluded from Git
- Use `.env.example` as a template for required environment variables
- Never commit API keys, passwords, or secrets to version control
- Update default JWT signatures in production

## Deployment

### Docker Deployment (Recommended)

#### Prerequisites
- Docker and Docker Compose installed
- Environment variables configured

#### Quick Start with Docker

1. **Build and run with Docker Compose:**
```bash
# Start all services (API + MongoDB + Nginx)
$ npm run docker:compose

# Or run in development mode
$ npm run docker:compose:dev

# Stop all services
$ npm run docker:stop
```

2. **Build Docker image only:**
```bash
$ npm run docker:build
$ npm run docker:run
```

#### Production Deployment

1. **Prepare environment:**
```bash
# Copy production environment file
$ cp .env.production .env

# Update environment variables for your production setup
$ nano .env
```

2. **Deploy to production:**
```bash
$ npm run deploy:prod
```

#### Environment Configuration

- `.env.example` - Template for environment variables
- `.env.production` - Production environment configuration
- Update `ALLOWED_ORIGINS` with your frontend URL
- Configure MongoDB connection string
- Set up Stripe keys for payment processing

#### Security Features

- Helmet.js for security headers
- Rate limiting on authentication endpoints
- CSRF protection
- Input validation and sanitization
- Security monitoring and logging

#### Health Checks

The application includes health check endpoints:
- `GET /health` - Application health status
- Docker health checks configured

### Traditional Deployment

For traditional server deployment:

```bash
# Install dependencies
$ npm install

# Build the application
$ npm run build

# Start in production mode
$ npm run start:prod
```

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
