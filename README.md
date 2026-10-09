# Swipe to Clean

A React Native (Expo) app for cleaning up your photo gallery with a Tinder-style swipe deck:
**swipe left to delete, swipe right to keep.**

## Features

- **Home** – device storage card (used / free) and four cleaning categories.
- **Photos & Videos** – items grouped by month in a 2-column grid with a cover thumbnail,
  count, reviewed/total progress bar and pending-deletion badge.
- **Swipe deck** – a stacked deck of the month's unreviewed items. Tilt-to-swipe with live
  `KEEP` / `DELETE` badges, plus footer buttons for Delete (✕), Undo (↺) and Keep (✓).
  Videos autoplay muted on the top card, with a mute toggle.
- **Trash review** – after finishing a month you land on a grid of everything you swiped left.
  Tap any item to keep it instead, then **Empty Trash** to batch-delete through the native OS
  confirmation dialog.
- **Similar images** – groups bursts and near-duplicates (perceptual hash) and pre-selects all
  but the sharpest shot of each group for deletion.
- **Blurry images** – flags out-of-focus / shaky photos (Laplacian variance) with three
  sensitivity levels.
- Photo analysis runs on the device, in the background, can be paused/resumed, and is cached.
- Review progress and analysis results are saved across launches.
- Handles denied / limited media access, empty libraries, and empty months.

## Tech stack

| Concern        | Choice                                                            |
| -------------- | ----------------------------------------------------------------- |
| Framework      | Expo SDK 57, Expo Router, TypeScript (`strict`)                   |
| Gestures       | `react-native-gesture-handler` + `react-native-reanimated` 4      |
| Media access   | `expo-media-library` (new `Query` / `Asset` API)                  |
| Images         | `expo-image` (downscaled decoding, memory + disk cache)           |
| Video          | `expo-video` (playback), `expo-video-thumbnails` (still frames)   |
| Analysis       | `expo-image-manipulator` (native downscale) + `upng-js` (decode)  |
| Storage        | `expo-file-system` (`Paths.totalDiskSpace` / `availableDiskSpace`) |
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

### Building with EAS

`eas.json` defines these build profiles (run with `npx eas-cli@latest build --profile <name> --platform android|ios`):

| Profile                 | What you get                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `development`           | Dev client for a real device; pair it with `npx expo start`         |
| `development-simulator` | Same, but an iOS Simulator build                                    |
| `preview`               | Standalone internal build — an installable `.apk` on Android        |
| `production`            | Store build (`.aab` / App Store) with auto-incremented build number |

Submit a production build with `npx eas-cli@latest submit --platform android|ios`.

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
    index.tsx          Home: storage card + categories
    months/[kind].tsx  Month grid for photos or videos
    month/[key].tsx    Swipe deck for one month
    trash/[key].tsx    Trash review + Empty Trash
    similar.tsx        Similar-photo groups
    blurry.tsx         Blurry photos
  components/          SwipeDeck, SwipeCard, MonthCard, AssetImage, …
  hooks/               useAssetUri (lazy URI resolution), useMonthStats
  lib/media.ts         Permissions, fetching, month grouping, deletion, thumbnails
  lib/imageAnalysis.ts Native downscale + PNG decode for each photo
  lib/imageMath.ts     Sharpness (Laplacian variance), dHash, similar-photo grouping
  state/               LibraryContext (device media), ReviewContext (keep/delete decisions),
                       AnalysisContext (background scan + cached results)
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

## How photo analysis works

Each photo is downscaled natively to 256 px with `expo-image-manipulator`, decoded in JS, and
converted to grayscale. From that copy we compute:

- **Sharpness** – variance of the Laplacian. Low values mean few sharp edges, i.e. blur.
  Thresholds per sensitivity live in `BLUR_THRESHOLDS` (`src/lib/imageMath.ts`). Very dark or
  plain photos (night sky, a white wall) can score low too, so review the list before deleting.
- **Difference hash** – a 64-bit fingerprint. Photos taken within 24 h of each other whose
  hashes differ by ≤ 10 bits are grouped as similar; the sharpest one is suggested to keep.

Results are cached in AsyncStorage, so only new photos are analysed on later runs.
