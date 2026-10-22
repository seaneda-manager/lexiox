"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { approvePosts, deletePost, savePost } from "../actions";
import type { Channel, Post, PostMedia } from "@/lib/promo/types";
import { CHANNEL_KINDS, POST_STATUS } from "@/lib/promo/constants";
import { fmtShort, todayKST } from "@/lib/promo/dates";
import { ConfirmButton, Modal, copyText, useToast } from "./client-ui";
import { Dot, Pill, btn, btnChalk, btnPri, btnSm, inputCls, labelCls } from "./ui";

const SOURCE_LABEL = { manual: "직접 작성", auto: "자동 일정", campaign: "본사 캠페인", plan: "트렌드 플랜" } as const;

export const isAuto = (ch?: Channel | null) => !!(ch && CHANNEL_KINDS[ch.kind]?.provider && ch.connection_id && ch.target?.id);

export function StatusPill({ post }: { post: Post }) {
  const today = todayKST();
  if (post.status === "scheduled" && post.scheduled_on < today) return <Pill tone="bg-rose-100 text-rose-700">지남</Pill>;
  if (post.status === "scheduled" && post.scheduled_on === today) return <Pill tone="bg-amber-100 text-amber-800">오늘</Pill>;
  const s = POST_STATUS[post.status] ?? POST_STATUS.scheduled;
  return <Pill tone={s.tone}>{post.status === "scheduled" ? fmtShort(post.scheduled_on) : s.label}</Pill>;
}

