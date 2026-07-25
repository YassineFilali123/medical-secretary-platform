import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: "/admin/dashboard",
  doctor: "/doctor/dashboard",
  secretary: "/secretary/dashboard",
  patient: "/patient/dashboard",
};

export function PublicRoute() {
  const { isAuthenticated, isInitialized, user } = useAuth();

  if (!isInitialized) {
    return null;
  }

  if (isAuthenticated && user) {
    const path = ROLE_DASHBOARDS[user.role];
    if (path) {
      return <Navigate to={path} replace />;
    }
  }

  return <Outlet />;
}
