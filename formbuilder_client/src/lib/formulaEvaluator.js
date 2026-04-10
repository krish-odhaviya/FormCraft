/**
 * Safe arithmetic formula evaluator.
 *
 * Supports: +, -, *, /, (, ) and numeric literals.
 * Does NOT use eval or Function() — immune to injection.
 * 
 * SRS §2.3 Compliant: Returns structured errors instead of silent failure.
 *
 * @param {string} formula  - e.g. "{price} * {qty} + 10"
 * @param {Object} formValues - current form field values keyed by fieldKey
 * @param {string} context - context description for error reporting
 * @returns {Object} { value: string, error: { reason, expression, context } | null }
 */
export function evaluateFormula(formula, formValues = {}, context = "field-level") {
  if (!formula || !formula.trim()) return { value: "", error: null };
  
  try {
    // Replace {fieldKey} placeholders with numeric values
    const expression = formula.replace(/\{([^}]+)\}/g, (_, key) => {
      let rawVal = formValues[key];
      
      // Normalize to a single value
      if (Array.isArray(rawVal) && rawVal.length > 0) {
        rawVal = rawVal[0];
      }
      
      // If it's a lookup/dropdown object, extract the numeric value
      if (rawVal && typeof rawVal === 'object') {
        rawVal = rawVal.value !== undefined ? rawVal.value : (rawVal.id !== undefined ? rawVal.id : 0);
      }
      
      const val = Number(rawVal);
      return isNaN(val) ? "0" : String(val);
    });

    // Validate: only allow digits, whitespace and arithmetic operators/parens
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return { 
        value: "", 
        error: { 
          reason: "Formula contains invalid characters or unclosed curly braces.", 
          expression: formula,
          context
        } 
      };
    }

    const result = safeEval(expression);
    if (result === null || isNaN(result) || !isFinite(result)) {
      return {
        value: "",
        error: {
          reason: "Formula produced a non-numeric or infinite result",
          expression: formula,
          context
        }
      };
    }
    
    // Round to 2 decimal places per standard behavior
    return { value: String(Math.round(result * 100) / 100), error: null };
  } catch (e) {
    return {
      value: "",
      error: {
        reason: e.message || "Parse or evaluation failure",
        expression: formula,
        context
      }
    };
  }
}

// ── Safe recursive descent parser ─────────────────────────────────────────────
function safeEval(expr) {
  const tokens = tokenize(expr);
  let pos = 0;
  let depth = 0; // Guard against stack overflow / SRS §2.3

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
    if (depth > 50) throw new Error("Expression too deeply nested (max depth 50)");
    depth++;
    
    const tok = peek();
    let result;

    if (tok === "(") {
      consume(); // (
      result = parseExpr();
      if (peek() === ")") consume(); // )
    } else if (tok === "-") {
      consume();
      result = -parseFactor();
    } else {
      const atom = consume();
      result = parseFloat(atom);
    }

    depth--;
    return result;
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
