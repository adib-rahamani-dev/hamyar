import { describe, it, expect } from "vitest";
import { boardCommand, messageInput } from "./input";
describe("bounded classroom commands", () => {
  it("rejects arbitrary markup, non-finite coordinates, oversized strokes and forged actor fields", () => {
    const stroke = {
      id: "f7a5dd8a-9a3f-4b65-9e44-15c42c6c1fd5",
      color: "emerald",
      width: 4,
      points: [
        [1, 2],
        [3, 4],
      ],
    };
    expect(boardCommand.safeParse({ action: "add", stroke }).success).toBe(
      true,
    );
    expect(
      boardCommand.safeParse({
        action: "add",
        stroke: { ...stroke, color: "url(https://evil.test)" },
      }).success,
    ).toBe(false);
    expect(
      boardCommand.safeParse({
        action: "add",
        stroke: {
          ...stroke,
          points: [
            [NaN, 2],
            [3, 4],
          ],
        },
      }).success,
    ).toBe(false);
    expect(
      boardCommand.safeParse({
        action: "add",
        stroke: { ...stroke, points: Array(121).fill([1, 2]) },
      }).success,
    ).toBe(false);
    expect(
      messageInput.safeParse({
        clientId: stroke.id,
        body: "A",
        userId: stroke.id,
      }).success,
    ).toBe(false);
  });
});
