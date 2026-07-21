export type RankedAverage = {
  id: string;
  average: number;
  rank: number;
  classSize: number;
};

export function rankAverages(
  rows: Array<{ id: string; average: number | null }>,
): RankedAverage[] {
  const sorted = rows
    .filter(
      (row): row is { id: string; average: number } =>
        typeof row.average === "number" && Number.isFinite(row.average),
    )
    .sort((left, right) => right.average - left.average);
  return sorted.map((row, index) => ({
    ...row,
    rank:
      index > 0 && sorted[index - 1]?.average === row.average
        ? sorted.findIndex((item) => item.average === row.average) + 1
        : index + 1,
    classSize: sorted.length,
  }));
}
