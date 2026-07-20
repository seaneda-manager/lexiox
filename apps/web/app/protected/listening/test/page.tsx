// apps/web/app/(protected)/listening/test/page.tsx

export const dynamic = 'force-dynamic';

// 리스닝 트랙 기본 타입 정의
// - DB에서는 id가 number일 수 있지만,
//   클라이언트에서는 URL/쿼리스트링에서 쓰기 편하도록 string으로 통일해서 사용한다.
export type ListeningTrack = {
  /** 트랙 고유 ID (URL 파라미터 등에서 사용하기 위해 문자열로 통일) */
  id: string;
  /** 트랙 제목 (표시용) */
  title?: string;
  /** 내부적인 이름(파일명, 코드용 네이밍 등)에 사용할 수 있는 필드 */
  name?: string;
  /** 레이블/태그 느낌의 짧은 표시용 텍스트 (예: "Conversation", "Lecture 1") */
  label?: string;
};

// Client 쪽 엔트리 컴포넌트에서 사용할 Props 타입
// 예: <ListeningRunner track={...} onFinishAction={...} />
export type ListeningTrackProps = Readonly<{
  /** 재생·풀이 대상이 되는 리스닝 트랙 메타 정보 */
  track: ListeningTrack;

  /**
   * 세션이 끝났을 때 호출되는 콜백
   * - sessionId: Supabase 등 DB에 저장된 세션의 고유 ID (문자열로 전달)
   * - 사용 예:
   *    - onFinishAction={(sessionId) => router.push(`/listening/review/${sessionId}`)}
   *    - onFinishAction={(sessionId) => console.log('finished session', sessionId)}
   */
  onFinishAction?: (sessionId: string) => void;
}>;

// ✅ 이게 중요: Next가 요구하는 default 페이지 컴포넌트
export default function ListeningTestIndexPage() {
  // TODO:
  //  나중에 여기서 Supabase에서 유저가 가진 listening 세트 목록을 불러와서
  //  /listening/test/[setId] 링크 리스트로 뿌려주면 된다.
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Listening Test</h1>
      <p className="text-sm text-gray-600">
        듣기 세트를 선택해서 테스트를 시작하세요.
      </p>

      <div className="rounded border p-4 text-sm text-gray-700 space-y-2 bg-white">
        <p>아직 인덱스 페이지 로직은 붙이지 않았고,</p>
        <p>
          주소창에 직접{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5">
            /listening/test/&lt;setId&gt;
          </code>
          로 들어가면 해당 세트 테스트 페이지로 이동합니다.
        </p>
        <p className="text-xs text-gray-500">
          나중에 이 페이지에서 유저가 다운로드한 세트 목록을 보여주도록 확장하면 돼요.
        </p>
      </div>
    </main>
  );
}
