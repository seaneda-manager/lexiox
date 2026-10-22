import type { Post } from "@/lib/promo/types";
import { loadBase } from "../_data";
import { PostList } from "../_components/PostEditor";
import { PageHead, Panel } from "../_components/ui";

// 컨펌: 자동 일정·트렌드 플랜·본사 캠페인으로 만들어진 게시물을 승인하는 곳
export default async function ReviewPage() {
  const { ctx, channels } = await loadBase();
  const [{ data: pending }, { data: failed }] = await Promise.all([
    ctx.supabase.from("promo_posts").select("*").eq("org_id", ctx.org.id).eq("status", "pending").order("scheduled_on"),
    ctx.supabase.from("promo_posts").select("*").eq("org_id", ctx.org.id).eq("status", "failed").order("scheduled_on"),
  ]);
  const p = (pending ?? []) as Post[];
  const f = (failed ?? []) as Post[];
  return (
    <>
      <PageHead
        title="컨펌"
        desc="자동으로 만들어진 콘텐츠를 확인하고 승인하세요. 승인한 글은 연결된 채널(인스타그램·페이스북·유튜브·구글 비즈니스 프로필)에 예약 시간에 자동으로 올라가고, 나머지는 게시일에 '오늘' 탭에 올라와요."
      />
      {f.length > 0 && (
        <Panel title={`업로드 실패 ${f.length}건`}>
          <PostList posts={f} channels={channels} />
        </Panel>
      )}
      <Panel title={`컨펌 대기 ${p.length}건`}>
        <PostList posts={p} channels={channels} selectable empty="컨펌할 콘텐츠가 없어요. 새 콘텐츠는 매일 새벽(자동 일정)과 매주 월요일(트렌드 플랜)에 만들어져요." />
      </Panel>
    </>
  );
}
