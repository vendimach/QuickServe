-- Existing users skip onboarding (DEFAULT true).
-- New signups have Step 1 of Onboarding.tsx set this to false,
-- and Step 4 sets it back to true when fully complete.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT true;
