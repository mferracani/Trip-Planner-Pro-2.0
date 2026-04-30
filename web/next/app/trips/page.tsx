import { Dashboard } from "@/components/Dashboard";
import { AuthGuard } from "@/components/AuthGuard";

export default function Trips() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
