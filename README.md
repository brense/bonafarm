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

**Requirements:** Node 24+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment template and fill in Firebase SDK config:
   ```bash
   cp .env.example .env.local
   firebase apps:sdkconfig web --project bonafarm-next
   ```

3. Start Firebase emulators in one terminal:
   ```bash
   npm run emulators
   ```

4. Start the dev server in another:
   ```bash
   npm run dev
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
firebase deploy --only firestore:rules,storage
```

## Data Model

Multi-tenant Firestore structure:

```
organisations/{orgId}
  members/{uid}
  feeds/{feedId}
  logs/{logId}
  storageTypes/{typeId}
  storageGroups/{groupId}
  storages/{storageId}      groupId and typeId reference the two collections above
    items/{feedId}
```

The path always identifies the organisation, so documents carry no `orgId` field. Storages are flat under the organisation; moving one to another group is a single field update.

Log event types are explicit (replacing sign-and-timing inference from the old app):

- `delivery` — supplier delivery in a storage
- `count` — stock in a storage was set to a known amount
- `dispense` — feed taken from a counted storage for use
- `fill` — feed poured into a consumed storage
- `empty` — consumed storage was emptied
- `move` — feed moved between storages (two logs share moveId)
- `correction` — manual correction of a mistake

## PWA

The service worker builds from `src/sw.ts` via @serwist/vite in production only and registers in `src/lib/pwa.ts`.

## Docs

See `docs/stats-mockups/` for statistics page mockups and production data analysis from Firestore that drive the design.
