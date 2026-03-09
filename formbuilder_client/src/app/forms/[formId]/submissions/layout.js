import { AuthGuard } from "@/components/auth/AuthGuard";

export default function SubmissionsLayout({ children }) {
  return <AuthGuard>{children}</AuthGuard>;
}
