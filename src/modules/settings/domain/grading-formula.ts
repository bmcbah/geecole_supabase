export type MissingGradePolicy = "ignore" | "block";

export interface GradingFormulaDefinition {
  language: "geecole-expression-v1";
  missing_grade_policy: MissingGradePolicy;
  variables: string[];
}

export interface GradingFormula {
  id: string;
  institution_id: string;
  academic_year_id: string;
  name: string;
  code: string;
  expression: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  version: number;
  definition: GradingFormulaDefinition;
  created_at: string;
  updated_at: string;
}

export interface GradingFormulaInput {
  name: string;
  code: string;
  expression: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  missing_grade_policy: MissingGradePolicy;
}

export interface FormulaValidationResult {
  valid: boolean;
  variables: string[];
  error: string | null;
}

type Token =
  | { type: "number"; value: number }
  | { type: "variable"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "left" }
  | { type: "right" };

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const match = expression.slice(index).match(/^\d+(?:\.\d+)?/);
      if (!match) throw new Error("Nombre invalide.");
      tokens.push({ type: "number", value: Number(match[0]) });
      index += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const match = expression.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (!match) throw new Error("Variable invalide.");
      tokens.push({ type: "variable", value: match[0].toUpperCase() });
      index += match[0].length;
      continue;
    }
    if (["+", "-", "*", "/"].includes(char)) {
      tokens.push({ type: "operator", value: char as "+" | "-" | "*" | "/" });
      index += 1;
      continue;
    }
    if (char === "(") tokens.push({ type: "left" });
    else if (char === ")") tokens.push({ type: "right" });
    else throw new Error(`Caractère non autorisé : ${char}`);
    index += 1;
  }
  return tokens;
}

function evaluateTokens(tokens: Token[], values: Record<string, number>): number {
  let cursor = 0;
  const peek = () => tokens[cursor];
  const consume = () => tokens[cursor++];

  const parsePrimary = (): number => {
    const token = consume();
    if (!token) throw new Error("Expression incomplète.");
    if (token.type === "number") return token.value;
    if (token.type === "variable") {
      const value = values[token.value];
      if (value === undefined) throw new Error(`Valeur manquante pour ${token.value}.`);
      return value;
    }
    if (token.type === "operator" && token.value === "-") return -parsePrimary();
    if (token.type === "left") {
      const value = parseExpression();
      if (consume()?.type !== "right") throw new Error("Parenthèse fermante manquante.");
      return value;
    }
    throw new Error("Opérande attendu.");
  };

  const parseTerm = (): number => {
    let value = parsePrimary();
    while (peek()?.type === "operator" && ["*", "/"].includes(peek().value)) {
      const operator = consume() as Extract<Token, { type: "operator" }>;
      const right = parsePrimary();
      if (operator.value === "/" && right === 0) throw new Error("Division par zéro.");
      value = operator.value === "*" ? value * right : value / right;
    }
    return value;
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    while (peek()?.type === "operator" && ["+", "-"].includes(peek().value)) {
      const operator = consume() as Extract<Token, { type: "operator" }>;
      const right = parseTerm();
      value = operator.value === "+" ? value + right : value - right;
    }
    return value;
  };

  const result = parseExpression();
  if (cursor !== tokens.length) throw new Error("Syntaxe invalide.");
  if (!Number.isFinite(result)) throw new Error("Résultat non calculable.");
  return result;
}

export function validateFormulaExpression(expression: string, allowedCodes: string[]): FormulaValidationResult {
  try {
    if (!expression.trim()) throw new Error("La formule est obligatoire.");
    const tokens = tokenize(expression);
    const variables = [...new Set(tokens.filter((token): token is Extract<Token, { type: "variable" }> => token.type === "variable").map((token) => token.value))];
    const allowed = new Set(allowedCodes.map((code) => code.toUpperCase()));
    const unknown = variables.filter((variable) => !allowed.has(variable));
    if (unknown.length) throw new Error(`Code inconnu : ${unknown.join(", ")}.`);
    evaluateTokens(tokens, Object.fromEntries(variables.map((variable) => [variable, 1])));
    return { valid: true, variables, error: null };
  } catch (error) {
    return { valid: false, variables: [], error: error instanceof Error ? error.message : "Formule invalide." };
  }
}

export function calculateFormulaPreview(
  expression: string,
  values: Record<string, number | null>,
  policy: MissingGradePolicy,
) {
  const variables = [...new Set(tokenize(expression).filter((token): token is Extract<Token, { type: "variable" }> => token.type === "variable").map((token) => token.value))];
  const missing = variables.filter((variable) => values[variable] === null || values[variable] === undefined);
  if (policy === "block" && missing.length) return { result: null, missing, blocked: true, resolvedExpression: expression };
  const usable = Object.fromEntries(variables.map((variable) => [variable, values[variable] ?? 0])) as Record<string, number>;
  try {
    const result = evaluateTokens(tokenize(expression), usable);
    const resolvedExpression = expression.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (code) => String(usable[code.toUpperCase()] ?? 0));
    return { result, missing, blocked: false, resolvedExpression };
  } catch (error) {
    return { result: null, missing, blocked: true, resolvedExpression: expression, error: error instanceof Error ? error.message : "Calcul impossible." };
  }
}
