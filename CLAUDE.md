# Household Items App

## What we're building
A cross-platform mobile app (iOS + Android) that lets a household keep track of the items it has on hand: food, toiletries, cleaning supplies, and so on.

## Core concepts
- **Household**: a shared group. Family members or roommates join a household.
- **Members**: users who belong to a household and share its inventory. A person can belong to several households, with a separate display name and role in each.
- **Categories**: each household has subcategories such as Kitchen and Bathroom.
- **Items**: belong to a category and are tracked in one of two ways:
  - **Counter**: a quantity, e.g. "Eggs: 6"
  - **Yes/No**: simply have it or don't, e.g. "Dish soap: yes"

## Features
1. Create a household and invite/join members.
2. Create, edit, and delete categories and items.
3. Increment/decrement counters and toggle yes/no items, synced live across members.
4. Optional per-member notifications when an item runs out or is running low (low threshold set per item).
5. Auto-generated grocery list built from items that are out or low.

6. Import grocery lists of items already bought, which restocks the household. Typing or pasting into the app is the primary input, and text files are secondary. Each import has a review step that matches lines to items.

## Decisions
- Stack: Expo (React Native) with TypeScript, Supabase (Postgres, Realtime, Edge Functions), row-level security, Expo Push, TanStack Query.
- Auth: emailed 6-digit code.
- Invites: single-use and expire after 7 days. The owner picks the invitee's role. Each invite has a code and a tappable link; the link needs a small hosted website (`EXPO_PUBLIC_INVITE_BASE_URL`), which is still to be decided.
- Roles: owner has full permissions; editor can change items, categories and stock, and import lists; viewer is read-only. All roles manage their own notifications. Each household has exactly one owner, who can't leave: they must transfer ownership first, or delete the household.
- Notifications: per-item opt-in, off by default, fired only when an item's status changes and never to the member who made the change. Each member can also turn on a daily household summary at a time they pick, sent only if something is low or out.
- Items: status (out, low, OK) is derived, not stored. Any item can be set to low explicitly by a user, and that flag clears on restock.
- Grocery list: derived from items that are out or low. To put something on it, add the item as empty or low. Checking an item off restocks it (counters ask how many were bought).
- Categories and items: households start with no categories. Deleting a category deletes its items, after a warning. Item names are unique within a category. An item's tracking type is fixed once created.
- Offline: cached data is viewable, but changes need a connection.

## Build order
1. Expo and Supabase projects, email sign-in (done)
2. Create or join a household, with roles and row-level security tests (done)
3. Categories and items (done)
4. Counters, toggles and live sync
5. Low and out status, grocery list
6. Push notifications, per-item preferences and the daily summary
7. Grocery list import

## Working notes for Claude
- Build in small, testable steps.
- Ask before assuming on anything not covered above.
