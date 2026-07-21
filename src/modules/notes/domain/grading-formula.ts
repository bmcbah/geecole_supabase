export type FormulaRules = {
  expression: string;
  rounding?: number;
};

export type FormulaResult = {
  average: number | null;
  missingTypeCodes: string[];
  error?: string;
};

type Token = {
  type: "number" | "identifier" | "operator" | "eof";
  value: string;
};

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < expression.length) {
    const rest = expression.slice(offset);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) {
      offset += whitespace[0].length;
      continue;
    }
    const number = rest.match(/^(?:\d+(?:[.,]\d+)?|[.,]\d+)/);
    if (number) {
      tokens.push({ type: "number", value: number[0].replace(",", ".") });
      offset += number[0].length;
      continue;
    }
    const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_-]*/);
    if (identifier) {
      tokens.push({ type: "identifier", value: identifier[0].toUpperCase() });
      offset += identifier[0].length;
      continue;
    }
    const character = rest[0];
    if (character && "+-*/()".includes(character)) {
      tokens.push({ type: "operator", value: character });
      offset += 1;
      continue;
    }
    throw new Error(`Caractère interdit « ${character ?? ""} »`);
  }
  return [...tokens, { type: "eof", value: "" }];
}

function evaluateExpression(
  expression: string,
  variables: Record<string, number>,
) {
  const tokens = tokenize(expression);
  let index = 0;
  const peek = () => tokens[index] ?? { type: "eof" as const, value: "" };
  const take = () => tokens[index++] ?? { type: "eof" as const, value: "" };
  function primary(): number {
    const token = take();
    if (token.type === "number") return Number(token.value);
    if (token.type === "identifier") {
      if (!(token.value in variables))
        throw new Error(`Variable ${token.value} sans note`);
      return variables[token.value] ?? 0;
    }
    if (token.value === "(") {
      const result = add();
      if (take().value !== ")") throw new Error("Parenthèse fermante attendue");
      return result;
    }
    if (token.value === "+") return primary();
    if (token.value === "-") return -primary();
    throw new Error("Nombre, variable ou parenthèse attendu");
  }
  function multiply(): number {
    let result = primary();
    while (peek().value === "*" || peek().value === "/") {
      const operator = take().value;
      const operand = primary();
      if (operator === "/" && operand === 0)
        throw new Error("Division par zéro");
      result = operator === "*" ? result * operand : result / operand;
    }
    return result;
  }
  function add(): number {
    let result = multiply();
    while (peek().value === "+" || peek().value === "-") {
      const operator = take().value;
      const operand = multiply();
      result = operator === "+" ? result + operand : result - operand;
    }
    return result;
  }
  const result = add();
  if (peek().type !== "eof")
    throw new Error(`Élément inattendu « ${peek().value} »`);
  if (!Number.isFinite(result)) throw new Error("Résultat non numérique");
  return result;
}

export function listFormulaVariables(expression: string): string[] {
  return [
    ...new Set(
      tokenize(expression)
        .filter((token) => token.type === "identifier")
        .map((token) => token.value),
    ),
  ];
}

export function calculateCourseAverage(
  values: Array<{ value: number; scale: number; assessmentTypeCode: string }>,
  rules: FormulaRules,
): FormulaResult {
  try {
    const grouped = new Map<string, number[]>();
    for (const item of values) {
      if (!(item.scale > 0)) continue;
      const code = item.assessmentTypeCode.toUpperCase();
      grouped.set(code, [
        ...(grouped.get(code) ?? []),
        (item.value / item.scale) * 20,
      ]);
    }
    const variables = Object.fromEntries(
      [...grouped].map(([code, notes]) => [
        code,
        notes.reduce((sum, note) => sum + note, 0) / notes.length,
      ]),
    );
    const referenced = listFormulaVariables(rules.expression);
    const missingTypeCodes = referenced.filter((code) => !(code in variables));
    if (missingTypeCodes.length) return { average: null, missingTypeCodes };
    const raw = evaluateExpression(rules.expression, variables);
    if (raw < 0 || raw > 20)
      throw new Error(
        `Résultat hors barème : ${raw.toFixed(2)} / 20. Vérifiez les pondérations et le dénominateur.`,
      );
    const precision = Math.min(4, Math.max(0, rules.rounding ?? 2));
    return { average: Number(raw.toFixed(precision)), missingTypeCodes: [] };
  } catch (cause) {
    return {
      average: null,
      missingTypeCodes: [],
      error: cause instanceof Error ? cause.message : "Formule invalide",
    };
  }
}
