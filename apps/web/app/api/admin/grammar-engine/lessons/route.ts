export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { validateGrammarLesson, type GrammarLesson } from "@/models/middle-naesin/grammar-lesson";
import { generateLesson, reviewLesson } from "@/lib/grammar-engine/lesson-ai";
import { loadCtx } from "@/lib/grammar-engine/ctx";
import { lintLesson } from "@/lib/grammar-engine/lint";
import { synthesizeNarration } from "@/lib/elevenlabs/synthesize";
import { saveSpeechAudio } from "@/lib/elevenlabs/generate-speech";
import { toSpeech } from "@/lib/grammar-engine/speech";
import { buildTimings, synthesizeWithTimestamps } from "@/lib/elevenlabs/timestamps";
import { collectObjects, isSectionKey, mergeSection, normalizeLesson, parsePasted } from "@/lib/grammar-engine/sections";

type Db = ReturnType<typeof getServiceRoleClient>;

// 확정 시 lesson 의 drill/문제를 grammar_items 로 복사 (단일 출처는 lesson, items 는 사본)
async function syncItems(db: Db, lessonId: string, conceptId: string, level: number, lesson: GrammarLesson, source: string) {
  const del = await db.from("grammar_items").delete().eq("lesson_id", lessonId);
  if (del.error) throw new Error(del.error.message);
  const base = { concept_id: conceptId, level, lesson_id: lessonId, status: "final", source };
  const rows = [
    ...lesson.drillFill.map((p) => ({ ...base, kind: "fill", payload: p })),
    ...lesson.drillFix.map((p) => ({ ...base, kind: "fix", payload: p })),
    ...lesson.questions.map((p) => ({ ...base, kind: p.kind, payload: p })),
  ];
  if (rows.length === 0) return 0;
  const ins = await db.from("grammar_items").insert(rows);
  if (ins.error) throw new Error(ins.error.message);
  return rows.length;
}

