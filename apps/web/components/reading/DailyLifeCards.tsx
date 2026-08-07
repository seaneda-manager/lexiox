"use client";

// 실제 ETS TOEFL iBT Reading의 "Read in Daily Life"는 지문 형식(이메일/공지/SNS/문자/광고)에 따라
// 완전히 다른 그래픽으로 렌더된다 (이메일 헤더 박스, 전화기 프레임 SNS 카드, 말풍선 문자 등).
// 여기서는 저장된 contentHtml을 형식별로 파싱해 그 모양으로 그린다.
import {
  htmlToPlainText,
  parseEmail,
  parseTextMessages,
  parseHeadingAndBody,
} from "@/lib/reading/dailyLifeParse";
import type { DailyLifeContextType } from "@/models/reading";

const FONT = "Arial, Helvetica, sans-serif";

// ── Email ──────────────────────────────────────────────────────────────
function EmailCard({ raw }: { raw: string }) {
  const parsed = parseEmail(raw);
  if (!parsed || (parsed.headers.length === 0 && parsed.bodyParagraphs.length === 0)) {
    return <PlainTextCard raw={raw} />;
  }
  const { headers, salutation, bodyParagraphs, closing, signature } = parsed;

  return (
    <div style={{ fontFamily: FONT, border: "1px solid #D0D5DD", borderRadius: 6, overflow: "hidden", backgroundColor: "#FFFFFF" }}>
      {headers.length > 0 && (
        <div style={{ backgroundColor: "#F8F9FB", borderBottom: "1px solid #E0E0E0" }}>
          {headers.map((h) => (
            <div
              key={h.label}
              style={{ display: "flex", padding: "8px 16px", borderBottom: "1px solid #EAECEF", fontSize: 13 }}
            >
              <span style={{ width: 64, flexShrink: 0, color: "#888", fontWeight: 700 }}>{h.label}:</span>
              <span style={{ color: "#222" }}>{h.value}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: "20px 20px", fontSize: 15, lineHeight: 1.8, color: "#222" }}>
        {salutation && <p style={{ margin: "0 0 12px", fontWeight: 600 }}>{salutation}</p>}
        {bodyParagraphs.map((p, i) => (
          <p key={i} style={{ margin: "0 0 12px" }}>{p}</p>
        ))}
        {closing && (
          <p style={{ margin: "16px 0 0" }}>
            {closing},
            {signature.map((s, i) => (
              <span key={i} style={{ display: "block" }}>{s}</span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Notice ─────────────────────────────────────────────────────────────
function NoticeCard({ raw }: { raw: string }) {
  const { heading, bodyParagraphs } = parseHeadingAndBody(raw);
  if (!heading && bodyParagraphs.length === 0) return <PlainTextCard raw={raw} />;

  return (
    <div style={{ fontFamily: FONT, border: "1.5px solid #4A5568", borderRadius: 4, padding: "28px 32px", backgroundColor: "#FFFFFF", textAlign: "center" }}>
      {heading && (
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800, color: "#1A2B4C" }}>{heading}</h3>
      )}
      <div style={{ textAlign: "left", fontSize: 15, lineHeight: 1.8, color: "#222" }}>
        {bodyParagraphs.map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : "12px 0 0" }}>{p}</p>
        ))}
      </div>
    </div>
  );
}

// ── Advertisement / leaflet ───────────────────────────────────────────
function AdvertisementCard({ raw }: { raw: string }) {
  const { heading, bodyParagraphs } = parseHeadingAndBody(raw);
  if (!heading && bodyParagraphs.length === 0) return <PlainTextCard raw={raw} />;

  return (
    <div
      style={{
        fontFamily: FONT,
        border: "2px solid #0073E6",
        borderRadius: 10,
        padding: "28px 32px",
        background: "linear-gradient(180deg, #EBF3FC 0%, #FFFFFF 55%)",
        textAlign: "center",
      }}
    >
      {heading && (
        <h3 style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 900, color: "#0F3D91", letterSpacing: 0.2 }}>
          {heading}
        </h3>
      )}
      <div style={{ textAlign: "left", fontSize: 15, lineHeight: 1.8, color: "#222", display: "inline-block" }}>
        {bodyParagraphs.map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : "10px 0 0" }}>{p}</p>
        ))}
      </div>
    </div>
  );
}

