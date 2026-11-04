import { describe, it, expect, beforeEach } from "vitest";
import { ApiKeyPool } from "./keyPool";

describe("ApiKeyPool - Multi-key Failover & Load Distribution", () => {
  beforeEach(() => {
    delete process.env.TEST_KEY_1;
    delete process.env.TEST_KEY_2;
    delete process.env.TEST_KEYS_CSV;
  });

  it("loads multiple keys from distinct env vars and comma-separated lists", () => {
    process.env.TEST_KEY_1 = "key_alpha";
    process.env.TEST_KEY_2 = "key_beta";
    process.env.TEST_KEYS_CSV = "key_gamma, key_delta";

    const pool = new ApiKeyPool({
      envVars: ["TEST_KEY_1", "TEST_KEY_2", "TEST_KEYS_CSV"],
    });

    const allKeys = pool.getAllKeys();
    expect(allKeys).toEqual(["key_alpha", "key_beta", "key_gamma", "key_delta"]);
  });

  it("filters out placeholders", () => {
    process.env.TEST_KEY_1 = "AQ.placeholder_123";
    process.env.TEST_KEY_2 = "real_key_456";

    const pool = new ApiKeyPool({
      envVars: ["TEST_KEY_1", "TEST_KEY_2"],
      placeholderPrefix: "AQ.placeholder",
    });

    expect(pool.getAllKeys()).toEqual(["real_key_456"]);
  });

  it("rotates keys and marks exhausted keys in cooldown", () => {
    process.env.TEST_KEY_1 = "key_1";
    process.env.TEST_KEY_2 = "key_2";

    const pool = new ApiKeyPool({
      envVars: ["TEST_KEY_1", "TEST_KEY_2"],
      cooldownMs: 10000,
    });

    const first = pool.getNextKey();
    expect(["key_1", "key_2"]).toContain(first);

    // Mark key_1 exhausted
    pool.markExhausted("key_1");

    // Only key_2 should now be available
    expect(pool.getAvailableKeys()).toEqual(["key_2"]);
    expect(pool.getNextKey()).toBe("key_2");
  });
});
