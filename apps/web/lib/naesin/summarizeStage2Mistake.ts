import {
  STAGE2_WEAKNESS_LABEL,
  type Stage2Mistake,
  type Stage2WeaknessKind,
  type Stage2WeaknessSummaryItem,
} from "@/components/naesin/drill/stage2-types";

type Bucket = {
  kind: Stage2WeaknessKind;
  count: number;
  sentences: Set<string>;
  lastSeenAt: string;
  reasons: Map<string, number>;
};

function getSeverity(count: number): "low" | "medium" | "high" {
  if (count >= 6) return "high";
  if (count >= 3) return "medium";
  return "low";
}

export function summarizeStage2Mistakes(
  log: Stage2Mistake[]
): Stage2WeaknessSummaryItem[] {
  const buckets = new Map<Stage2WeaknessKind, Bucket>();

  for (const item of log) {
    const prev = buckets.get(item.kind) ?? {
      kind: item.kind,
      count: 0,
      sentences: new Set<string>(),
      lastSeenAt: item.createdAt,
      reasons: new Map<string, number>(),
    };

    prev.count += 1;
    prev.sentences.add(item.sentenceKey);

    if (item.createdAt > prev.lastSeenAt) {
      prev.lastSeenAt = item.createdAt;
    }

    const reason = (item.reason ?? "").trim();
    if (reason) {
      prev.reasons.set(reason, (prev.reasons.get(reason) ?? 0) + 1);
    }

    buckets.set(item.kind, prev);
  }

  return [...buckets.values()]
    .map((bucket) => {
      const topReasons = [...bucket.reasons.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([reason]) => reason);

      return {
        kind: bucket.kind,
        label: STAGE2_WEAKNESS_LABEL[bucket.kind],
        count: bucket.count,
        sentenceCount: bucket.sentences.size,
        severity: getSeverity(bucket.count),
        lastSeenAt: bucket.lastSeenAt,
        topReasons,
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastSeenAt.localeCompare(a.lastSeenAt);
    });
}
