import { describe, expect, it } from "vitest";
import { rankAverages } from "./bulletin-ranking";

describe("rankAverages", () => {
  it("classe par moyenne décroissante et conserve les ex aequo", () => {
    expect(
      rankAverages([
        { id: "a", average: 12 },
        { id: "b", average: 15 },
        { id: "c", average: 15 },
        { id: "d", average: 10 },
      ]),
    ).toEqual([
      { id: "b", average: 15, rank: 1, classSize: 4 },
      { id: "c", average: 15, rank: 1, classSize: 4 },
      { id: "a", average: 12, rank: 3, classSize: 4 },
      { id: "d", average: 10, rank: 4, classSize: 4 },
    ]);
  });

  it("exclut les bulletins sans moyenne calculable", () => {
    expect(rankAverages([{ id: "a", average: null }])).toEqual([]);
  });
});
