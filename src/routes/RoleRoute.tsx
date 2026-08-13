import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import type { UserRole } from "@/types/auth";

/**
 * Restricts a group of routes to specific roles.
 *
 * This is a usability guard, not a security boundary: it stops someone landing
 * on a page that will only show them errors. The actual enforcement lives in
 * the backend, which re-checks the caller's role on every request — see
 * AdminUserController::requireAdmin(). Never rely on this component alone to
 * protect data.
 */
export function RoleRoute({ allow }: { allow: UserRole[] }) {
  const { isAuthenticated, isInitialized, user } = useAuth();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
