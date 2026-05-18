# Task: Debug Auth and User Visibility Issues

## 📋 Problem Description
1.  **Visibility Issue**: Newly added users (`prashant.k@amplior.com`) are missing from the Settings > Users table.
2.  **Login Issue**: Newly created users can "success" in console but don't actually log in (redirect/session state failure).
3.  **Password Issue**: Old admin user (`admin@amplior.com`) reports "Invalid password" despite manual updates.
4.  **Payload Discrepancy**: Payload shows "Agent" role but users are expecting "Supreme Admin" or at least visibility.

## 🎯 Objectives
- [ ] Fix user visibility in the Settings tab.
- [ ] Fix the login flow for newly created users.
- [ ] Standardize password management for administrative accounts.
- [ ] Ensure `public.users` and `auth.users` are perfectly synchronized.

## 🏗️ Architecture Analysis
- **Auth Layer**: Supabase Auth (GoTrue).
- **Profile Layer**: `public.users` table synchronized via triggers/manual scripts.
- **Context Layer**: `AuthContext.tsx` handles session state and role mapping.
- **Data Flow**: `auth.users` (meta) → `public.users` (profile) → `AuthContext` (local state).

## 🛠️ Task Breakdown

### Phase 1: Investigation (Debugger & Explorer)
- [ ] Map the `SettingsPage` logic to see how users are fetched.
- [ ] Inspect `AuthContext.tsx` for redirect and session persistence logic.
- [ ] Verify Supabase triggers (`handle_new_user`) and RLS policies on `public.users`.
- [ ] Check for hardcoded email checks that might be blocking new users.

### Phase 2: Database Alignment (Backend Specialist)
- [ ] Verify the state of `public.users` for `prashant.k@amplior.com` and `admin@amplior.com`.
- [ ] Audit RLS policies to ensure the logged-in admin can actually *see* other users.
- [ ] Fix trigger logic if it's failing to propagate roles correctly.

### Phase 3: Frontend Synchronization (Frontend Specialist)
- [ ] Update `AuthContext.tsx` to handle session transitions more robustly.
- [ ] Fix the "success but no login" behavior (likely a missing `setUser` call or state race condition).
- [ ] Ensure the Settings tab users list is fetching from the correct source with proper filters.

### Phase 4: Validation & Verification (Test Engineer)
- [ ] Create a test script to verify login and profile fetching.
- [ ] Perform a "Final Purge and Sync" if necessary to clear corrupted states.

## 📅 Timeline
- **Discovery**: 15 mins
- **Database Fixes**: 20 mins
- **Frontend Fixes**: 20 mins
- **Verification**: 10 mins
