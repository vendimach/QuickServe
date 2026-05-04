# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint check
npm run test         # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
npm run preview      # Preview production build
```

Bun is also supported (`bun run dev`, etc.) — both `package-lock.json` and `bun.lockb` are present.

## Architecture

QuickServe is a service booking marketplace (like Urban Company) with dual-role UX: the same app serves **customers** and **service partners** with distinct home pages, navigation, and features.

### Tech Stack

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI primitives)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Payments**: Razorpay (INR), with signature verification via Supabase Edge Functions
- **State**: TanStack React Query for server state; React Context for global UI/app state
- **Forms**: React Hook Form + Zod

### Navigation Model

The app does **not** use standard React Router page routes. Instead, `AppContext` manages a `currentView` string (23 views: `home`, `categories`, `bookings`, `chat`, `partner-dashboard`, etc.). Navigation happens via `setCurrentView()` and `goBack()`. URL sync is handled by `viewToPath()` / `pathToView()` mappings in AppContext — keep these in sync when adding views.

### Context Provider Stack (App.tsx, outermost → innermost)

1. `QueryClientProvider` → `ThemeProvider` → `TooltipProvider` → `BrowserRouter`
2. `AuthProvider` — Supabase session, profile, role (`customer | partner | admin`)
3. `NotificationProvider` — in-app notification feed
4. `MarketplaceDataProvider` — reviews, chats, preferences (localStorage-backed)
5. `UserDataProvider` — customer bookings, addresses, payment methods
6. `PartnerDataProvider` — partner earnings, schedule, availability

### Key Directories

- `src/contexts/` — all global state; start here when adding features
- `src/components/marketplace/` — app-specific feature components
- `src/components/ui/` — shadcn/ui wrapper components (don't edit generated ones)
- `src/hooks/` — custom hooks (`useAuth`, `useApp`, `useNotifications`, etc.)
- `src/types/index.ts` — canonical TypeScript types for the domain
- `src/integrations/supabase/types.ts` — **auto-generated** from DB schema, do not edit manually
- `src/data/` — static seed data for services, categories, professionals
- `supabase/migrations/` — ordered SQL migrations; `supabase/functions/` — Edge Functions

### Database Schema (key tables)

| Table | Purpose |
|---|---|
| `profiles` | User info, Aadhaar/mobile verification, avatar |
| `user_roles` | Maps users to `customer`, `partner`, or `admin` |
| `bookings` | Full booking lifecycle with OTP, status, payment, preferences |
| `partner_schedule` | Weekly availability slots |
| `partner_earnings` | Per-booking earnings records |
| `payments` | Razorpay transaction records |
| `notifications` | In-app notification feed |

Booking status flow: `searching → awaiting-customer-confirm → confirmed → in-progress → completed` (or `cancelled / refunded`).

### Non-obvious Patterns

- **Seed data + localStorage merge**: `src/data/` provides base categories/services/professionals. `MarketplaceDataProvider` merges these with localStorage-cached reviews and preferences on load.
- **Chat auto-replies**: `ChatContext` simulates partner responses with a 1.5 s delay — this is intentional demo behavior.
- **Razorpay**: Script is loaded async. Order creation, payment, and verification are three separate steps; verification hits the `razorpay-verify` Edge Function to validate the Razorpay signature server-side.
- **Dual-role entry point**: After login, the app checks `user_roles` to decide whether to render the customer home or partner dashboard.
- **Path alias**: `@/*` maps to `src/*` (configured in `tsconfig.json` and `vite.config.ts`).
