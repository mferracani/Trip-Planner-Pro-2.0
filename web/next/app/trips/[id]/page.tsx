import { TripDetailPage } from "@/components/TripDetail/TripDetailPage";
import { AuthGuard } from "@/components/AuthGuard";

export default function TripPage({ params }: { params: { id: string } }) {
  return (
    <AuthGuard>
      <TripDetailPage tripId={params.id} />
    </AuthGuard>
  );
}
