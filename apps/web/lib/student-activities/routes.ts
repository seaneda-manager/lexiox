export function getDrillRoute(p: any): string {
  const payload =
    p?.payload && typeof p.payload === "object" ? p.payload : {};

  const route =
    typeof payload.route === "string" ? payload.route.trim() : "";

  if (route) {
    return `${route}?prescriptionId=${p.id}`;
  }

  const track = String(p?.track ?? payload.track ?? "").toLowerCase();
  const section = String(p?.section ?? payload.section ?? "").toLowerCase();
  const type = String(p?.prescription_type ?? "").toLowerCase();

  // ✅ VOCA
  if (
    track === "voca" ||
    track === "vocab" ||
    section.includes("vocab") ||
    type.includes("vocab")
  ) {
    return `/vocab/session?prescriptionId=${p.id}`;
  }

  // ✅ NAESIN (핵심 수정)
  if (
    track === "naesin" ||
    section.includes("drill") ||
    type.includes("drill") ||
    type.includes("naesin")
  ) {
    return `/naesin/drill?prescriptionId=${p.id}`;
  }

  return `/student`;
}
