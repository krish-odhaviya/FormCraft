/**
 * validation.js — shared validation helpers.
 *
 * Each validator returns null on success or a string error message on failure.
 * Use them in form handlers:
 *
 *   const err = validateFormName(name);
 *   if (err) { toast.error(err); return; }
 */

// ── Form ──────────────────────────────────────────────────────────────────────

export function validateFormName(name) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Form name is required.";
  if (trimmed.length < 3) return "Form name must be at least 3 characters.";
  if (trimmed.length > 150) return "Form name cannot exceed 150 characters.";
  if (!/^[\w\s\-()\.,!?&]+$/.test(trimmed))
    return "Form name contains invalid characters.";
  return null;
}

export function validateFormDescription(description) {
  if ((description ?? "").length > 1000)
    return "Description cannot exceed 1000 characters.";
  return null;
}

// ── Module ────────────────────────────────────────────────────────────────────

export function validateModuleName(name) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Module name is required.";
  if (trimmed.length < 2) return "Module name must be at least 2 characters.";
  if (trimmed.length > 120) return "Module name cannot exceed 120 characters.";
  return null;
}

export function validateModulePrefix(prefix, { isParent = false, isSubParent = false } = {}) {
  if (isParent || isSubParent) return null; // prefix not applicable
  if (!prefix) return null; // optional
  if (!prefix.startsWith("/")) return 'Prefix must start with / (e.g. /admin/users).';
  if (prefix.length > 255) return "Prefix cannot exceed 255 characters.";
  return null;
}

export function validateModuleDescription(description) {
  if ((description ?? "").length > 500)
    return "Description cannot exceed 500 characters.";
  return null;
}

/**
 * Validates all module fields at once.
 * Returns the first error found, or null if everything passes.
 */
export function validateModule(form) {
  return (
    validateModuleName(form.moduleName) ??
    validateModuleDescription(form.description) ??
    validateModulePrefix(form.prefix, { isParent: form.isParent, isSubParent: form.isSubParent })
  );
}

// ── Role ──────────────────────────────────────────────────────────────────────

export function validateRoleName(name) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Role name is required.";
  if (trimmed.length < 2) return "Role name must be at least 2 characters.";
  if (trimmed.length > 80) return "Role name cannot exceed 80 characters.";
  if (!/^[A-Z0-9_]+$/.test(trimmed))
    return "Role name must be uppercase letters, numbers, and underscores only (e.g. PROJECT_MANAGER).";
  return null;
}

export function validateRoleDescription(description) {
  if ((description ?? "").length > 500)
    return "Description cannot exceed 500 characters.";
  return null;
}

// ── Auth / User ───────────────────────────────────────────────────────────────

export function validateUsername(username) {
  const trimmed = (username ?? "").trim();
  if (!trimmed) return "Username is required.";
  if (trimmed.length < 3) return "Username must be at least 3 characters.";
  if (trimmed.length > 50) return "Username cannot exceed 50 characters.";
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed))
    return "Username can only contain letters, numbers, and underscores.";
  return null;
}

export function validatePassword(password) {
  if (!password) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password))
    return "Password must contain at least one letter and one number.";
  return null;
}

export function validatePasswordConfirm(password, confirm) {
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

// ── Generic helpers ───────────────────────────────────────────────────────────

/**
 * Format server-side validation errors from the ApiErrorDetail[] array
 * into a single display string.
 *
 * Usage:
 *   toast.error(formatServerErrors(err.response.data.errors));
 */
export function formatServerErrors(errors = []) {
  if (!Array.isArray(errors) || errors.length === 0) return null;
  return errors.map((e) => `${e.field}: ${e.message}`).join("\n");
}