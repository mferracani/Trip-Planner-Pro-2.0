import { AuthGuard } from "@/components/AuthGuard";
import { StatsPage } from "@/components/stats/StatsPage";

export default function Home() {
  return (
    <AuthGuard>
      <StatsPage />
    </AuthGuard>
  );
}
