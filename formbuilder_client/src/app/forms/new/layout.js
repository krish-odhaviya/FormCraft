import { AuthGuard } from "@/components/auth/AuthGuard";

export default function NewFormLayout({ children }) {
  return <AuthGuard>{children}</AuthGuard>;
}
