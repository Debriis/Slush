import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
// Run only against an explicitly disposable, migrated Supabase test project.
// Never silently connect integration tests to the production database.
test(
  'PostgreSQL RLS policies and duplicate-prevention index definitions',
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const db = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL,
    });
    try {
      const tables =
        await db.$queryRaw`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('chat_messages','xp_transactions','profiles','posts')`;
      assert.equal(tables.length, 4);
      assert.ok(tables.every((t) => t.rowsecurity));
      const policies =
        await db.$queryRaw`SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages'`;
      assert.ok(policies.some((p) => p.policyname === 'clan_chat_select'));
      const indexes =
        await db.$queryRaw`SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='coding_activities'`;
      assert.ok(
        indexes.some(
          (row) => row.indexdef.includes('UNIQUE') && row.indexdef.includes('problemId'),
        ),
      );
    } finally {
      await db.$disconnect();
    }
  },
);