export function PostEditor({
  post,
  channels,
  defaultDate,
  onClose,
}: {
  post: Post | null;
  channels: Channel[];
  defaultDate?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [f, setF] = useState({
    channel_id: post?.channel_id ?? channels[0]?.id ?? "",
    scheduled_on: post?.scheduled_on ?? defaultDate ?? todayKST(),
    scheduled_time: post?.scheduled_time?.slice(0, 5) ?? "",
    status: (post?.status ?? "scheduled") as Post["status"],
    title: post?.title ?? "",
    body: post?.body ?? "",
    tags: (post?.hashtags ?? []).join(" "),
    media: (post?.media ?? []) as PostMedia[],
  });
  const ch = channels.find((c) => c.id === f.channel_id);
  const kind = ch ? CHANNEL_KINDS[ch.kind] : null;
  const auto = isAuto(ch);
  const orgId = post?.org_id ?? channels[0]?.org_id;
  const fullText = () => [f.title, f.body, f.tags.trim()].filter(Boolean).join("\n\n");
  const editableStatus = ["pending", "scheduled", "posted", "skipped"].includes(f.status) ? f.status : "scheduled";

  const save = (status: Post["status"] = editableStatus as Post["status"], close = true) =>
    new Promise<boolean>((resolve) =>
      start(async () => {
        const r = await savePost({
          id: post?.id ?? null,
          channel_id: f.channel_id || null,
          title: f.title,
          body: f.body,
          hashtags: f.tags.split(/\s+/).filter(Boolean),
          scheduled_on: f.scheduled_on,
          scheduled_time: f.scheduled_time || null,
          status: status as "pending" | "scheduled" | "posted" | "skipped",
          media: f.media,
        });
        if (!r.ok) {
          toast.show(r.error ?? "저장하지 못했어요.");
          return resolve(false);
        }
        router.refresh();
        if (close) onClose();
        resolve(true);
      })
    );

  const upload = async (files: FileList | null) => {
    if (!files?.length || !orgId) return;
    setUploading(true);
    try {
      const sb = createBrowserClient();
      const added: PostMedia[] = [];
      for (const file of Array.from(files).slice(0, 10)) {
        const type = file.type.startsWith("video/") ? "video" : "image";
        const ext = (file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg")).toLowerCase();
        const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await sb.storage.from("promo-media").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(error.message);
        added.push({ path, type, url: sb.storage.from("promo-media").getPublicUrl(path).data.publicUrl });
      }
      setF((cur) => ({ ...cur, media: [...cur.media, ...added] }));
    } catch (e) {
      toast.show("파일을 올리지 못했어요: " + (e instanceof Error ? e.message : ""));
    }
    setUploading(false);
  };

  const publishNow = async () => {
    if (!post) return;
    if (!(await save(f.status === "pending" ? "scheduled" : (editableStatus as Post["status"]), false))) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/promo/publish-now", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      const j = await res.json();
      toast.show(j.ok ? "업로드했어요." : j.error);
      router.refresh();
      if (j.ok) onClose();
    } catch {
      toast.show("연결이 끊겼어요. 다시 시도해주세요.");
    }
    setPublishing(false);
  };

  const copy = async () => toast.show((await copyText(fullText())) ? "복사했어요. 채널에 붙여넣으세요." : "길게 눌러 직접 복사해주세요.");
  const missingMedia = kind?.needs && !f.media.some((m) => m.type === kind.needs || (kind.needs === "image" && m.type === "video"));

  return (
    <Modal title={post ? "게시물" : "새 게시물"} onClose={onClose}>
      {post && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill>{SOURCE_LABEL[post.source]}</Pill>
          <StatusPill post={post} />
          {auto && <Pill tone="bg-sky-100 text-sky-800">자동 업로드</Pill>}
          {post.external_url && (
            <a href={post.external_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 underline">
              올라간 글 보기
            </a>
          )}
        </div>
      )}
      {post?.status === "failed" && post.publish_error && (
        <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">업로드 실패: {post.publish_error}</p>
      )}

      <div className="grid gap-2.5 sm:grid-cols-4">
        <label className={`${labelCls} sm:col-span-2`}>
          채널
          <select id="pe_channel" className={inputCls} value={f.channel_id} onChange={(e) => setF({ ...f, channel_id: e.target.value })}>
            {channels.length === 0 && <option value="">채널 없음</option>}
            {channels.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          날짜
          <input id="pe_date" type="date" className={inputCls} value={f.scheduled_on} onChange={(e) => setF({ ...f, scheduled_on: e.target.value })} />
        </label>
        <label className={labelCls}>
          시간
          <input id="pe_time" type="time" className={inputCls} value={f.scheduled_time} onChange={(e) => setF({ ...f, scheduled_time: e.target.value })} />
        </label>
      </div>
      <label className={labelCls}>
        {ch?.kind === "youtube" ? "영상 제목" : "제목"}
        <input id="pe_title" className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </label>
      <label className={labelCls}>
        {ch?.kind === "youtube" ? "영상 설명" : "본문"}
        <textarea id="pe_body" className={`${inputCls} min-h-[200px] leading-relaxed`} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
      </label>
      <label className={labelCls}>
        해시태그 (띄어쓰기로 구분)
        <input id="pe_tags" className={inputCls} value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} />
      </label>

      <div className={labelCls}>
        이미지·영상 {kind?.needs === "image" ? "(인스타그램은 필수)" : kind?.needs === "video" ? "(유튜브는 영상 필수)" : "(선택)"}
        <div className="flex flex-wrap gap-2">
          {f.media.map((m) => (
            <div key={m.path} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full place-content-center text-xs text-slate-500">영상</span>
              )}
              <button
                type="button"
                aria-label="첨부 삭제"
                onClick={() => setF({ ...f, media: f.media.filter((x) => x.path !== m.path) })}
                className="absolute right-0.5 top-0.5 rounded bg-white/90 px-1 text-xs text-rose-600"
              >
                ✕
              </button>
            </div>
          ))}
          <label className={`${btn} ${btnSm} h-20 w-20 cursor-pointer flex-col`}>
            {uploading ? "올리는 중…" : "+ 추가"}
            <input
              id="pe_media"
              type="file"
              accept="image/jpeg,image/png,video/mp4,video/quicktime"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(e) => upload(e.target.files)}
            />
          </label>
        </div>
        {missingMedia && auto && <span className="text-xs text-rose-600">첨부가 없으면 자동 업로드가 실패해요.</span>}
      </div>

      {/* 컨펌 / 업로드 */}
      {post && post.status === "pending" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 p-3">
          <div className="min-w-[180px] flex-1">
            <div className="text-sm font-bold text-slate-900">컨펌 대기</div>
            <div className="text-xs text-slate-600">
              {auto ? `승인하면 ${fmtShort(f.scheduled_on)} ${f.scheduled_time || ""}에 ${ch?.name}에 자동으로 올라가요.` : "승인하면 게시일에 '오늘' 탭에 올라와요."}
            </div>
          </div>
          <button className={btn} disabled={pending} onClick={() => save("skipped")}>반려</button>
          <button className={btnPri} disabled={pending} onClick={() => save("scheduled")}>승인</button>
        </div>
      )}
      {post && (post.status === "scheduled" || post.status === "failed") && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <div className="min-w-[180px] flex-1">
            <div className="text-sm font-bold text-slate-900">{auto ? "자동 업로드 예약됨" : "올리기"}</div>
            <div className="text-xs text-slate-600">
              {auto ? "예약 시간에 자동으로 올라가요. 바로 올릴 수도 있어요." : "본문을 복사해 채널에 붙여넣고, 게시 완료로 표시하세요."}
            </div>
          </div>
          {auto ? (
            <button className={btnChalk} disabled={publishing || pending} onClick={publishNow}>
              {publishing ? "올리는 중…" : post.status === "failed" ? "다시 올리기" : "지금 올리기"}
            </button>
          ) : (
            <>
              <button className={btn} onClick={copy}>복사</button>
              {ch?.write_url && (
                <a className={btnChalk} href={ch.write_url} target="_blank" rel="noopener noreferrer" onClick={() => void copyText(fullText())}>
                  복사하고 {ch.name} 열기
                </a>
              )}
              <button className={btnPri} disabled={pending} onClick={() => save("posted")}>게시 완료</button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        {post ? (
          <ConfirmButton
            className={`${btn} ${btnSm} !text-rose-600`}
            onConfirm={() =>
              start(async () => {
                const r = await deletePost(post.id);
                if (!r.ok) return toast.show(r.error ?? "삭제하지 못했어요.");
                router.refresh();
                onClose();
              })
            }
          />
        ) : (
          <span />
        )}
        <button className={btnPri} disabled={pending || uploading} onClick={() => save()}>
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
      {toast.node}
    </Modal>
  );
}

/** 게시물 목록 + 눌러서 편집. selectable이면 일괄 승인용 체크박스 */
export function PostList({
  posts,
  channels,
  empty,
  selectable,
}: {
  posts: Post[];
  channels: Channel[];
  empty?: string;
  selectable?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<Post | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [busy, start] = useTransition();
  if (!posts.length) return <p className="py-3 text-sm text-slate-500">{empty ?? "게시물이 없어요."}</p>;
  return (
    <>
      {selectable && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button className={`${btn} ${btnSm}`} onClick={() => setSel(sel.length === posts.length ? [] : posts.map((p) => p.id))}>
            {sel.length === posts.length ? "선택 해제" : "모두 선택"}
          </button>
          <button
            className={`${btnPri} ${btnSm}`}
            disabled={!sel.length || busy}
            onClick={() =>
              start(async () => {
                const r = await approvePosts(sel);
                toast.show(r.ok ? `${sel.length}건 승인했어요.` : r.error ?? "승인하지 못했어요.");
                if (r.ok) {
                  setSel([]);
                  router.refresh();
                }
              })
            }
          >
            선택 {sel.length}건 승인
          </button>
        </div>
      )}
      <ul className="divide-y divide-slate-100">
        {posts.map((p) => {
          const ch = channels.find((c) => c.id === p.channel_id);
          return (
            <li key={p.id} className="flex items-start gap-2">
              {selectable && (
                <input
                  type="checkbox"
                  aria-label={`${p.title} 선택`}
                  className="mt-3.5"
                  checked={sel.includes(p.id)}
                  onChange={(e) => setSel(e.target.checked ? [...sel, p.id] : sel.filter((x) => x !== p.id))}
                />
              )}
              <button className="flex min-w-0 flex-1 items-start gap-3 py-2.5 text-left hover:bg-slate-50" onClick={() => setOpen(p)}>
                <Dot colorIdx={ch?.color_idx} />
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-semibold text-slate-900">{p.title || "(제목 없음)"}</span>
                  <span className="block text-[13px] text-slate-500">
                    {ch?.name ?? "채널 없음"} · {fmtShort(p.scheduled_on)}
                    {p.scheduled_time ? ` ${p.scheduled_time.slice(0, 5)}` : ""}
                    {isAuto(ch) ? " · 자동 업로드" : ""}
                    {p.media?.length ? ` · 첨부 ${p.media.length}` : ""}
                  </span>
                </span>
                <StatusPill post={p} />
              </button>
            </li>
          );
        })}
      </ul>
      {open && <PostEditor post={open} channels={channels} onClose={() => setOpen(null)} />}
      {toast.node}
    </>
  );
}
