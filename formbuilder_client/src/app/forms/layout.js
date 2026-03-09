/**
 * The /forms route group layout.
 * Individual sub-routes handle their own auth protection
 * (builder, submissions, new are admin-only; view is public).
 */
export default function FormsLayout({ children }) {
  return children;
}
