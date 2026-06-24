# Implementation Notes

## RLS Approach

The `notes` table is scoped to tenants via the existing `memberships` table, with Row-Level Security enforced entirely at the database level — no application-layer filtering is involved.

For **reads** (`SELECT`), the policy uses `auth.uid()` to look up the current user's group memberships and only surfaces notes belonging to those groups. For **writes** (`INSERT`), the policy applies the same membership check and additionally asserts that `author_id` matches `auth.uid()`, which prevents a user from inserting a note that impersonates another author. This means the database rejects unauthorized writes outright, rather than relying on the API to police them.

The `author_id` column carries a `default auth.uid()` so it is automatically populated from the session on insert, keeping the API route simple and free of manual JWT parsing.

## AI Usage

I used **Claude** (Anthropic) as an AI pair programmer throughout this task. Specifically:

- **Schema and policy design** — Claude helped draft the `0002_notes.sql` migration, including the RLS policies that reference `memberships` and enforce `author_id = auth.uid()`.
- **API route** — Claude reviewed the `POST /api/notes` handler and suggested removing redundant manual JWT parsing, since the database default already handles `author_id` correctly via `auth.uid()`.
- **Debugging** — When `npm run db:reset` and `npm test` both failed with `EAI_AGAIN`, Claude diagnosed the root cause (Supabase free-tier projects no longer expose a public IPv4 address on the direct `db.*` hostname) and guided switching `DATABASE_URL` to the IPv4 connection pooler endpoint, which resolved the issue immediately.
- **Test review** — Claude reviewed `tests/notes.test.ts` to confirm the `asUser` / `asOwner` harness was being used correctly and that the five test cases adequately covered read isolation, insert isolation, and impersonation prevention.
