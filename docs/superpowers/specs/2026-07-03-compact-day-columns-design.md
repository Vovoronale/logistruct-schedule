# Compact Day Columns Design

**Date:** 2026-07-03

## Goal

Make every calendar-day column in the schedule exactly 24 pixels wide. Day columns must remain equal and must not expand to fill unused horizontal space.

## Root Cause

The day width is currently applied only to cells in the second header row. The table combines `table-layout: fixed`, month headers with `colspan`, and `min-width: 100%`; therefore, the browser can redistribute surplus table width across the calendar columns instead of preserving their intended width.

## Design

`ScheduleGrid` will render a `colgroup` before the table header. The first nine columns will retain the widths already defined for schedule metadata. Each value in `timelineDays` will produce one calendar column with a dedicated class whose width, minimum width, and maximum width are all 24 pixels.

The schedule table will use its content width instead of forcing a minimum width of 100%. Horizontal overflow will remain handled by the existing `.schedule-scroller`. The day header and timeline-cell rules will use the same shared 24-pixel CSS variable, keeping headers, body cells, month spans, weekend shading, and Gantt bars aligned.

The empty-timeline state will remain unchanged because it does not render day columns.

## Testing

- A component test will verify that one fixed-width calendar column is rendered for every timeline day.
- Existing automated tests, type checking, linting, and the production build will be run.
- Browser validation will measure multiple rendered day headers and timeline cells at desktop and narrow viewport sizes, confirming that each is 24 pixels wide and that horizontal scrolling still works.

## Acceptance Criteria

1. Every rendered day column is exactly 24 pixels wide.
2. All day columns have identical widths at different viewport sizes.
3. The table does not distribute unused width into day columns.
4. Month headers, day headers, body cells, weekend shading, and Gantt bars remain aligned.
5. Existing schedule behavior and the empty-timeline state are unchanged.
