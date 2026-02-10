-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('PENDING', 'APPROVED', 'INVITED', 'REGISTERED');

-- CreateTable
CREATE TABLE "waitlist_users" (
    "id" TEXT NOT NULL,
    "oauth_provider" TEXT NOT NULL,
    "oauth_id" TEXT NOT NULL,
    "email" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "display_name" TEXT,
    "oauth_avatar_url" TEXT,
    "custom_avatar_url" TEXT,
    "twitter_id" TEXT,
    "twitter_handle" TEXT,
    "twitter_connected_at" TIMESTAMP(3),
    "games" TEXT[],
    "referral_code" TEXT NOT NULL,
    "used_referral_code" TEXT,
    "referred_by_id" TEXT,
    "referral_count" INTEGER NOT NULL DEFAULT 0,
    "reputation_points" INTEGER NOT NULL DEFAULT 0,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'PENDING',
    "invited_at" TIMESTAMP(3),
    "registered_at" TIMESTAMP(3),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_users_twitter_id_key" ON "waitlist_users"("twitter_id");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_users_referral_code_key" ON "waitlist_users"("referral_code");

-- CreateIndex
CREATE INDEX "waitlist_users_email_idx" ON "waitlist_users"("email");

-- CreateIndex
CREATE INDEX "waitlist_users_referral_code_idx" ON "waitlist_users"("referral_code");

-- CreateIndex
CREATE INDEX "waitlist_users_used_referral_code_idx" ON "waitlist_users"("used_referral_code");

-- CreateIndex
CREATE INDEX "waitlist_users_created_at_idx" ON "waitlist_users"("created_at");

-- CreateIndex
CREATE INDEX "waitlist_users_status_idx" ON "waitlist_users"("status");

-- CreateIndex
CREATE INDEX "waitlist_users_reputation_points_idx" ON "waitlist_users"("reputation_points");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_users_oauth_provider_oauth_id_key" ON "waitlist_users"("oauth_provider", "oauth_id");

-- AddForeignKey
ALTER TABLE "waitlist_users" ADD CONSTRAINT "waitlist_users_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "waitlist_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
