import { AuthGuard } from "@/components/AuthGuard";
import { SettingsPage } from "@/components/SettingsPage";

export default function Settings() {
  return (
    <AuthGuard>
      <SettingsPage />
    </AuthGuard>
  );
}
