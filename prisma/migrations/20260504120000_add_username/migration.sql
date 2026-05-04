-- AlterTable: add username column (nullable, no default — adds quickly on large tables).
ALTER TABLE "waitlist_users" ADD COLUMN "username" TEXT;

-- Backfill existing rows. The slug source mirrors lib/utils.ts formatDisplayName so that
-- /r/{username} matches the identity shown on the profile card:
--   - twitter users -> twitter_handle
--   - google users with email -> email prefix (split_part on '@')
--   - everyone else -> display_name
-- Then slugify that source: lowercase, non-alphanumeric runs -> '-', trim hyphens, max 30 chars.
-- If slug matches /^[a-z0-9]{6}$/ (would collide with referral-code namespace), append '-1'.
-- Disambiguate collisions deterministically: ORDER BY created_at so the oldest account
-- keeps the bare slug and later accounts get '-2', '-3', ...
WITH base AS (
  SELECT
    id,
    created_at,
    NULLIF(
      regexp_replace(
        substring(
          regexp_replace(
            regexp_replace(
              lower(COALESCE(
                CASE
                  WHEN oauth_provider = 'twitter' AND twitter_handle IS NOT NULL THEN twitter_handle
                  WHEN oauth_provider = 'google' AND email IS NOT NULL THEN split_part(email, '@', 1)
                  ELSE display_name
                END,
                ''
              )),
              '[^a-z0-9]+', '-', 'g'
            ),
            '^-+|-+$', '', 'g'
          )
          FROM 1 FOR 30
        ),
        '-+$', '', 'g'
      ),
      ''
    ) AS slug
  FROM "waitlist_users"
  WHERE username IS NULL
),
safe AS (
  SELECT
    id,
    created_at,
    CASE WHEN slug ~ '^[a-z0-9]{6}$' THEN slug || '-1' ELSE slug END AS safe_slug
  FROM base
  WHERE slug IS NOT NULL
),
numbered AS (
  SELECT
    id,
    safe_slug,
    ROW_NUMBER() OVER (PARTITION BY safe_slug ORDER BY created_at) AS rn
  FROM safe
)
UPDATE "waitlist_users" w
SET username = CASE WHEN n.rn = 1 THEN n.safe_slug ELSE n.safe_slug || '-' || n.rn::text END
FROM numbered n
WHERE w.id = n.id;

-- CreateIndex: enforce uniqueness after the backfill has populated values.
CREATE UNIQUE INDEX "waitlist_users_username_key" ON "waitlist_users"("username");

-- CreateIndex
CREATE INDEX "waitlist_users_username_idx" ON "waitlist_users"("username");
