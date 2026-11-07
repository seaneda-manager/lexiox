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

// Listening/Speaking 안내 화면과 같은 평면 흰 본문(카드 없음).
const OUTER_STYLE: React.CSSProperties = {
  minHeight: "100%",
  boxSizing: "border-box",
  padding: "6px 36px",
  backgroundColor: "#FFFFFF",
};

const CARD_STYLE: React.CSSProperties = {
  maxWidth: 620, margin: "0 auto", width: "100%",
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
          <h1 style={{ fontSize: 22, fontWeight: 400, color: "#333333", borderBottom: "1px solid #DDDDDD", paddingBottom: 8, marginBottom: 20 }}>
            Writing
          </h1>
          <p style={{ fontSize: 14, color: "#444444", lineHeight: 1.7, marginBottom: 20 }}>
            In the writing section, you will answer {totalQuestions} questions to demonstrate how
            well you can write in English. There are three types of tasks.
          </p>
          <table style={{ borderCollapse: "collapse", fontSize: 13, width: "auto", maxWidth: 420 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 12px", backgroundColor: "#F4A97A", color: "#222222", border: "1px solid #222222", fontWeight: 500 }}>
                  Type of Task
                </th>
                <th style={{ textAlign: "left", padding: "10px 12px", backgroundColor: "#F4A97A", color: "#222222", border: "1px solid #222222", fontWeight: 500 }}>
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {taskTypes.map((t) => (
                <tr key={t.title}>
                  <td style={{ padding: "10px 12px", border: "1px solid #222222", color: "#222222" }}>{t.title}</td>
                  <td style={{ padding: "10px 12px", border: "1px solid #222222", color: "#222222" }}>{t.description}</td>
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
          <h1 style={{ fontSize: 22, fontWeight: 400, color: "#333333", borderBottom: "1px solid #DDDDDD", paddingBottom: 8, marginBottom: 20 }}>
            {title}
          </h1>
          <p style={{ fontSize: 14, color: "#444444", lineHeight: 1.7 }}>{body}</p>
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
          <h1 style={{ fontSize: 22, fontWeight: 400, color: "#333333", borderBottom: "1px solid #DDDDDD", paddingBottom: 8, marginBottom: 20 }}>
            Time Remaining
          </h1>
          <p style={{ fontSize: 14, color: "#444444", lineHeight: 1.7, marginBottom: 16 }}>
            You still have time to respond. As long as there is time remaining, you can keep
            writing or revise your response.
          </p>
          <p style={{ fontSize: 14, color: "#444444", lineHeight: 1.7, marginBottom: 8 }}>
            Select <strong>Back</strong> to keep writing or revising.
          </p>
          <p style={{ fontSize: 14, color: "#444444", lineHeight: 1.7, marginBottom: 16 }}>
            Select <strong>Continue</strong> to leave this question.
          </p>
          <p style={{ fontSize: 14, color: "#444444", lineHeight: 1.7 }}>
            Once you leave this question, you WILL NOT be able to return to it.
          </p>
        </div>
      </div>
    </ETSLayout>
  );
}
