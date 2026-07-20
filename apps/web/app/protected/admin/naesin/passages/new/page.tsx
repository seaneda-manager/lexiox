// Target path:
// apps/web/app/(protected)/admin/naesin/passages/new/page.tsx

import PassageAuthoringEditor from "@/components/naesin/authoring/PassageAuthoringEditor";

export const dynamic = "force-dynamic";

export default function AdminNaesinPassagesNewPage() {
  return <PassageAuthoringEditor />;
}
