/**
 * Validates a logic expression against SRS §2.1 constraints.
 * Permitted: &&, ||, !, ==, !=, <, <=, >, >= operators.
 * Forbidden: Function calls, method calls, brackets [], eval, etc.
 * 
 * @param {string} expression The expression to validate
 * @param {string[]} knownFieldKeys List of valid field keys/slugs
 * @returns {string|null} Error message if invalid, null if valid
 */
export function validateExpression(expression, knownFieldKeys = []) {
  if (!expression || !expression.trim()) return "Expression cannot be empty.";
  
  // Check for forbidden constructs (Function calls: word followed by open parenthesis)
  if (/[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/.test(expression)) {
    return "Function calls are not allowed. Use operators only (&&, ||, ==, etc.)";
  }
  
  // Tokenize and validate allowed tokens only
  // Forbidden characters that usually indicate complex JS or data structure access
  const forbidden = /[;\[\]{}]|=>|\beval\b|\bFunction\b/;
  if (forbidden.test(expression)) {
    return "Expression contains forbidden characters or keywords.";
  }
  
  // Check field keys referenced exist in knownFieldKeys
  // We strip out string literals first so that text inside quotes isn't mistaken for a field key
  const strippedExpression = expression.replace(/(['"])(?:(?!\1|\\).|\\.)*\1/g, "");
  
  const referencedKeys = [...strippedExpression.matchAll(/\b([a-z][a-z0-9_]*)\b/g)]
    .map(m => m[1])
    .filter(k => !["true", "false", "null", "and", "or", "not", "value"].includes(k));
  
  const unknownKeys = referencedKeys.filter(k => !knownFieldKeys.includes(k));
  if (unknownKeys.length > 0) {
    return `Unknown field key(s): ${unknownKeys.join(", ")}`;
  }
  
  return null; // valid
}
