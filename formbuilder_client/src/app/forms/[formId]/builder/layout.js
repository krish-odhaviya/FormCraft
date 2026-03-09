import { AuthGuard } from "@/components/auth/AuthGuard";

export default function BuilderLayout({ children }) {
  return <AuthGuard>{children}</AuthGuard>;
}
