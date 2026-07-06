import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("index metadata", () => {
  it("uses the current schedule title in the browser tab", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain('content="Публічний графік виконання креслень Logistruct"');
    expect(html).toContain("<title>Графік виконання креслень</title>");
  });
});
