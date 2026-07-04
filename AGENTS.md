# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a clean scaffold: no application code or toolchain has been committed yet. Keep the root focused on project configuration and top-level documentation. As the project grows, use `src/` for production code, `tests/` for automated tests, `assets/` for static files, and `docs/` for design or operational notes. Mirror source paths in the test tree where practical; for example, `src/schedule/parser.*` should have a corresponding test under `tests/schedule/`.

## Build, Test, and Development Commands

No build, test, or local-development commands are configured yet. When introducing a language or framework, add its manifest and document stable commands in `README.md`. Prefer a small, consistent command surface such as:

- `npm run dev` — start the local development environment.
- `npm test` — run the complete automated test suite.
- `npm run lint` — check formatting and static-analysis rules.

Do not add placeholder scripts that exit successfully without performing the named check. Before submitting changes, use `git status --short` to confirm the intended files are included.

## Coding Style & Naming Conventions

Follow the formatter and linter selected by the first implementation stack, and commit their configuration with the code. Use spaces rather than tabs unless the ecosystem standard requires otherwise. Prefer descriptive names: `PascalCase` for types and UI components, `camelCase` for functions and variables, and kebab-case for documentation and asset filenames. Keep modules focused and avoid unrelated refactors in feature changes.

## Testing Guidelines

Add tests with every behavior change and bug fix. Place tests in `tests/` or beside source files when the chosen framework strongly favors co-location. Name tests after observable behavior, such as `schedule-parser.test.ts`. Cover normal paths, boundary cases, and failures. Once a test runner is adopted, record the exact command and any coverage threshold here.

## Commit & Pull Request Guidelines

There is no commit history from which to infer an established convention. Use concise, imperative commit subjects, optionally following Conventional Commits (for example, `feat: add weekly schedule parser`). Keep each commit logically scoped. Pull requests should explain the problem and solution, list verification performed, link relevant issues, and include screenshots for visible UI changes. Call out configuration changes, migrations, and known follow-up work explicitly.

## Security & Configuration

Never commit credentials, tokens, personal data, or local environment files. Provide sanitized examples such as `.env.example`, and add generated output and secrets to `.gitignore` before introducing them.
