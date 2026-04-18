import { describe, expect, it } from "vitest";

import { buildReadableUsernameBase, normalizeDisplayName } from "@/lib/user-identity";

describe("user identity helpers", () => {
  it("normalizes empty display names", () => {
    expect(normalizeDisplayName("")).toBe("钉钉用户");
    expect(normalizeDisplayName(undefined)).toBe("钉钉用户");
  });

  it("builds readable pinyin usernames", () => {
    expect(buildReadableUsernameBase("张三")).toBe("zhangsan");
    expect(buildReadableUsernameBase("李四A")).toBe("lisia");
  });

  it("falls back to a safe ascii username", () => {
    expect(buildReadableUsernameBase("123测试")).toMatch(/^user123/);
  });
});
