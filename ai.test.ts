import { vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { describe, expect, it } from "vitest";
import { chunkText, cosine, keywordScore } from "@/lib/ai";

describe("RAG helpers", () => {
  it("chunks long text with overlap and never returns empty chunks", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} about trees and hashing.`).join(" ");
    const chunks = chunkText(text, 300, 50);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.length > 0 && c.length <= 300)).toBe(true);
  });
  it("returns no chunks for blank input", () => expect(chunkText("   \n ")).toEqual([]));
  it("cosine similarity behaves", () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
  it("keyword scoring prefers relevant passages and gives 0 for unrelated ones", () => {
    const a = "A deadlock needs mutual exclusion, hold and wait, no preemption and circular wait.";
    const b = "TCP slow start doubles the congestion window each round trip.";
    expect(keywordScore("What are the deadlock conditions?", a)).toBeGreaterThan(keywordScore("What are the deadlock conditions?", b));
    expect(keywordScore("quantum entanglement", a)).toBe(0);
  });
});
