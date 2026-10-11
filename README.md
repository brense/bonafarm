# Bonafarm

Bonafarm is a feed stock and ordering app for petting zoos. This is a multi-tenant rewrite of the earlier voerapp (on the `main` branch), built as a fresh Vite application.

## Stack

- **Vite 8** — build tool and dev server
- **React 19** — UI framework
- **TypeScript** — type safety
- **MUI 9** (Emotion) — component library
- **react-router 8** — client-side routing
- **Firebase JS SDK 13** — Auth, Firestore, Cloud Storage
- **Serwist 9** — PWA service worker
- **Vitest 5 + Testing Library** — tests
- **oxlint** — JavaScript linter

## Getting Started

**Requirements:** Node 24+ and Bun 1.3+

1. Install dependencies:
   ```bash
   bun install
   ```

2. Copy environment template and fill in Firebase SDK config:
   ```bash
   cp .env.example .env.local
   firebase apps:sdkconfig web --project bonafarm-next
   ```

3. Start Firebase emulators in one terminal:
   ```bash
   bun run emulators
   ```

4. Start the dev server in another:
   ```bash
   bun run dev
   ```

The `VITE_USE_EMULATORS` variable defaults to `true`, which makes the app talk to local emulators in dev. Set to `false` to hit the real Firebase project.

## Scripts

| Command | Purpose |
|---------|---------|
| `dev` | Start dev server |
| `build` | Type-check and build for production |
| `preview` | Preview production build |
| `typecheck` | Run TypeScript checker |
| `lint` | Run oxlint |
| `test` | Run tests once |
| `test:watch` | Run tests in watch mode |
| `emulators` | Start Firebase emulators |

## Firebase

The `bonafarm-next` project has a billing account linked. Keep development within no-cost limits:

- Use emulators for day-to-day work.
- Do not deploy Cloud Functions, enable PITR, or configure scheduled backups without discussion.
- Keep bulk scripts under daily free quotas: 50k reads, 20k writes, 20k deletes.

Security rules in `firestore.rules` and `storage.rules` are deployed manually:
```bash
firebase deploy --only firestore,storage
```

The Firestore rules have a test suite that runs against the Rules API, so no
emulator or deploy is needed (uses the Firebase CLI login token):
```bash
python3 scripts/test-rules.py
```

An organisation with its default storage types, default group and an owner is
created with the seed script (idempotent, 6 documents):
```bash
bun run seed --org tanthof --owner <auth uid>          # emulator
bun run seed --org tanthof --owner <auth uid> --live   # bonafarm-next
```

## Data Model

Multi-tenant Firestore structure:

```
organisations/{orgId}
  members/{uid}
  feeds/{feedId}
  storageTypes/{typeId}
  storageGroups/{groupId}
  storages/{storageId}
  items/{storageId}_{feedId}
  batches/{batchId}
  logs/{logId}
```

The path always identifies the organisation, so documents carry no `orgId` field. Storages are flat under the organisation; moving one to another group is a single field update.

Items are flat too, with a compound id `{storageId}_{feedId}` (underscore separates them unambiguously since both ids are slugs of `[a-z0-9-]`), so org-wide stock is one listener and one storage is `where('storageId', '==', id)`. Item writes are upserts.

### Roles

A member has an array of one or more roles:

- `owner` — admin privileges plus cannot be removed; only owners manage owners and admins
- `admin` — manages feeds, storages, members, and branding; may log anything
- `order` — stock overview with order advice and export (use case 1)
- `deliver` — logs deliveries and koker fills, opens delivery batches (use case 2)
- `feed` — dispenses, counts, empties, and moves stock (use case 3)
- `view` — read only

Log event types are explicit (replacing sign-and-timing inference from the old app):

- `delivery` — supplier delivery in a storage
- `count` — stock in a storage was set to a known amount
- `dispense` — feed taken from a counted storage for use
- `fill` — feed poured into a consumed storage
- `empty` — consumed storage was emptied
- `move` — feed moved between storages (two logs share a batchId)
- `correction` — manual correction of a mistake

Batches group logs of one delivery or move. An open batch (no `closedAt`) can be resumed after the app was closed.

## Branding

Each organisation controls how the app presents itself through the document
`organisations/{orgId}/branding/public` (edited in the Firestore console for
now): app name, short name, description, palette mode, primary/secondary
colours, theme and background colour, and icon URLs. The document is readable
without signing in because browsers fetch the web app manifest without
credentials. Missing or invalid values fall back to the defaults in
`src/branding/defaults.ts`.

The organisation is picked from `?org=<id>` in the URL and remembered in
localStorage. `BrandingProvider` loads the document, sets the page title,
the theme-color meta tag and the MUI theme, and points the manifest link at
`/api/manifest?org=<id>`. That endpoint (`api/manifest.ts`, a Vercel function,
also served by the Vite dev server) builds the manifest from the same document
and is cached on the edge for an hour.

## PWA

The service worker builds from `src/sw.ts` via @serwist/vite in production only and registers in `src/lib/pwa.ts`.

## Docs

See `docs/stats-mockups/` for statistics page mockups and production data analysis from Firestore that drive the design.
