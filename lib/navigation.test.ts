import { describe, expect, it } from "vitest";
import { safeNext } from "./navigation";

describe("safeNext", () => {
  it("laisse passer un chemin interne", () => {
    expect(safeNext("/analyze")).toBe("/analyze");
    expect(safeNext("/history?page=2")).toBe("/history?page=2");
  });

  it("retombe sur le dashboard quand rien n'est demandé", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(undefined)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
  });

  it("bloque les redirections vers un domaine externe", () => {
    // Les trois formes qu'un navigateur résout en URL absolue.
    expect(safeNext("https://evil.tld")).toBe("/dashboard");
    expect(safeNext("//evil.tld")).toBe("/dashboard");
    expect(safeNext("/\\evil.tld")).toBe("/dashboard");
  });

  it("bloque les schémas exotiques", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNext("data:text/html,<script>")).toBe("/dashboard");
  });
});
