import { AuthGuard } from "@/components/AuthGuard";
import { CatalogPage } from "@/components/Catalog/CatalogPage";

export default function Page() {
  return (
    <AuthGuard>
      <CatalogPage />
    </AuthGuard>
  );
}
