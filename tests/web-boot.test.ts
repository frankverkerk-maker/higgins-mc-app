import { describe, expect, it } from "vitest";
import { withWebBootShell } from "../server/web-boot";

describe("Expo web bootstrap", () => {
  it("adds an accessible placeholder before deferred Expo JavaScript mounts", () => {
    const html = '<html><head></head><body><div id="root"><div class="expo"><!--$--><!--/$--></div></div><script src="/entry.js" defer></script></body></html>';
    const result = withWebBootShell(html);
    expect(result).toContain('id="higgins-boot" role="status"');
    expect(result).toContain("MutationObserver");
    expect(result.indexOf('id="higgins-boot"')).toBeLessThan(result.indexOf('</body>'));
    expect(withWebBootShell(result)).toBe(result);
  });

  it("leaves pages without an Expo root untouched", () => {
    expect(withWebBootShell('<html><body><main>Privacy</main></body></html>'))
      .toBe('<html><body><main>Privacy</main></body></html>');
  });
});
