import { loadBase } from "../_data";
import { PageHead } from "../_components/ui";
import { WriteClient } from "./WriteClient";

export default async function WritePage() {
  const { channels } = await loadBase();
  return (
    <>
      <PageHead
        title="홍보 문구 생성"
        desc="채널과 목적을 고르면 학원 정보, 본사 브랜드 가이드, 이번 달 학습 데이터를 반영해 바로 올릴 수 있는 글을 써드려요."
      />
      <WriteClient channels={channels.filter((c) => c.active)} />
    </>
  );
}
