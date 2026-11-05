import { Megaphone } from "lucide-react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function FranchiseAnnouncementsPage() {
  return (
    <ComingSoon
      icon={Megaphone}
      title="공지"
      description="본사가 가맹점에 공지를 보내고, 누가 읽었는지 확인하는 곳이에요."
      features={[
        "전체 또는 일부 가맹점에 공지 발송 (긴급·중요·일반 구분)",
        "가맹점별 읽음 확인 현황",
        "상단 고정과 예약 발송",
        "원장 화면의 '본사 소식'에 바로 표시",
      ]}
      backHref="/admin/franchise"
      backLabel="본사 허브"
      note="가맹점 구조(지점 구분)가 만들어지면 함께 열려요. 그때까지는 카카오톡 등 기존 방법으로 전달해 주세요."
    />
  );
}
