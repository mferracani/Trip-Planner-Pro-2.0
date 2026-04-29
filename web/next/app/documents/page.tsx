import { AuthGuard } from "@/components/AuthGuard";
import { TravelDocumentsPage } from "@/components/TravelDocuments/TravelDocumentsPage";

export default function DocumentsPage() {
  return (
    <AuthGuard>
      <TravelDocumentsPage />
    </AuthGuard>
  );
}
