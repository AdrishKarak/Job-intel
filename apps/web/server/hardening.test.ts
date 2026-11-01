import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger, createRunId, redactMetadata } from "@/server/logger";
import { checkRateLimit, resetRateLimitStore } from "@/server/rateLimit";
import { TRPCError } from "@trpc/server";

describe("Phase 11 Hardening - Structured Logging & Rate Limiting", () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.restoreAllMocks();
  });

  describe("Structured Logger", () => {
    it("generates unique run IDs with run_ prefix", () => {
      const runId1 = createRunId();
      const runId2 = createRunId();
      expect(runId1).toMatch(/^run_\d+_[a-f0-9]+$/);
      expect(runId2).toMatch(/^run_\d+_[a-f0-9]+$/);
      expect(runId1).not.toEqual(runId2);
    });

    it("redacts sensitive fields in metadata", () => {
      const sensitive = {
        apiKey: "sk-live-12345",
        password: "mysecretpassword",
        bearerToken: "jwt-token-abcdef",
        safeParam: "value123",
        nested: {
          clientSecret: "top-secret",
          count: 42,
        },
      };

      const redacted = redactMetadata(sensitive);
      expect(redacted).toBeDefined();
      expect(redacted!.apiKey).toBe("[REDACTED]");
      expect(redacted!.password).toBe("[REDACTED]");
      expect(redacted!.bearerToken).toBe("[REDACTED]");
      expect(redacted!.safeParam).toBe("value123");
      expect(redacted!.nested.clientSecret).toBe("[REDACTED]");
      expect(redacted!.nested.count).toBe(42);
    });

    it("outputs valid structured JSON via console", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const runId = createRunId();

      logger.info("test.op", "Test log message", {
        runId,
        userId: "user_audit_1",
        metadata: { key: "val" },
      });

      expect(consoleSpy).toHaveBeenCalledOnce();
      const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(loggedJson.service).toBe("web");
      expect(loggedJson.level).toBe("info");
      expect(loggedJson.operation).toBe("test.op");
      expect(loggedJson.message).toBe("Test log message");
      expect(loggedJson.runId).toBe(runId);
      expect(loggedJson.userId).toBe("user_audit_1");
      expect(loggedJson.metadata).toEqual({ key: "val" });
    });
  });

  describe("Sliding Window Rate Limiter", () => {
    it("permits requests within limit", () => {
      const userId = "user_rate_test_1";
      const action = "discovery.sync";

      // Allow 3 requests in 1 second
      expect(() => checkRateLimit(userId, action, { maxRequests: 3, windowMs: 1000 })).not.toThrow();
      expect(() => checkRateLimit(userId, action, { maxRequests: 3, windowMs: 1000 })).not.toThrow();
      expect(() => checkRateLimit(userId, action, { maxRequests: 3, windowMs: 1000 })).not.toThrow();
    });

    it("throws TRPCError TOO_MANY_REQUESTS when limit exceeded", () => {
      const userId = "user_rate_test_2";
      const action = "reports.generateNow";

      checkRateLimit(userId, action, { maxRequests: 2, windowMs: 1000 });
      checkRateLimit(userId, action, { maxRequests: 2, windowMs: 1000 });

      expect(() => {
        checkRateLimit(userId, action, { maxRequests: 2, windowMs: 1000 });
      }).toThrowError(TRPCError);

      try {
        checkRateLimit(userId, action, { maxRequests: 2, windowMs: 1000 });
      } catch (err: any) {
        expect(err.code).toBe("TOO_MANY_REQUESTS");
      }
    });

    it("isolates rate limits by user and action", () => {
      const userA = "user_rate_A";
      const userB = "user_rate_B";

      checkRateLimit(userA, "action_1", { maxRequests: 1, windowMs: 1000 });
      // userA exceeding limit on action_1
      expect(() => checkRateLimit(userA, "action_1", { maxRequests: 1, windowMs: 1000 })).toThrow();

      // userB on action_1 should still be permitted
      expect(() => checkRateLimit(userB, "action_1", { maxRequests: 1, windowMs: 1000 })).not.toThrow();

      // userA on action_2 should still be permitted
      expect(() => checkRateLimit(userA, "action_2", { maxRequests: 1, windowMs: 1000 })).not.toThrow();
    });
  });
});
