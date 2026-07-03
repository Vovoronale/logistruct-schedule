# Schedule Dependencies, Today Marker, and History Design

## Goal

Extend the drawing schedule with a visible today marker, muted historical timeline styling, stable multi-predecessor dependencies, cascading automatic dates, dependency-chain highlighting, and comparison against any of the ten previous saved schedule versions.

## Existing Context

The application is a React and Vite schedule editor backed by Cloudflare Pages Functions and D1. The current schedule is saved as a full ordered dataset guarded by an optimistic revision number. Rows already have stable string IDs, visible numeric positions, manual start dates, working-day durations, computed finish dates, and Gantt bars. The current database retains only the active dataset and revision; it does not retain prior schedule states.

## Domain Model

### Scheduling mode

Each schedule item gains a `startMode` field with one of two mutually exclusive values:

- `manual`: the administrator supplies `startDate` directly;
- `dependencies`: the application derives `startDate` from predecessor completion dates.

The visible work number is the row's `position` in the first `№` column. It remains a presentation and input value, not a persistent identity.

### Stable dependencies

Dependencies are stored in a normalized `item_dependencies` table. Each record contains the stable ID of a dependent item and the stable ID of one direct predecessor. The UI resolves entered or selected work numbers to stable IDs and renders those IDs back as the rows' current numbers.

Reordering, inserting, deleting, or otherwise normalizing positions therefore updates the displayed numbers without rewriting or breaking valid dependency edges.

One item may have multiple direct predecessors. An item may not depend on itself. Duplicate dependency edges are rejected.

### Date semantics

For an item in `dependencies` mode, its effective start date is the latest computed completion date among all direct predecessors. Completion continues to use the existing working-day calculation: the Gantt bar occupies dates from `startDate` inclusive to completion exclusive, and a dependent item may begin on that completion boundary.

Date calculation processes the dependency graph in topological order. A changed manual date, duration, scheduling mode, or dependency edge triggers a cascading recalculation of every transitive successor. A dependent item is invalid when it has no predecessors or when any required predecessor lacks a computable completion date.

Both client and server reject self-dependencies and cycles. The server independently validates and recomputes effective dates before persistence; submitted derived dates are not trusted as authoritative.

### Deletion rules

Deletion is blocked when any other item directly depends on the target item. The error identifies the dependent work numbers so the administrator can intentionally remove or replace those edges first. Deleting an item that only depends on others is allowed and removes its outgoing dependency records with the item.

## Persistence and History

### Current schedule

The active D1 schema adds `start_mode` to `schedule_items` and adds the normalized `item_dependencies` table with foreign keys to schedule item IDs and a unique composite key for each edge.

The public schedule payload includes `startMode` and predecessor IDs for each item. The save payload uses stable IDs for dependency edges. Server validation also verifies that all IDs exist in the submitted dataset and that positions remain unique and normalized.

### Historical snapshots

Before each successful overwrite, the server serializes the complete current state into `schedule_history`. A snapshot contains:

- schedule revision and saved timestamp;
- all schedule item fields, including effective dates and scheduling modes;
- all stable dependency edges;
- the assignee directory used by that version.

After saving the new active schedule, the server retains the ten newest prior snapshots and removes older ones. The active version does not count toward this limit, so comparison can reach up to ten versions behind the current state. Before the first post-migration save, the history list may be empty.

Snapshot creation, active-data replacement, revision increment, dependency replacement, assignee replacement, and history pruning execute atomically. A failure leaves both the active schedule and its history unchanged.

### API

- `GET /api/schedule` returns the active schedule, dependency data, revision, and updated timestamp.
- `PUT /api/schedule` validates an authenticated full-dataset replacement, recalculates dependent dates, records the outgoing snapshot, saves the incoming state, increments the revision, and prunes history.
- `GET /api/schedule/history` returns metadata for up to ten prior revisions in newest-first order.
- `GET /api/schedule/history/:revision` returns the complete snapshot for one retained revision or a not-found response when it has expired or never existed.

Current schedule and history reads remain public because the live schedule is already public. All mutations remain administrator-only. Existing optimistic concurrency behavior remains in force.

## Editing Experience

The schedule table adds a `Початок за` control for each row while editing:

- selecting `Датою` activates the date input and stores `manual` mode;
- selecting `Залежностями` replaces manual date editing with a multi-select work-number picker and stores `dependencies` mode.

Selected predecessors appear as removable compact number chips such as `№12` and `№18`. Options show the work number and title for disambiguation, omit the current item, and reflect position changes immediately. The computed start date remains visible but read-only in dependency mode.

