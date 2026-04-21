import { TripDetailPage } from "@/components/TripDetail/TripDetailPage";
import { AuthGuard } from "@/components/AuthGuard";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AuthGuard>
      <TripDetailPage tripId={id} />
    </AuthGuard>
  );
}
