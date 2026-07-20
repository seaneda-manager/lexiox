// apps/web/app/dev/upload/page.tsx
'use client';

import { useState } from 'react';

export default function DevUploadPage() {
  const [status, setStatus] = useState<string | null>(null);

  const onChangeFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus('업로드 중...');
      const text = await file.text();

      // TODO: 실제 업로드 API 연결하기
      // 예시: await fetch('/api/dev/upload', { method: 'POST', body: text });

      console.log('DEV UPLOAD CONTENT:', text.slice(0, 200));
      setStatus('파일을 읽었습니다. (콘솔 로그 확인)');
    } catch (err) {
      console.error(err);
      setStatus('에러가 발생했습니다.');
    }
  };

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Dev · Upload</h1>
      <p className="text-sm text-gray-600">
        개발용 업로드 테스트 페이지입니다. JSON이나 텍스트 파일을 선택하면
        브라우저에서 내용을 읽어서 콘솔에 일부를 찍습니다.
      </p>

      <div className="rounded border bg-white px-4 py-3 space-y-2">
        <input
          type="file"
          accept=".json,.txt,.csv,application/json,text/plain"
          onChange={onChangeFile}
          className="block w-full text-sm"
        />
        {status && <p className="text-xs text-gray-700">{status}</p>}
      </div>

      <p className="text-xs text-gray-500">
        실제 API 연동이 필요하면 <code className="rounded bg-gray-100 px-1">fetch</code> 부분을
        서버 라우트와 연결해서 사용하면 됩니다.
      </p>
    </main>
  );
}
