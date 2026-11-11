import StaffPerformancePage from "@/components/performance/StaffPerformancePage";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffPerformancePage studentId={id} backHref={`/admin/students/${id}`} />;
}
