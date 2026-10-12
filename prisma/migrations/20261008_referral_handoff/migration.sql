-- After a player moves to Zenko, the old app must not accept a second referrer.
-- This also protects against an apply request already running during deploy.
CREATE FUNCTION protect_registered_referral() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD."status" = 'REGISTERED'
       AND (NEW."used_referral_code" IS DISTINCT FROM OLD."used_referral_code"
         OR (NEW."referred_by_id" IS NOT NULL
             AND NEW."referred_by_id" IS DISTINCT FROM OLD."referred_by_id")) THEN
        RAISE EXCEPTION 'Referral attribution is managed on Zenko after registration'
            USING ERRCODE = '23514', CONSTRAINT = 'registered_referral_handoff';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER "waitlist_registered_referral_handoff"
BEFORE UPDATE OF "used_referral_code", "referred_by_id" ON "waitlist_users"
FOR EACH ROW EXECUTE FUNCTION protect_registered_referral();
