import StaffPerformancePage from "@/components/performance/StaffPerformancePage";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId: id } = await params;
  return <StaffPerformancePage studentId={id} backHref="/teacher/home" />;
}
