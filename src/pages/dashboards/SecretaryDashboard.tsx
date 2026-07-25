import { useAuth } from "@/hooks/useAuth";

export default function SecretaryDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Secretary Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Welcome back, {user?.name}</p>
    </div>
  );
}
