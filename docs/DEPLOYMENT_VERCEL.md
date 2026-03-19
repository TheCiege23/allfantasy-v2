# Deploying AllFantasy to Vercel

## Why the dashboard shows "DATABASE_URL not available"

The dashboard (and any feature that uses the database) needs a **database connection string** at runtime. For security, this is never stored in the repo. It must be set in the **hosting environment**.

On Vercel, that means adding **Environment Variables** in the project settings. Until `DATABASE_URL` (and usually `NEXTAUTH_SECRET`) are set there, the dashboard will show:

> The dashboard can't load because this deployment is missing its database connection setting.

## Fix: Add required env vars in Vercel

1. Open your project in the **Vercel dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select the **AllFantasy** project (or the project for this app).
3. Go to **Settings** → **Environment Variables**.
4. Add the following (required for the dashboard to load):

   | Name             | Value                    | Environments   |
   |------------------|--------------------------|----------------|
   | `DATABASE_URL`   | Your Prisma/DB URL       | Production, Preview (and Development if you use Vercel dev) |
   | `NEXTAUTH_SECRET`| A long random secret     | Same           |

   - **DATABASE_URL**: Use the connection string from your database provider (e.g. PostgreSQL from Neon, PlanetScale, Supabase, or your own Postgres). It usually looks like:
     - `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`
   - **NEXTAUTH_SECRET**: Generate one with `openssl rand -base64 32` or any secure random string.

5. **Redeploy** the project (e.g. **Deployments** → … on latest deployment → **Redeploy**), or push a new commit so a fresh build runs with the new variables.

After redeploying, the dashboard should load as long as the database is reachable from Vercel.

## Still seeing "DATABASE_URL" missing after adding it?

Vercel only injects environment variables into **new** deployments. Editing variables alone is not enough.

1. **Redeploy**
   - In Vercel: **Deployments** → open the **…** menu on the latest deployment → **Redeploy**.
   - Or push a new commit so a fresh deployment runs.
   - Optionally use **Redeploy** → **Clear cache and redeploy** if you suspect caching.

2. **Environment scope**
   - When adding the variable, ensure it’s enabled for the environment you’re viewing:
     - **Production** → your main domain (e.g. `yourapp.vercel.app` or custom domain).
     - **Preview** → branch/PR URLs. If you open a preview URL, the variable must be set for **Preview** (or all).

3. **Exact variable name**
   - Use exactly `DATABASE_URL` (all caps, underscore). Not `database_url` or `Database_Url`.

4. **Neon**
   - Use the connection string from Neon’s dashboard (e.g. **Connection string** for your branch). Prefer the **pooled** URL if shown; it works better with serverless.

## Local development

Copy `.env.example` to `.env` and set `DATABASE_URL` and `NEXTAUTH_SECRET` (and any other keys you need). Never commit `.env`; it is gitignored.

## Reference

- [Vercel: Environment Variables](https://vercel.com/docs/projects/environment-variables)
- Project `.env.example` lists all optional and required variables.
