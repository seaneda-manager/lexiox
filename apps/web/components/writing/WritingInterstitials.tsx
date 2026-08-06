"use client";

/**
 * Writing 섹션의 ETS 인터스티셜 화면들.
 * - WritingIntroScreen: 섹션 첫 화면 (Task 종류 안내 표)
 * - TaskBeginScreen: 각 Task 시작 전 짧은 안내 + Begin 버튼
 * - LeaveConfirmScreen: Task 경계를 넘어갈 때 "Time Remaining" 경고
 *
 * 타이머/문항 진행률이 없는 화면이므로 ETSLayout을 hideFooter로 재사용한다.
 */

import { ETSLayout } from "./ETSLayout";

// 창 배경(#F4F6F9) 위에 떠 있는 흰색 카드 — 문항 화면(BuildASentence 등)과 같은 패턴.
const OUTER_STYLE: React.CSSProperties = {
  height: "100%",
  boxSizing: "border-box",
  padding: 32,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const CARD_STYLE: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  width: "100%",
  backgroundColor: "#FFFFFF",
  borderRadius: 8,
  padding: 32,
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  boxSizing: "border-box",
};

// ══════════════════════════════════════════════════════════════════════
// Writing 섹션 첫 화면
// ══════════════════════════════════════════════════════════════════════
export function WritingIntroScreen({
  totalQuestions,
  taskTypes,
  onContinue,
}: {
  totalQuestions: number;
  taskTypes: { title: string; description: string }[];
  onContinue: () => void;
}) {
  return (
    <ETSLayout title="Writing" hideFooter onNext={onContinue} nextLabel="Continue >">
      <div style={OUTER_STYLE}>
        <div style={CARD_STYLE}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#333333", borderBottom: "1px solid #E0E0E0", paddingBottom: 12, marginBottom: 20 }}>
            Writing
          </h1>
          <p style={{ fontSize: 15, color: "#333333", lineHeight: 1.8, marginBottom: 20 }}>
            In the writing section, you will answer {totalQuestions} questions to demonstrate how
            well you can write in English. There are three types of tasks.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 12px", backgroundColor: "#F4A97A", border: "1px solid #C0C8D0", fontWeight: 700 }}>
                  Type of Task
                </th>
                <th style={{ textAlign: "left", padding: "10px 12px", backgroundColor: "#F4A97A", border: "1px solid #C0C8D0", fontWeight: 700 }}>
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {taskTypes.map((t) => (
                <tr key={t.title}>
                  <td style={{ padding: "10px 12px", border: "1px solid #C0C8D0", color: "#333333" }}>{t.title}</td>
                  <td style={{ padding: "10px 12px", border: "1px solid #C0C8D0", color: "#333333" }}>{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ETSLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Task별 시작 화면
// ══════════════════════════════════════════════════════════════════════
export function TaskBeginScreen({
  title,
  body,
  onBegin,
}: {
  title: string;
  body: string;
  onBegin: () => void;
}) {
  return (
    <ETSLayout title="Writing" hideFooter onNext={onBegin} nextLabel="Begin >">
      <div style={OUTER_STYLE}>
        <div style={CARD_STYLE}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#333333", borderBottom: "1px solid #E0E0E0", paddingBottom: 12, marginBottom: 20 }}>
            {title}
          </h1>
          <p style={{ fontSize: 15, color: "#333333", lineHeight: 1.8 }}>{body}</p>
        </div>
      </div>
    </ETSLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Task 경계 이탈 확인 화면 ("Time Remaining")
// ══════════════════════════════════════════════════════════════════════
export function LeaveConfirmScreen({
  timerDisplay,
  onBack,
  onContinue,
}: {
  timerDisplay?: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <ETSLayout
      title="Writing"
      hideFooter
      timerDisplay={timerDisplay}
      onBack={onBack}
      onNext={onContinue}
      nextLabel="Continue >"
    >
      <div style={OUTER_STYLE}>
        <div style={CARD_STYLE}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#333333", borderBottom: "1px solid #E0E0E0", paddingBottom: 12, marginBottom: 20 }}>
            Time Remaining
          </h1>
          <p style={{ fontSize: 15, color: "#333333", lineHeight: 1.8, marginBottom: 16 }}>
            You still have time to respond. As long as there is time remaining, you can keep
            writing or revise your response.
          </p>
          <p style={{ fontSize: 15, color: "#333333", lineHeight: 1.8, marginBottom: 8 }}>
            Select <strong>Back</strong> to keep writing or revising.
          </p>
          <p style={{ fontSize: 15, color: "#333333", lineHeight: 1.8, marginBottom: 16 }}>
            Select <strong>Continue</strong> to leave this question.
          </p>
          <p style={{ fontSize: 15, color: "#333333", lineHeight: 1.8 }}>
            Once you leave this question, you WILL NOT be able to return to it.
          </p>
        </div>
      </div>
    </ETSLayout>
  );
}
