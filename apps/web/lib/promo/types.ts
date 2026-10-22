import type { ChannelKind, LeadStage } from "./constants";

export type PromoOrg = { id: string; name: string; kind: "hq" | "branch"; parent_id: string | null };

export type OrgProfile = {
  org_id: string;
  display_name: string | null;
  region: string | null;
  grades: string | null;
  subjects: string | null;
  strengths: string | null;
  classes: string | null;
  phone: string | null;
  tone: string | null;
  avoid: string | null;
  trend_keywords: string[];
  auto_approve: boolean;
};

export type Channel = {
  id: string;
  org_id: string;
  kind: ChannelKind;
  name: string;
  handle: string | null;
  write_url: string | null;
  active: boolean;
  color_idx: number;
  connection_id: string | null;
  target: ChannelTarget | null;
};

export type ChannelTarget = { id: string; name: string; type: "fb_page" | "ig_user" | "yt_channel" | "gbp_location" };

export type Automation = {
  id: string;
  org_id: string;
  channel_id: string;
  weekdays: number[];
  post_time: string | null;
  topics: string[];
  active: boolean;
  last_generated_at: string | null;
};

export type PostStatus = "pending" | "scheduled" | "publishing" | "posted" | "failed" | "skipped";
export type PostSource = "manual" | "auto" | "campaign" | "plan";
export type PostMedia = { url: string; path: string; type: "image" | "video" };

export type Post = {
  id: string;
  org_id: string;
  channel_id: string | null;
  title: string;
  body: string;
  hashtags: string[];
  scheduled_on: string;
  scheduled_time: string | null;
  status: PostStatus;
  source: PostSource;
  campaign_id: string | null;
  posted_at: string | null;
  media: PostMedia[];
  external_url: string | null;
  publish_error: string | null;
};

export type Connection = {
  id: string;
  org_id: string;
  provider: "meta" | "google";
  account_label: string | null;
  status: "active" | "expired" | "revoked";
  token_expires_at: string | null;
  meta: { targets?: ChannelTarget[] } & Record<string, unknown>;
};

export type TrendReport = {
  id: string;
  org_id: string;
  period_start: string;
  keywords: { groupName: string; keywords: string[] }[];
  trend_data: { groups?: { name: string; recent: number; previous: number; change: number | null; series: number[] }[]; error?: string };
  summary: string | null;
  insights: string[];
  plan: { date: string; kind: string; topic: string; angle?: string }[];
  posts_created: number;
  created_at: string;
};

export type Lead = {
  id: string;
  org_id: string;
  student_name: string;
  grade: string | null;
  school: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  source_channel_id: string | null;
  source_label: string | null;
  stage: LeadStage;
  inquired_on: string;
  next_contact_on: string | null;
  enrolled_on: string | null;
  memo: string | null;
};

export type Campaign = {
  id: string;
  hq_org_id: string;
  title: string;
  summary: string | null;
  starts_on: string | null;
  ends_on: string | null;
  channel_kinds: string[];
  brief: string | null;
  template_title: string | null;
  template_body: string | null;
  status: "draft" | "published" | "archived";
};

export type BrandGuide = {
  hq_org_id: string;
  brand_name: string | null;
  tone: string | null;
  must_include: string[];
  must_avoid: string[];
  default_hashtags: string[];
  footer: string | null;
};

/** promo_learning_snapshots.metrics — 가맹점·월 단위 집계값만 담는다 (개인 식별 정보 없음) */
export type LearningMetrics = {
  students: {
    active: number;
    newThisMonth: number;
    byBand: Record<"초등" | "중등" | "고등" | "기타", number>;
  };
  vocab: {
    activeStudents: number;
    drillTotal: number;
    drillCorrect: number;
    accuracy: number | null; // %
    setsCompleted: number;
  };
  homework: { submissions: number; accuracy: number | null };
  reading: { testsFinished: number };
};

export type Snapshot = { org_id: string; period_month: string; metrics: LearningMetrics; computed_at: string };

export type GeneratedPost = { title: string; body: string; hashtags: string[] };
