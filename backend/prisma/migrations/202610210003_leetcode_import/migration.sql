ALTER TABLE "connected_accounts" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SELF_REPORTED', ADD COLUMN "lastImportedAt" TIMESTAMP(3), ADD COLUMN "lastSyncAt" TIMESTAMP(3), ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'UNAVAILABLE';
CREATE TABLE "imported_submissions" (
 "id" UUID PRIMARY KEY, "userId" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "provider" TEXT NOT NULL DEFAULT 'leetcode', "username" TEXT NOT NULL, "externalId" TEXT NOT NULL,
 "problemId" TEXT NOT NULL, "title" TEXT NOT NULL, "difficulty" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL,
 "verificationSource" TEXT NOT NULL DEFAULT 'SELF_REPORTED_IMPORT', "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "imported_submissions_userId_provider_externalId_key" ON "imported_submissions"("userId", "provider", "externalId");
CREATE INDEX "imported_submissions_userId_occurredAt_idx" ON "imported_submissions"("userId", "occurredAt");
ALTER TABLE "imported_submissions" ENABLE ROW LEVEL SECURITY;
