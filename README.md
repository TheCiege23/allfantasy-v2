# AllFantasy.ai

AI-powered fantasy sports platform for drafts, waivers, start/sit, and modern league formats across NFL, NBA, and MLB.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Neon Postgres
- **Deployment**: Vercel

## Features

- Futuristic dark theme with neon accents
- Early access email signup with rate limiting
- Success page with confetti celebration
- User questionnaire for preferences
- Password-protected admin panel with analytics
- AF Legacy coming soon page
- Full SEO implementation (metadata, OpenGraph, sitemap, robots.txt, JSON-LD)


### 1. Provision PostgreSQL Database

1. Open the project
2. Go to the "Database" tab in the left sidebar
3. Click "Create a database" and select PostgreSQL
4. The DATABASE_URL will be automatically set

### 2. Set Environment Variables

In your environment secrets, add:

- `ADMIN_PASSWORD`: Your secure admin password

### 3. Run Prisma Migrations

In the Shell:

\`\`\`bash
npx prisma db push
\`\`\`

### 4. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

The app runs on **port 3000** by default (`next dev`). For script-based tests (e.g. smoke tests, QA) set `BASE_URL=http://localhost:3000` or pass the URL as configured.

## Project Structure

\`\`\`
├── app/
│   ├── api/
│   │   ├── admin/route.ts       # Admin API
│   │   ├── early-access/route.ts # Email signup
│   │   ├── legacy/route.ts      # Coming soon placeholder
│   │   └── questionnaire/route.ts
│   ├── admin/page.tsx           # Admin dashboard
│   ├── af-legacy/page.tsx       # Coming soon page
│   ├── success/page.tsx         # Success + questionnaire
│   ├── robots.txt/route.ts      # SEO
│   ├── sitemap.xml/route.ts     # SEO
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                 # Landing page
├── lib/
│   ├── prisma.ts                # Database client
│   ├── rate-limit.ts            # In-memory rate limiting
│   └── validation.ts            # Zod schemas
├── prisma/
│   └── schema.prisma            # Database schema
└── package.json
\`\`\`

## API Endpoints

- `POST /api/early-access` - Submit email for early access
- `POST /api/questionnaire` - Submit user preferences
- `POST /api/admin` - Admin login and data fetch
- `GET /api/legacy` - Returns coming_soon status

## Database Models

### EarlyAccessSignup
- id (UUID)
- email (unique)
- source (optional)
- createdAt

### QuestionnaireResponse
- id (UUID)
- email (indexed)
- favoriteSport
- favoriteLeagueType
- competitiveness
- draftPreference
- painPoint
- experimentalInterest (string array)
- freeText (optional)
- createdAt

sync test


