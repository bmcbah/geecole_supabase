export type FormulaRules = {
  weights: Record<string, number>;
  rounding?: number;
};

export type FormulaResult = {
  average: number | null;
  missingTypeCodes: string[];
};

export function calculateCourseAverage(
  values: Array<{ value: number; scale: number; assessmentTypeCode: string }>,
  rules: FormulaRules,
): FormulaResult {
  const weights = rules.weights ?? {};
  const missingTypeCodes = [
    ...new Set(
      values
        .map((item) => item.assessmentTypeCode)
        .filter((code) => !(Number(weights[code]) > 0)),
    ),
  ];
  if (!values.length || missingTypeCodes.length)
    return { average: null, missingTypeCodes };
  const denominator = values.reduce(
    (sum, item) => sum + Number(weights[item.assessmentTypeCode]),
    0,
  );
  if (!denominator) return { average: null, missingTypeCodes };
  const raw =
    values.reduce(
      (sum, item) =>
        sum +
        (item.value / item.scale) *
          20 *
          Number(weights[item.assessmentTypeCode]),
      0,
    ) / denominator;
  const precision = Math.min(4, Math.max(0, rules.rounding ?? 2));
  return { average: Number(raw.toFixed(precision)), missingTypeCodes };
}
