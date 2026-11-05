import { GraduationCap } from "lucide-react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function FranchiseTrainingPage() {
  return (
    <ComingSoon
      icon={GraduationCap}
      title="교육"
      description="신규 가맹점 온보딩과 선생님 교육 과정을 관리하는 곳이에요."
      features={[
        "교육 과정과 단계(모듈) 만들기",
        "가맹점·선생님별 이수 현황과 진행률",
        "교육 영상과 자료 연결",
      ]}
      backHref="/admin/franchise"
      backLabel="본사 허브"
      note="가맹점 구조(지점 구분)가 만들어지면 함께 열려요."
    />
  );
}
