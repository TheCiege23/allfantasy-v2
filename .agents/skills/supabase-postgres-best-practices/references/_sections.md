# Section Definitions

This file defines the rule categories for Postgres best practices. Rules are automatically assigned to sections based on their filename prefix.

Take the examples below as pure demonstrative. Replace each section with the actual rule categories for Postgres best practices.

---

## 1. Query Performance (query)
**Impact:** CRITICAL
**Description:** Slow queries, missing indexes, inefficient query plans. The most common source of Postgres performance issues.

## 2. Connection Management (conn)
**Impact:** CRITICAL
**Description:** Connection pooling, limits, and serverless strategies. Critical for applications with high concurrency or serverless deployments.

## 3. Security & RLS (security)
**Impact:** CRITICAL
**Description:** Row-Level Security policies, privilege management, and authentication patterns.

## 4. Schema Design (schema)
**Impact:** HIGH
**Description:** Table design, index strategies, partitioning, and data type selection. Foundation for long-term performance.

## 5. Concurrency & Locking (lock)
**Impact:** MEDIUM-HIGH
**Description:** Transaction management, isolation levels, deadlock prevention, and lock contention patterns.

## 6. Data Access Patterns (data)
**Impact:** MEDIUM
**Description:** N+1 query elimination, batch operations, cursor-based pagination, and efficient data fetching.

## 7. Monitoring & Diagnostics (monitor)
**Impact:** LOW-MEDIUM
**Description:** Using pg_stat_statements, EXPLAIN ANALYZE, metrics collection, and performance diagnostics.

## 8. Advanced Features (advanced)
**Impact:** LOW
**Description:** Full-text search, JSONB optimization, PostGIS, extensions, and advanced Postgres features.

## 9. DDL & Table Creation (ddl)
**Impact:** HIGH
**Description:** Idempotent CREATE TABLE, ALTER TABLE, enum creation, index creation, and safe DROP patterns for Supabase-compatible schema changes.

## 10. Migration Patterns (migrate)
**Impact:** HIGH
**Description:** Supabase migration file conventions, idempotent DDL patterns, incremental patch scripts, and rollback strategies.

## 11. Supabase Auth Integration (auth)
**Impact:** CRITICAL
**Description:** RLS policies using auth.uid(), service role bypass for admin operations, and linking Supabase Auth users to application tables.

## 12. Supabase Platform Features (supa)
**Impact:** MEDIUM
**Description:** Realtime subscriptions, Storage bucket management, and Edge Function database access patterns.

## 13. Prisma-to-Supabase Workflow (prisma)
**Impact:** HIGH
**Description:** Prisma schema export pipeline, type mapping, ensure scripts for column additions, and the no-foreign-key philosophy.
