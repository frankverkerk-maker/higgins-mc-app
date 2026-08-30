import { describe, expect, it } from "vitest";
import superjson from "superjson";

import { unwrapTrpcResponse } from "../server/routers/mc-proxy";

describe("MC tRPC proxy SuperJSON fidelity", () => {
  it("preserves transformed values from the upstream tRPC response", () => {
    const upstreamValue = {
      generatedAt: new Date("2026-08-30T12:00:00.000Z"),
      optionalTask: undefined,
      nested: { value: 42 },
    };

    const payload = {
      result: {
        data: superjson.serialize(upstreamValue),
      },
    };

    const result = unwrapTrpcResponse(payload);

    expect(result.generatedAt).toBeInstanceOf(Date);
    expect(result.generatedAt.toISOString()).toBe("2026-08-30T12:00:00.000Z");
    expect(result).toHaveProperty("optionalTask", undefined);
    expect(result.nested).toEqual({ value: 42 });
  });

  it("returns non-tRPC payloads unchanged", () => {
    const payload = { status: "ok" };
    expect(unwrapTrpcResponse(payload)).toBe(payload);
  });
});