export async function POST(req: Request) {
  try {
    const { user } = await requireTeacherOrAdmin();
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const conceptKey = String(body?.conceptKey ?? "");
    const level = Number(body?.level);
    if (!conceptKey || !Number.isInteger(level) || level < 1 || level > 5) {
      return NextResponse.json({ ok: false, error: "conceptKey / level(1~5) 가 필요합니다." }, { status: 400 });
    }

    const db = getServiceRoleClient();
    const loaded = await loadCtx(db, conceptKey, level);
    if (!loaded) return NextResponse.json({ ok: false, error: "개념을 찾을 수 없습니다." }, { status: 404 });
    const { concept, ctx } = loaded;

    const { data: existing } = await db.from("grammar_lessons").select("*").eq("concept_id", concept.id).eq("level", level).maybeSingle();

    // 외부 AI 에서 만들어 붙여넣는 방식이 기본. API 호출(유료)은 GRAMMAR_ENGINE_AI=1 일 때만.
    if ((action === "generate" || action === "review") && process.env.GRAMMAR_ENGINE_AI !== "1") {
      return NextResponse.json({ ok: false, error: "AI 자동 생성은 꺼져 있습니다. 프롬프트를 복사해 외부 AI 에서 만든 결과를 붙여 넣으세요." }, { status: 403 });
    }

    if (action === "paste") {
      if (existing?.status === "final") return NextResponse.json({ ok: false, error: "확정된 레슨입니다. 먼저 초안으로 되돌리세요." }, { status: 409 });
      const section = body?.section;
      if (!isSectionKey(section)) return NextResponse.json({ ok: false, error: "section 이 올바르지 않습니다." }, { status: 400 });
      const parsed = parsePasted(String(body?.text ?? ""));
      if ("error" in parsed) return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
      const merged = mergeSection(existing?.lesson, section, parsed.data);
      if ("errors" in merged) return NextResponse.json({ ok: false, error: merged.errors.slice(0, 8).join(" / ") }, { status: 422 });
      const row = {
        concept_id: concept.id, level, status: "draft", lesson: merged.lesson,
        source: existing?.source ?? "manual", ai_review: null, reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString(),
      };
      const { error } = await db.from("grammar_lessons").upsert(row, { onConflict: "concept_id,level" });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "generate") {
      // 확정본은 덮어쓰지 않는다. 먼저 초안으로 되돌려야 다시 생성할 수 있다.
      if (existing?.status === "final") {
        return NextResponse.json({ ok: false, error: "확정된 레슨은 다시 생성할 수 없습니다. 먼저 초안으로 되돌리세요." }, { status: 409 });
      }
      const gen = await generateLesson(ctx, level);
      if ("errors" in gen) {
        return NextResponse.json({ ok: false, error: `AI 결과가 형식에 맞지 않습니다: ${gen.errors.slice(0, 6).join(" / ")}` }, { status: 502 });
      }
      const row = { concept_id: concept.id, level, status: "draft", lesson: gen.lesson, source: "ai", ai_review: null, reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() };
      const { error } = await db.from("grammar_lessons").upsert(row, { onConflict: "concept_id,level" });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (!existing) return NextResponse.json({ ok: false, error: "레슨이 아직 없습니다. 먼저 생성하세요." }, { status: 404 });

    if (action === "paste-review") {
      const text = String(body?.text ?? "");
      const parsed = parsePasted(text, (d) => Array.isArray(d.issues));
      let rawIssues: any[] | null = !("error" in parsed) && Array.isArray(parsed.data.issues) ? parsed.data.issues : null;
      // 끝이 잘려 바깥 JSON 이 안 읽히면, 읽히는 개별 지적 항목({target?, severity?, note})만 모은다
      if (!rawIssues) {
        const items = collectObjects(text, (d) => typeof d.note === "string" && !Array.isArray(d.issues));
        if (items.length > 0) rawIssues = items;
      }
      if (!rawIssues && "error" in parsed) return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
      const issues = rawIssues
        ? rawIssues.filter((x: any) => x && x.note).map((x: any) => ({
            target: String(x.target ?? "overall"),
            severity: ["high", "med", "low"].includes(x.severity) ? x.severity : "med",
            note: String(x.note),
          }))
        : null;
      if (!issues) return NextResponse.json({ ok: false, error: "붙여 넣은 글에서 {\"issues\": [...]} 형태를 찾지 못했습니다. 검수 AI의 답변(JSON)을 복사했는지 확인하세요. 문제가 없다면 {\"issues\": []} 로 답하게 하세요." }, { status: 422 });
      const review = { issues, reviewedAt: new Date().toISOString() };
      const { error } = await db.from("grammar_lessons").update({ ai_review: review }).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "review") {
      const v = validateGrammarLesson(existing.lesson);
      if (!v.ok) return NextResponse.json({ ok: false, error: "레슨 형식이 올바르지 않습니다." }, { status: 422 });
      const review = await reviewLesson(ctx, level, v.lesson);
      const { error } = await db.from("grammar_lessons").update({ ai_review: review }).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, review });
    }

    if (action === "save") {
      const raw = body?.lesson;
      if (!raw || typeof raw !== "object") return NextResponse.json({ ok: false, error: "lesson 이 객체가 아닙니다." }, { status: 422 });
      // 수정하면 항상 초안으로 돌아가고 AI 검수는 무효화, items 사본도 내린다. 엄격 검증은 확정 때 한다.
      await db.from("grammar_items").delete().eq("lesson_id", existing.id);
      const lesson = { ...normalizeLesson(raw), version: 1, status: "draft", finalizedAt: undefined };
      const { error } = await db
        .from("grammar_lessons")
        .update({ lesson, status: "draft", ai_review: null, reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "finalize") {
      const v = validateGrammarLesson(existing.lesson);
      if ("errors" in v) return NextResponse.json({ ok: false, error: `확정할 수 없습니다: ${v.errors.slice(0, 5).join(" / ")}` }, { status: 422 });
      const lintErrors = lintLesson(v.lesson).filter((x) => x.level === "error");
      if (lintErrors.length > 0) {
        const head = lintErrors.slice(0, 4).map((x) => `${x.where}: ${x.msg}`).join(" / ");
        return NextResponse.json({ ok: false, error: `자동 점검 오류 ${lintErrors.length}건이 있어 확정할 수 없습니다. ${head}${lintErrors.length > 4 ? " …" : ""}` }, { status: 422 });
      }
      const now = new Date().toISOString();
      const lesson = { ...v.lesson, status: "final" as const, finalizedAt: now };
      const { error } = await db
        .from("grammar_lessons")
        .update({ lesson, status: "final", reviewed_by: user.id, reviewed_at: now, updated_at: now })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      const itemCount = await syncItems(db, existing.id, concept.id, level, lesson, existing.source);
      return NextResponse.json({ ok: true, itemCount });
    }

    // 강의 음성: 문법 2026 강의와 같은 ElevenLabs 파이프라인(선생님 클론 목소리, [en] 구간은 영어 발음)을 쓴다.
    // 사용자가 버튼을 눌렀을 때만 ElevenLabs 크레딧을 쓴다. 이미 음성이 있는 세그먼트는 force 가 아니면 건너뛴다.
    if (action === "lecture-audio") {
      const voiceId = (typeof body?.voiceId === "string" && body.voiceId.trim()) || process.env.LESSON_VOICE_ID || "";
      const enVoiceId = process.env.LESSON_VOICE_ID_EN || undefined;
      const modelId = process.env.LESSON_TTS_MODEL_ID || "eleven_multilingual_v2";
      if (!voiceId) return NextResponse.json({ ok: false, error: "LESSON_VOICE_ID(클론 목소리)가 서버 환경변수에 없습니다. Vercel 환경변수에 추가한 뒤 다시 배포하세요." }, { status: 422 });
      if (!/^[A-Za-z0-9]{8,40}$/.test(voiceId)) return NextResponse.json({ ok: false, error: "Voice ID 형식이 올바르지 않습니다." }, { status: 400 });

      const lesson = normalizeLesson(existing.lesson) as any;
      const segs: any[] = Array.isArray(lesson.lecture) ? lesson.lecture : [];
      if (segs.length === 0) return NextResponse.json({ ok: false, error: "먼저 5번 섹션(강의)을 채우세요." }, { status: 422 });

      const force = body?.force === true;
      let made = 0;
      const failures: number[] = [];
      for (let i = 0; i < segs.length; i++) {
        const tagged = String(segs[i].narration ?? "").trim();
        if (!tagged || (segs[i].audioUrl && !force)) continue;
        try {
          // speech 가 있으면(영어 단어를 한글 발음으로 바꿔 쓴 문장) 조각내지 않고 한 번에 합성한다 → 끊김 없음
          const speech = String(segs[i].speech ?? "").trim() || toSpeech(tagged);
          if (speech) {
            // 글자별 시간도 같이 받아, 영어가 들어간 자막 문장을 음성과 맞춘다(문장 수가 다르면 timings 없이 저장)
            const r = await synthesizeWithTimestamps(speech, voiceId, modelId);
            segs[i].audioUrl = (await saveSpeechAudio(r.audio)).url;
            const plain = tagged.replace(/\[\/?en\]/gi, "");
            const t = buildTimings(speech, plain, r.alignment);
            if (t) segs[i].timings = t;
            else delete segs[i].timings;
          } else {
            const synth = await synthesizeNarration(tagged, { koVoiceId: voiceId, enVoiceId, modelId, mode: /\[en\]/i.test(tagged) ? "tags" : "auto" });
            segs[i].audioUrl = (await saveSpeechAudio(synth.audio)).url;
            delete segs[i].timings;
          }
          made++;
        } catch (e) {
          console.error(`lecture-audio 실패 (seg ${i}):`, e);
          failures.push(i + 1);
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      const { error } = await db.from("grammar_lessons").update({ lesson: { ...lesson, lecture: segs }, updated_at: new Date().toISOString() }).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, made, failures, total: segs.length });
    }

    if (action === "revert") {
      const v = validateGrammarLesson(existing.lesson);
      const lesson = v.ok ? { ...v.lesson, status: "draft" as const, finalizedAt: undefined } : existing.lesson;
      await db.from("grammar_items").delete().eq("lesson_id", existing.id);
      const { error } = await db
        .from("grammar_lessons")
        .update({ lesson, status: "draft", reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: `알 수 없는 action: ${action}` }, { status: 400 });
  } catch (e: any) {
    const msg = String(e?.message ?? "Unknown error");
    const status = msg.startsWith("401") ? 401 : msg.startsWith("403") ? 403 : 500;
    console.error("GRAMMAR-ENGINE LESSONS ERROR", e);
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