Changing an upstream date, duration, mode, or dependency selection recalculates the draft immediately. Invalid graph edits display a Ukrainian-language error adjacent to the affected work and prevent saving. Canceling edits restores the saved graph and dates with the rest of the draft.

## Today Marker and Past Styling

The timeline date range includes today's date in addition to scheduled start and completion bounds. The today column is marked by a strong vertical line through both header rows and all body rows, with an accessible `Сьогодні` label in the day header.

Calendar columns strictly before today use muted backgrounds and text. Each active Gantt segment before today is rendered gray. Segments on today and later retain the configured assignee color. A bar crossing today is therefore gray on its past portion and colored from today forward; a wholly past bar is entirely gray. This styling is based on calendar position and is independent of the item's workflow status.

When the schedule opens, the scroller should bring today near the visible center when that column exists, without stealing keyboard focus or overriding a user's later scroll position.

## Dependency Analysis View

A row-level `Показати залежності` action selects an item for analysis. The application computes the complete transitive graph in both directions:

- all predecessor ancestors receive one highlight treatment;
- all successor descendants receive a distinct highlight treatment;
- the selected item receives a primary selection treatment;
- unrelated rows and bars are muted.

The legend names the three states. The action is available in viewing and editing modes. Activating the selected row again, using a clear action, deleting the selected draft row, or leaving comparison mode clears the analysis state. Filtering does not alter graph traversal; related rows hidden by filters remain counted but are not forcibly shown.

## Version Comparison

A `Порівняти` action opens a selector listing retained revisions by revision number and localized saved date/time. Selecting a revision compares its snapshot with the active saved schedule, not with an unsaved editing draft. Entering comparison while editing therefore requires the user to save or cancel outstanding changes first.

Comparison matches items by stable ID:

- an ID only in the active version is added;
- an ID only in the snapshot is removed;
- an ID in both versions is inspected field by field;
- changed position is a reorder, not deletion plus addition;
- changed dependencies are reported independently from date or metadata changes.

The comparison toolbar summarizes added, removed, rescheduled/reordered, and otherwise changed items. Current bars remain solid. Historical bars are drawn behind them as translucent outlines, allowing start and completion shifts to be seen directly. Changed current table cells receive a compact marker with prior value available through accessible detail text. Added rows use a green indicator. Removed historical rows are presented in a dedicated red-tinted section so they remain inspectable even though they no longer have a current row.

Dependency analysis and version comparison are mutually exclusive visualization modes to prevent ambiguous colors and dimming. Exiting comparison restores the ordinary current schedule.

## Error Handling

Client-side validation provides immediate feedback, while server-side validation is authoritative. Errors use work numbers and concise Ukrainian explanations where possible. Covered failures include:

- missing, duplicate, or self-referential predecessor IDs;
- direct or indirect cycles;
- dependency mode with no predecessors;
- predecessor without a computable completion date;
- deletion of a referenced predecessor;
- revision conflicts;
- missing or expired history revisions;
- malformed historical snapshots or database failures.

A history-read failure does not prevent the active schedule from loading. A save or snapshot failure does not partially update any schedule data.

## Testing Strategy

Unit tests cover:

- latest-finish selection across multiple direct predecessors;
- cascading recalculation through multiple graph levels;
- working-day and weekend boundaries;
- missing dates and durations;
- self-dependency, duplicate edge, and cycle detection;
- stable links after position normalization and reordering;
- deletion blocking and safe outgoing-edge cleanup;
- transitive predecessor and successor collection;
- stable-ID comparison of additions, removals, reorders, field changes, dependency changes, and date changes.

Hook and component tests cover:

- mutually exclusive manual and dependency controls;
- number chips updating after reorder;
- immediate draft recalculation and validation feedback;
- today header and column classes;
- gray past bar segments and assignee-colored present/future segments;
- dependency analysis selection, legend, dimming, and clearing;
- comparison revision loading, summary counts, markers, ghost bars, and removed-item section;
- save/cancel behavior for dependency edits.

API and migration tests cover:

- reading and writing normalized dependency edges;
- server-side graph rejection and date recomputation;
- authenticated atomic saves with outgoing snapshots;
- newest-first history metadata and snapshot retrieval;
- pruning to exactly ten prior snapshots;
- preservation of active data and history after failed saves;
- optimistic revision conflicts under the expanded payload.

The completed implementation must pass `npm test`, `npm run lint`, and `npm run build`, followed by browser verification of desktop and narrow layouts.

## Out of Scope

This change does not add dependency types other than finish-to-start, lag or lead offsets, manual calendar exceptions, arbitrary history retention, rollback to an old version, or visual connector arrows between Gantt bars. These may be added later without changing the stable-ID dependency model.
