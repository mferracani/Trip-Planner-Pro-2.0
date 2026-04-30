import { AuthGuard } from "@/components/AuthGuard";
import { StatsPage } from "@/components/stats/StatsPage";

export default function Stats() {
  return (
    <AuthGuard>
      <StatsPage />
    </AuthGuard>
  );
}
