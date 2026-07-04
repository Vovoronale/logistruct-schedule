# Header Company and Object Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show `LogiStruct` and `Об’єкт: Аквапарк «Став»` in the application header.

**Architecture:** Keep both labels as static presentation content inside the existing `AppHeader` component. Extend the existing header styles for hierarchy and responsive wrapping without changing application state or data flow.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library

---

### Task 1: Add company and object labels

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing test**

Add this test inside `describe("schedule application", ...)` in `src/App.test.tsx`:

```tsx
it("identifies the company and construction object in the header", async () => {
  render(<App />);

  expect(screen.getByText("LogiStruct")).toBeVisible();
  expect(screen.getByText("Об’єкт: Аквапарк «Став»")).toBeVisible();
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- src/App.test.tsx -t "identifies the company"`

Expected: FAIL because neither label exists yet.

- [ ] **Step 3: Add the labels to the existing brand block**

Replace the anonymous text wrapper in `src/components/AppHeader.tsx` with:

```tsx
<div className="brand-copy">
  <span className="company-name">LogiStruct</span>
  <h1>Графік випуску креслень</h1>
  <p className="object-name">Об’єкт: Аквапарк «Став»</p>
</div>
```

- [ ] **Step 4: Style the hierarchy and responsive behavior**

In `src/styles.css`, add compact styles for `.brand-copy`, `.company-name`, and `.object-name`; remove the rule that hides all `.brand-block p` elements. Keep the current header controls unchanged and add mobile font sizing so the copy wraps within the available width.

```css
.brand-copy { min-width: 0; }
.company-name { display: block; margin-bottom: 2px; color: var(--blue); font-size: 12px; font-weight: 800; letter-spacing: .04em; }
.object-name { margin: 3px 0 0; color: var(--muted); font-size: 12px; line-height: 1.2; }
```

- [ ] **Step 5: Verify the focused test and project checks**

Run: `npm test -- src/App.test.tsx -t "identifies the company"`

Expected: PASS.

Run: `npm test && npm run lint && npm run build`

Expected: all commands exit successfully.

- [ ] **Step 6: Commit**

```bash
git add src/App.test.tsx src/components/AppHeader.tsx src/styles.css
git commit -m "feat: add company and object labels to header"
```
