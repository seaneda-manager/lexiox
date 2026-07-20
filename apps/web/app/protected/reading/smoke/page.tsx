import SmokeLaunchReading from "@/components/dev/SmokeLaunchReading";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-3">Reading Smoke</h1>
      <SmokeLaunchReading />
    </div>
  );
}




