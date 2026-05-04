-- Allow progressive onboarding: mobile and aadhaar_last4 are filled in steps, not at signup
ALTER TABLE public.profiles
  ALTER COLUMN mobile DROP NOT NULL,
  ALTER COLUMN aadhaar_last4 DROP NOT NULL;
