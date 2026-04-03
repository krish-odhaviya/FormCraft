/**
 * Safe arithmetic formula evaluator.
 *
 * Supports: +, -, *, /, (, ) and numeric literals.
 * Does NOT use eval or Function() — immune to injection.
 *
 * @param {string} formula  - e.g. "{price} * {qty} + 10"
 * @param {Object} formValues - current form field values keyed by fieldKey
 * @returns {string} result or "" on error
 */
export function evaluateFormula(formula, formValues) {
  if (!formula) return "";
  try {
    // Replace {fieldKey} placeholders with numeric values
    const expression = formula.replace(/\{([^}]+)\}/g, (_, key) => {
      let rawVal = formValues[key];
      // If it's a lookup object {value, label}, extract the value
      if (rawVal && typeof rawVal === 'object' && 'value' in rawVal) {
        rawVal = rawVal.value;
      }
      const val = Number(rawVal);
      return isNaN(val) ? "0" : String(val);
    });

    // Validate: only allow digits, whitespace and arithmetic operators/parens
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return "";
    }

    const result = safeEval(expression);
    if (result === null || isNaN(result) || !isFinite(result)) return "";
    return String(Math.round(result * 100) / 100);
  } catch {
    return "";
  }
}

// ── Safe recursive descent parser ─────────────────────────────────────────────
// Grammar:
//   expr   = term (('+' | '-') term)*
//   term   = factor (('*' | '/') factor)*
//   factor = '(' expr ')' | number

function safeEval(expr) {
  const tokens = tokenize(expr);
  let pos = 0;

  function peek() { return tokens[pos]; }
  function consume() { return tokens[pos++]; }

  function parseExpr() {
    let left = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = consume();
      const right = parseFactor();
      if (op === "/" && right === 0) return 0; // avoid division by zero
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parseFactor() {
    const tok = peek();
    if (tok === "(") {
      consume(); // (
      const val = parseExpr();
      consume(); // )
      return val;
    }
    if (tok === "-") {
      consume();
      return -parseFactor();
    }
    consume();
    return parseFloat(tok);
  }

  return parseExpr();
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue; }
    if (/[\d.]/.test(expr[i])) {
      let num = "";
      while (i < expr.length && /[\d.]/.test(expr[i])) num += expr[i++];
      tokens.push(num);
    } else {
      tokens.push(expr[i++]);
    }
  }
  return tokens;
}
