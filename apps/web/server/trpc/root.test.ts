import { describe, it, expect } from "vitest";
import { appRouter } from "./root";
import type { Context } from "./context";

describe("tRPC Root Router", () => {
  it("ping procedure returns pong and ISO timestamp", async () => {
    const mockContext: Context = {
      prisma: {} as any,
      auth: null,
      user: null,
    };

    const caller = appRouter.createCaller(mockContext);
    const result = await caller.ping();

    expect(result.message).toBe("pong");
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });
});
