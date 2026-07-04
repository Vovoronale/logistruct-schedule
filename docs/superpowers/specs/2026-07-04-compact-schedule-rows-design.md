# Compact Schedule Rows Design

## Goal

Reduce the vertical space used by every schedule-table body row while preserving readability, editing controls, timeline alignment, and dependency-arrow routing.

## Design

- Change the shared schedule row height from 58px to 44px.
- Reduce schedule-cell vertical padding from 7px to 3px while retaining the current horizontal padding and 1px grid borders.
- Keep typography, badges, inputs, and column widths unchanged.
- Recenter current and historical Gantt bars within the 44px row.
- Recenter the edit-mode drag handle within the 44px row.
- Apply the compact dimensions to all normal, completed, overdue, comparison, and editing rows.

## Verification

- Add a regression test that asserts the compact row geometry is defined in the stylesheet and watch it fail before changing production CSS.
- Run the focused regression test, then the full test suite, lint, and production build.
- In the in-app browser, verify the schedule at `http://127.0.0.1:8788/` has compact, consistently aligned rows, no clipping, no framework overlay, and no relevant console errors.
- Exercise a visible schedule interaction and confirm the resulting state renders correctly.

## Out of Scope

- Changing font sizes, column widths, header heights, or horizontal spacing.
- Allowing variable-height rows.
- Redesigning badges, inputs, or timeline bars.