// ── Social media post ─────────────────────────────────────────────────
function SocialPostCard({ raw }: { raw: string }) {
  const plain = raw.trim();
  const paragraphs = plain.split(/\n\s*\n/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
  const firstLine = plain.split("\n")[0]?.trim() ?? "";
  const looksLikeName = firstLine.length > 0 && firstLine.length <= 40 && /^[A-Z]/.test(firstLine) && !/[.!?]$/.test(firstLine);
  const author = looksLikeName ? firstLine : "User";
  const body = looksLikeName ? paragraphs.slice(1) : paragraphs;

  return (
    <div style={{ fontFamily: FONT, maxWidth: 380, margin: "0 auto", border: "1px solid #D0D5DD", borderRadius: 14, overflow: "hidden", backgroundColor: "#FFFFFF", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
      {/* 상단 미니 상태바 (실제 폰 화면 흉내) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", backgroundColor: "#F4F6F9", borderBottom: "1px solid #E8ECF0" }}>
        <span style={{ fontSize: 13 }}>📷</span>
        <div style={{ flex: 1, height: 5, margin: "0 10px", borderRadius: 3, backgroundColor: "#D8DEE6" }} />
        <span style={{ fontSize: 12, color: "#9AA5B1" }}>•••</span>
      </div>

      {/* 작성자 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 8px" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#0073E6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
          {author.charAt(0)}
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#222" }}>{author}</span>
      </div>

      {/* 본문 */}
      <div style={{ padding: "0 16px 14px", fontSize: 14, lineHeight: 1.7, color: "#333" }}>
        {body.map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : "10px 0 0" }}>{p}</p>
        ))}
      </div>

      {/* Like / Comment */}
      <div style={{ display: "flex", gap: 20, padding: "10px 16px", borderTop: "1px solid #EAECEF", fontSize: 13, color: "#666" }}>
        <span>👍 Like</span>
        <span>💬 Comment</span>
      </div>
    </div>
  );
}

// ── Text message chain (말풍선) ───────────────────────────────────────
function TextMessageCard({ raw }: { raw: string }) {
  const messages = parseTextMessages(raw);
  if (!messages || messages.length === 0) return <PlainTextCard raw={raw} />;

  const firstSender = messages[0].sender;

  return (
    <div style={{ fontFamily: FONT, maxWidth: 360, margin: "0 auto", border: "6px solid #1A2B4C", borderRadius: 24, overflow: "hidden", backgroundColor: "#FFFFFF", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
      <div style={{ backgroundColor: "#1A2B4C", color: "#fff", textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
        MESSAGES
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 12px", backgroundColor: "#EFF2F6" }}>
        {messages.map((m, i) => {
          const isMe = m.sender !== firstSender;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              <span style={{ fontSize: 10, color: "#8A94A3", margin: "0 6px 2px" }}>
                {m.sender}{m.time ? ` · ${m.time}` : ""}
              </span>
              <div
                style={{
                  maxWidth: "78%",
                  padding: "9px 13px",
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: isMe ? "#FFFFFF" : "#222",
                  backgroundColor: isMe ? "#0073E6" : "#FFFFFF",
                  border: isMe ? "none" : "1px solid #E0E0E0",
                  borderRadius: 16,
                  borderBottomRightRadius: isMe ? 4 : 16,
                  borderBottomLeftRadius: isMe ? 16 : 4,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Web article / fallback ────────────────────────────────────────────
function WebArticleCard({ raw }: { raw: string }) {
  const { heading, bodyParagraphs } = parseHeadingAndBody(raw);
  return (
    <div style={{ fontFamily: FONT }}>
      {heading && <h3 style={{ margin: "0 0 12px", fontSize: 19, fontWeight: 800, color: "#111" }}>{heading}</h3>}
      <div style={{ fontSize: 15, lineHeight: 1.8, color: "#222" }}>
        {(bodyParagraphs.length > 0 ? bodyParagraphs : [raw]).map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : "12px 0 0" }}>{p}</p>
        ))}
      </div>
    </div>
  );
}

function PlainTextCard({ raw }: { raw: string }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: 15, lineHeight: 1.8, color: "#222", whiteSpace: "pre-wrap" }}>
      {raw}
    </div>
  );
}

// ── Dispatcher ─────────────────────────────────────────────────────────
export function DailyLifeContent({
  contextType,
  contentHtml,
}: {
  contextType: DailyLifeContextType;
  contentHtml: string;
}) {
  const raw = htmlToPlainText(contentHtml);
  if (!raw) return null;

  switch (contextType) {
    case "email":
      return <EmailCard raw={raw} />;
    case "notice":
      return <NoticeCard raw={raw} />;
    case "advertisement":
      return <AdvertisementCard raw={raw} />;
    case "social_post":
      return <SocialPostCard raw={raw} />;
    case "text_message":
      return <TextMessageCard raw={raw} />;
    case "web_article":
      return <WebArticleCard raw={raw} />;
    default:
      return <PlainTextCard raw={raw} />;
  }
}
