-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- Seed default org that owns all current production data
INSERT INTO "Organization" ("id", "name", "slug", "updatedAt")
VALUES ('org_icdec', 'ICDeC', 'icdec', CURRENT_TIMESTAMP);

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "orgId" TEXT;
UPDATE "User" SET "orgId" = 'org_icdec' WHERE "orgId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "orgId" SET NOT NULL;

-- AlterTable Challenge
ALTER TABLE "Challenge" ADD COLUMN "orgId" TEXT;
UPDATE "Challenge" SET "orgId" = 'org_icdec';
ALTER TABLE "Challenge" ALTER COLUMN "orgId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");
CREATE INDEX "Challenge_orgId_idx" ON "Challenge"("orgId");