-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'APPROVED', 'INVITED', 'REGISTERED');

-- CreateTable
CREATE TABLE "whitelist_entries" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "games" TEXT[],
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "whitelist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whitelist_entries_email_key" ON "whitelist_entries"("email");

-- CreateIndex
CREATE INDEX "whitelist_entries_email_idx" ON "whitelist_entries"("email");

-- CreateIndex
CREATE INDEX "whitelist_entries_created_at_idx" ON "whitelist_entries"("created_at");

-- CreateIndex
CREATE INDEX "whitelist_entries_status_idx" ON "whitelist_entries"("status");
