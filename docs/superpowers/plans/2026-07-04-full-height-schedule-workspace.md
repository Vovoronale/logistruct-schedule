# Full-Height Schedule Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перетворити сторінку графіка на повноекранну робочу зону з компактною панеллю керування та інформаційними popover-панелями.

**Architecture:** `App` керує єдиним локальним станом відкритої інформаційної панелі та компонуванням робочої області. `FilterBar` стає компактною `WorkspaceToolbar`, яка об'єднує фільтри, лічильник і тригери другорядних панелей; `ProgressOverview` та `AssigneeLegend` повторно використовуються всередині доступного popover-контейнера. CSS Grid/Flex розподіляє висоту вікна так, щоб таблиця займала весь залишок і прокручувалася всередині.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Vite.

---

### Task 1: Поведінка компактної панелі

**Files:**
- Create: `src/components/WorkspaceToolbar.tsx`
- Create: `src/components/WorkspaceToolbar.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Написати тести панелі**

Перевірити, що панель показує пошук, три фільтри, лічильник, кнопки «Прогрес», «Виконавці», «Порівняти» та передає зміни/натискання через callbacks. Перевірити `aria-expanded` і `aria-controls` для двох інформаційних кнопок.

- [ ] **Step 2: Запустити тест і підтвердити падіння**

Run: `npm test -- --run src/components/WorkspaceToolbar.test.tsx`
Expected: FAIL, модуль `WorkspaceToolbar` відсутній.

- [ ] **Step 3: Реалізувати `WorkspaceToolbar`**

Винести наявні поля з `FilterBar`, додати props `visibleCount`, `totalCount`, `openPanel`, `onTogglePanel`, `onCompare`; використати кнопки з `aria-expanded={openPanel === "progress"}` / `aria-controls="progress-panel"` і відповідний зв'язок для `assignees-panel`.

- [ ] **Step 4: Підключити панель у `App`**

Додати стан `openPanel: "progress" | "assignees" | null`, замінити `FilterBar`, постійні legend/progress/modes на `WorkspaceToolbar` і умовні popover-панелі. При відкритті однієї панелі закривати іншу; Escape закриває активну панель. Режими залежностей, активного порівняння та редагування залишити окремими компактними статусними рядками лише коли вони справді активні.

- [ ] **Step 5: Запустити тести**

Run: `npm test -- --run src/components/WorkspaceToolbar.test.tsx src/App.test.tsx`
Expected: PASS.

- [ ] **Step 6: Зафіксувати компонент**

Run: `git add src/components/WorkspaceToolbar.tsx src/components/WorkspaceToolbar.test.tsx src/App.tsx && git commit -m "feat: add compact schedule workspace toolbar"`

### Task 2: Повноекранне компонування

**Files:**
- Modify: `src/styles.css`
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Додати структурний тест**

Перевірити класи `workspace-main`, `workspace-content`, `workspace-popover` та відсутність постійного footer після завантаження графіка.

- [ ] **Step 2: Запустити тест і підтвердити падіння**

Run: `npm test -- --run src/App.test.tsx`
Expected: FAIL на нових структурних очікуваннях.

- [ ] **Step 3: Реалізувати розподіл висоти**

Задати `html`, `body`, `#root`, `.app-shell` висоту `100%`; `.app-shell { height: 100dvh; overflow: hidden }`; `.workspace-main` і `.workspace-content` — grid/flex з `min-height: 0`; `.schedule-frame` — flex/grid на весь залишок; `.schedule-scroller { height: 100%; min-height: 0; max-height: none }`. Прибрати footer з JSX і великі зовнішні відступи таблиці.

- [ ] **Step 4: Ущільнити шапку й адаптивність**

Зменшити висоту/відступи шапки, приховати декоративний підзаголовок у робочому режимі, зробити toolbar одноярусним на широкому viewport і максимум двоярусним на вузькому. Popover розмістити абсолютно під toolbar з обмеженою висотою та власним scroll.

- [ ] **Step 5: Запустити компонентні тести та статичні перевірки**

Run: `npm test -- --run && npm run lint && npm run build`
Expected: усі команди завершуються з exit code 0.

- [ ] **Step 6: Зафіксувати компонування**

Run: `git add src/styles.css src/components/AppHeader.tsx src/App.test.tsx && git commit -m "feat: fill viewport with schedule grid"`

### Task 3: Браузерна перевірка

**Files:**
- Modify only if defects are found: `src/App.tsx`, `src/styles.css`, `src/components/WorkspaceToolbar.tsx`

- [ ] **Step 1: Перевірити desktop**

На `http://127.0.0.1:8788/` у viewport 1366×900 перевірити URL/title, зміст DOM, відсутність error overlay і console errors. Виміряти, що `document.documentElement.scrollHeight <= window.innerHeight + 1`, а низ `.schedule-frame` доходить до низу viewport з невеликим відступом.

- [ ] **Step 2: Перевірити взаємодії**

Відкрити «Прогрес», перевірити видимість `#progress-panel`; відкрити «Виконавці» і підтвердити, що progress закрився; натиснути Escape і підтвердити закриття; змінити фільтр і підтвердити оновлення лічильника/рядків.

- [ ] **Step 3: Перевірити вузький viewport**

У viewport 752×920 підтвердити максимум два ряди toolbar, відсутність зовнішнього вертикального scroll, доступність усіх фільтрів і внутрішній scroll таблиці.

- [ ] **Step 4: Виправити знайдені дефекти й повторити перевірки**

Після кожного CSS/React виправлення перезавантажити сторінку й повторити відповідну перевірку DOM, консолі, screenshot та взаємодії.

- [ ] **Step 5: Фінальна верифікація**

Run: `npm test -- --run && npm run lint && npm run build && git status --short`
Expected: тести, lint і build проходять; status містить лише очікувані зміни або є чистим після коміту.
