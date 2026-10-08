# Swipe to Clean

A React Native (Expo) app for cleaning up your photo gallery with a Tinder-style swipe deck:
**swipe left to delete, swipe right to keep.**

## Features

- **Dashboard** – photos grouped by month in a 2-column grid. Each card shows a cover thumbnail,
  the photo count, a reviewed/total progress bar, and how many photos are queued for deletion.
- **Swipe deck** – a stacked deck of the month's unreviewed photos. Tilt-to-swipe with live
  `KEEP` / `DELETE` badges, plus footer buttons for Delete (✕), Undo (↺) and Keep (✓).
- **Trash review** – after finishing a month you land on a grid of everything you swiped left.
  Tap any photo to keep it instead, then **Empty Trash** to batch-delete through the native OS
  confirmation dialog.
- Progress is saved, so you can leave a month half-done and come back later.
- Handles denied / limited photo access, empty libraries, and empty months.

## Tech stack

| Concern        | Choice                                                            |
| -------------- | ----------------------------------------------------------------- |
| Framework      | Expo SDK 57, Expo Router, TypeScript (`strict`)                   |
| Gestures       | `react-native-gesture-handler` + `react-native-reanimated` 4      |
| Media access   | `expo-media-library` (new `Query` / `Asset` API)                  |
| Images         | `expo-image` (downscaled decoding, memory + disk cache)           |
| State          | React Context + `useReducer`, persisted with AsyncStorage         |
| Styling        | `StyleSheet`                                                      |

## Getting started

```bash
npm install
npx expo run:ios      # or: npx expo run:android
```

Media-library deletion and full photo access need a **development build** (Expo Go cannot
grant full media-library access). You can also build in the cloud with
`npx eas-cli@latest build --profile development`.

Checks:

```bash
npm run typecheck
npm run lint
```

## Project layout

```
src/
  app/                 Expo Router screens
    _layout.tsx        Providers + stack navigator
    index.tsx          Dashboard (month grid, permission/empty states)
    month/[key].tsx    Swipe deck for one month
    trash/[key].tsx    Trash review + Empty Trash
  components/          SwipeDeck, SwipeCard, MonthCard, AssetImage, …
  hooks/               useAssetUri (lazy URI resolution), useMonthStats
  lib/media.ts         Permissions, fetching, month grouping, deletion
  state/               LibraryContext (device photos), ReviewContext (keep/delete decisions)
```

## How it stays fast on large camera rolls

- The library is scanned with a single `Query().exeForMetadata()` call, so only small metadata
  records (id, date, size) cross the bridge — no URIs or image data.
- Each image's URI is resolved lazily, only when its cell or card actually mounts, and memoised.
- The swipe deck mounts at most 3 cards at a time; grids are virtualised `FlatList`s.
- `expo-image` decodes bitmaps at view size rather than full camera resolution.

## State model

Decisions are stored per month as `{ decisions: Record<photoId, 'keep' | 'delete'>, history: photoId[] }`
(see `src/state/reviewReducer.ts`). `history` drives Undo; restoring from the trash flips a
decision to `keep`; after a successful device delete, the ids are purged from every month.
