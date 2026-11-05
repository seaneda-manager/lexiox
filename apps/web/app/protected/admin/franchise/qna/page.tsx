import { MessageSquare } from "lucide-react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function FranchiseQnaPage() {
  return (
    <ComingSoon
      icon={MessageSquare}
      title="가맹점 문의"
      description="가맹점 원장이 본사에 질문을 남기고, 본사가 답변하는 곳이에요."
      features={[
        "원장이 질문 등록, 본사가 답변 (미답변·검토 중·답변 완료 상태)",
        "자주 묻는 질문 모음으로 정리",
        "답변이 달리면 원장에게 알림",
      ]}
      backHref="/admin/franchise"
      backLabel="본사 허브"
      note="가맹점 구조(지점 구분)가 만들어지면 함께 열려요."
    />
  );
}
