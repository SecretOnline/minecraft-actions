import { describe, expect, it } from "vitest";
import { decodePackets, encodePacket } from "./rcon.js";

describe("encodePacket/decodePackets", () => {
  it("round-trips a single packet", () => {
    const packet = encodePacket(1, 3, "hunter2");
    const { packets, remaining } = decodePackets(packet);
    expect(packets).toEqual([{ id: 1, type: 3, body: "hunter2" }]);
    expect(remaining.length).toBe(0);
  });

  it("decodes multiple packets delivered in one buffer", () => {
    const combined = Buffer.concat([encodePacket(1, 2, "auth ok"), encodePacket(2, 0, "stopped the server")]);
    const { packets, remaining } = decodePackets(combined);
    expect(packets).toEqual([
      { id: 1, type: 2, body: "auth ok" },
      { id: 2, type: 0, body: "stopped the server" },
    ]);
    expect(remaining.length).toBe(0);
  });

  it("holds back a partial trailing packet until the rest arrives", () => {
    const full = encodePacket(1, 0, "stopped the server");
    const partial = full.subarray(0, full.length - 3);
    const { packets, remaining } = decodePackets(partial);
    expect(packets).toEqual([]);
    expect(remaining).toEqual(partial);
  });
});
