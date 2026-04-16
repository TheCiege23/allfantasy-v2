import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const res = await client.query(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'leagues',
    'league_settings',
    'league_waiver_settings',
    'draft_sessions',
    'redraft_seasons',
    'redraft_rosters',
    'redraft_matchups',
    'redraft_waiver_claims',
    'redraft_league_trades'
  )
  ORDER BY table_name
`);
res.rows.forEach(r => console.log(r.table_name));
await client.end();
