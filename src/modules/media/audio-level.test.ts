import { describe, expect, it } from "vitest";
import { audioLevel } from "./audio-level";

describe("sound visualization bounds", () => {
  it("stays still in silence and below the noise floor", () => {
    expect(audioLevel(new Float32Array(64))).toBe(0);
    expect(audioLevel(new Float32Array([0.001, -0.001]))).toBe(0);
    expect(audioLevel(new Float32Array())).toBe(0);
  });
  it("increases with volume and caps visual intensity", () => {
    const soft = audioLevel(new Float32Array([0.03, -0.03]));
    const loud = audioLevel(new Float32Array([0.2, -0.2]));
    expect(soft).toBeGreaterThan(0);
    expect(loud).toBeGreaterThan(soft);
    expect(audioLevel(new Float32Array([1, -1]))).toBe(1);
  });
  it("fails safely for invalid samples", () => {
    expect(audioLevel(new Float32Array([NaN]))).toBe(0);
    expect(audioLevel(new Float32Array([Infinity]))).toBe(0);
  });
});
