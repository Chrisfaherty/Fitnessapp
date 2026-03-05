# Workout Module

## Overview

The workout module covers the full lifecycle:
1. Trainer builds a template from the exercise library
2. Trainer assigns the template to a client
3. Client opens the app and starts a session
4. Sets are logged with weight/reps/RPE
5. Rest timer auto-starts after each completed set
6. Session is saved; assignment marked complete

## Exercise Library

~800 exercises seeded from [free-exercise-db](https://github.com/wger-project/wger). Each exercise has:
- Name, category, level, equipment
- Primary and secondary muscle arrays (match `data-muscle` SVG attributes)
- Instruction steps
- Image paths (optionally uploaded to `exercise-media` Supabase Storage bucket)

### Import Tool
```bash
# Dry run (no writes)
pnpm --filter import-exercises run dry-run

# Full import with image upload
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
  pnpm --filter import-exercises run import --upload-images

# Limit to N exercises
pnpm --filter import-exercises run import --limit=50
```

## Template Builder (Web)

The trainer dashboard's template builder (`/trainer/templates/new`) uses:
- **`@hello-pangea/dnd`** for drag-and-drop exercise reordering
- Exercise picker modal with search + muscle/category filters
- Per-exercise config: target sets, rep range (min/max), rest time, notes
- Save: upserts `workout_templates` row + deletes+re-inserts `workout_template_exercises`

## Workout Session (iOS)

### State Machine
```
WorkoutListView
  → tap "Start Workout"
  → WorkoutViewModel.startSession(assignment)
    → creates workout_sessions row
    → fetches prefill via get_last_session_sets()
    → state = SessionState.Active

WorkoutSessionView
  → exercise-by-exercise navigation
  → SetLogRow: weight + reps fields
  → tap ✓ → set marked complete → rest timer starts
  → "Next Exercise" → advance index
  → "Finish Workout" → WorkoutViewModel.finishSession()
    → inserts workout_session_sets rows
    → updates session duration_seconds
    → marks assignment status = 'completed'
```

### Prefill Last Session
```swift
// WorkoutViewModel.swift
let lastSets = try await supabase
    .rpc("get_last_session_sets", params: ["p_client_id": userId, "p_exercise_id": exerciseId])
    .execute().value as [PrefillSet]
// Each SetLogRow shows placeholder with last weight/reps
```

## Rest Timer

### iOS (`RestTimerViewModel`)
- `RestTimerState` enum: `idle / running(remaining, total) / paused(remaining, total) / finished`
- 0.1s `Task`-based tick loop via `@MainActor`
- Commands: `start(seconds:)`, `pause()`, `resume()`, `addTime(_:)`, `skip()`, `cancel()`
- On `.finished`: `UINotificationFeedbackGenerator(.success).notificationOccurred()`
- `onFinished: (() -> Void)?` callback for parent view to react

### Android (`RestTimerViewModel`)
- `sealed class TimerState`: `Idle | Running | Paused | Finished`
- `viewModelScope` coroutine with 100ms ticks using `TestCoroutineScheduler` in tests
- Same command API: `start(seconds)`, `pause()`, `resume()`, `addTime(delta)`, `skip()`, `cancel()`

### UI
- Persistent bottom bar (`RestTimerBar`) slides up after set completion
- Shows countdown, progress arc, skip button
- Tap to expand to full `RestTimerCard` overlay

## Muscle Map Visualization

SVG files at `assets/muscle-maps/muscle_map_front.svg` and `muscle_map_back.svg` use `data-muscle` attributes on path elements.

### Web (React)
Inline SVG loaded into a React component. JavaScript highlights paths:
```js
document.querySelectorAll(`[data-muscle="${muscle}"]`)
  .forEach(el => { el.style.fill = '#A3FF12'; el.style.opacity = '1.0' })
```

### iOS (`MuscleMapView`)
`WKWebView` loads SVG from app Bundle, injects JS via `evaluateJavaScript`.

### Android (`MuscleMapView`)
`WebView` in `AndroidView` composable. `assets/` folder contains SVG files. JS injected in `onPageFinished`.

### Muscle Name Mapping
`assets/muscle-maps/muscle_map.json` maps muscle-group strings → `{ view, dataAttribute, label }`.
Names match the `primary_muscles` / `secondary_muscles` arrays in the `exercises` table exactly.

## Analytics

`get_exercise_volume_trend(p_client_id, p_exercise_id, p_days)` SQL function returns:
```
date, total_volume (sum of sets * reps * weight_kg)
```
Use this to power volume trend charts in the trainer's client detail page.
