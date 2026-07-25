import { Outlet } from "react-router-dom";
import { MonitoringProvider } from "@/contexts/MonitoringContext";

export default function MonitoringLayout() {
  return (
    <MonitoringProvider>
      <Outlet />
    </MonitoringProvider>
  );
}
