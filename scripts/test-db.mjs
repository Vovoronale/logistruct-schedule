/* global console, process */
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDemoFixture, renderFixtureSqlChunks } from "./test-data.mjs";

const DATABASE = "logistruct-schedule-db";
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), "..");
const TEST_STATE = resolve(ROOT, ".wrangler", "test-state");

export function assertSafeTestStatePath(root, candidate) {
  const expected = resolve(root, ".wrangler", "test-state");
  if (resolve(candidate) !== expected) {
    throw new Error("UNSAFE_TEST_STATE_PATH");
  }
}

export function wranglerInvocation(root, nodePath = process.execPath) {
  return {
    command: nodePath,
    prefix: [resolve(root, "node_modules", "wrangler", "bin", "wrangler.js")],
  };
}

function runWrangler(argumentsList, { json = false } = {}) {
  const invocation = wranglerInvocation(ROOT);
  const result = spawnSync(
    invocation.command,
    [...invocation.prefix, ...argumentsList],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: process.env,
      windowsHide: true,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`WRANGLER_FAILED:${argumentsList.join(" ")}`);
  }
  if (json) return JSON.parse(result.stdout);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return null;
}

function localArguments() {
  return ["--local", "--persist-to", TEST_STATE];
}

function applyMigrations() {
  runWrangler([
    "d1",
    "migrations",
    "apply",
    DATABASE,
    ...localArguments(),
  ]);
}

function queryRows(sql) {
  const response = runWrangler([
    "d1",
    "execute",
    DATABASE,
    ...localArguments(),
    "--command",
    sql,
    "--json",
  ], { json: true });
  const rows = response?.[0]?.results;
  if (!Array.isArray(rows)) throw new Error("INVALID_D1_JSON_RESPONSE");
  return rows;
}

function readBaseData() {
  const items = queryRows(
    `SELECT id, position, section, sheet_number, title, start_mode,
            start_date, duration_days, assignee, status, created_at, updated_at
     FROM schedule_items ORDER BY position ASC`,
  );
  const assignees = queryRows(
    `SELECT id, name, color, position, created_at, updated_at
     FROM assignees ORDER BY position ASC`,
  );
  if (items.length !== 68) throw new Error("EXPECTED_68_BASE_ITEMS");
  if (assignees.length !== 17) throw new Error("EXPECTED_17_ASSIGNEES");
  items.forEach((item, index) => {
    const expectedId = `drawing-${String(index + 1).padStart(3, "0")}`;
    if (item.id !== expectedId) throw new Error(`UNEXPECTED_BASE_ITEM:${item.id}`);
  });
  return { items, assignees };
}

async function seed() {
  assertSafeTestStatePath(ROOT, TEST_STATE);
  applyMigrations();
  const { items, assignees } = readBaseData();
  const anchorDate = process.env.TEST_DATA_DATE ?? new Date().toISOString().slice(0, 10);
  const fixture = createDemoFixture(items, assignees, anchorDate);
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "logistruct-test-data-"));
  try {
    const sqlChunks = renderFixtureSqlChunks(fixture);
    for (const [index, sql] of sqlChunks.entries()) {
      const sqlPath = join(
        temporaryDirectory,
        `seed-${String(index + 1).padStart(3, "0")}.sql`,
      );
      await writeFile(sqlPath, sql, "utf8");
      runWrangler([
        "d1",
        "execute",
        DATABASE,
        ...localArguments(),
        "--file",
        sqlPath,
        "--yes",
      ]);
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
  console.log(`Test database seeded for ${anchorDate} at ${TEST_STATE}`);
}

async function main() {
  assertSafeTestStatePath(ROOT, TEST_STATE);
  const action = process.argv[2];
  if (!new Set(["reset", "seed"]).has(action)) {
    throw new Error("USAGE: node scripts/test-db.mjs <reset|seed>");
  }
  if (action === "reset") {
    await rm(TEST_STATE, { recursive: true, force: true });
  }
  await seed();
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
