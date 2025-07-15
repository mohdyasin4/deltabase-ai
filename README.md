# Getting Started

## Prerequisites
- Node.js and yarn/bun installed
- Accounts and API keys for:
  - Supabase
  - Stripe (if using payments)
  - Clerk (if using authentication)

## Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:
   ```
   yarn
   ```

3. Set up environment variables:
   Copy the example environment file and configure your values:
   ```
   cp .env.example .env
   ```
   
   Then edit the `.env` file with your actual API keys and configuration values:
   - **Clerk**: Authentication service keys
   - **Supabase**: Database and service role keys
   - **Stripe**: Payment processing keys (if using payments)
   - **Upstash Redis**: Caching service keys
   - **Gemini AI**: Google AI API key for SQL generation
   - **UploadThing**: File upload service keys
   - **Text-to-Speech**: Optional API keys for voice features
   
   All required environment variables are documented in `.env.example`

4. Configure features:
   In `config.ts`, set the desired features:
   ```typescript
   const config = {
     auth: {
       enabled: true, // Set to false if not using Clerk
     },
     payments: {
       enabled: true, // Set to false if not using Stripe
     }
   };
   ```

5. Set up the database:
   Run Prisma migrations:
   ```
   npx prisma migrate dev
   ```

6. Start the development server:
   ```
   yarn dev
   ```

7. Open your browser and navigate to `http://localhost:3000` to see your application running.

## Additional Configuration

- Webhooks: Set up webhooks for Clerk (if using auth) at `/api/auth/webhook` and for Stripe (if using payments) at `/api/payments/webhook`.
- Customize the landing page, dashboard, and other components as needed.
- Modify the Prisma schema in `prisma/schema.prisma` if you need to change the database structure.

## Important Security Notes

- Enable Row Level Security (RLS) in your Supabase project to ensure data protection at the database level.
- Always make Supabase calls on the server-side (in API routes or server components) to keep your service key secure.

## Learn More

Refer to the documentation of the individual technologies used in this project for more detailed information:
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Documentation](https://clerk.dev/docs) (if using auth)
- [Stripe Documentation](https://stripe.com/docs) (if using payments)
