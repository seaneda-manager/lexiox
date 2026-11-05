import { FolderOpen } from "lucide-react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function FranchiseResourcesPage() {
  return (
    <ComingSoon
      icon={FolderOpen}
      title="자료실"
      description="본사가 마케팅·운영 자료를 올리고, 가맹점이 내려받는 곳이에요."
      features={[
        "자료 업로드와 분류(마케팅·운영·학부모 안내 등)",
        "새 자료가 올라오면 가맹점에 알림",
        "가맹점별 다운로드 현황",
      ]}
      backHref="/admin/franchise"
      backLabel="본사 허브"
      note="가맹점 구조(지점 구분)가 만들어지면 함께 열려요."
    />
  );
}
