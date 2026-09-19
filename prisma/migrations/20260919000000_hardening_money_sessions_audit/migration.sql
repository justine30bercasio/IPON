-- Hardening: integer-cent money, session invalidation, auditability, integrity constraints

-- AlterTable User: session version for global sign-out, forced password change flag
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable HulogTransaction: store money as integer centavos (exact arithmetic)
ALTER TABLE "HulogTransaction" ALTER COLUMN "amount" TYPE INTEGER USING ROUND("amount" * 100)::INTEGER;

-- AlterTable HulogTransaction: void audit trail
ALTER TABLE "HulogTransaction" ADD COLUMN "voidedByUserId" TEXT;
ALTER TABLE "HulogTransaction" ADD COLUMN "voidedAt" TIMESTAMP(3);

-- AddForeignKey voidedBy
ALTER TABLE "HulogTransaction" ADD CONSTRAINT "HulogTransaction_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable ActivityLog: org scoping for cross-entity audit
ALTER TABLE "ActivityLog" ADD COLUMN "orgId" TEXT;
UPDATE "ActivityLog" SET "orgId" = "Challenge"."orgId" FROM "Challenge" WHERE "Challenge"."id" = "ActivityLog"."challengeId";
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Integrity: refuse deletion paths that would destroy financial history
ALTER TABLE "ChallengeMember" DROP CONSTRAINT "ChallengeMember_userId_fkey";
ALTER TABLE "ChallengeMember" ADD CONSTRAINT "ChallengeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HulogTransaction" DROP CONSTRAINT "HulogTransaction_memberId_fkey";
ALTER TABLE "HulogTransaction" ADD CONSTRAINT "HulogTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ChallengeMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Performance indexes
CREATE INDEX "HulogTransaction_challengeId_status_idx" ON "HulogTransaction"("challengeId", "status");
CREATE INDEX "Notification_challengeId_idx" ON "Notification"("challengeId");
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");
CREATE INDEX "ActivityLog_orgId_createdAt_idx" ON "ActivityLog"("orgId", "createdAt");