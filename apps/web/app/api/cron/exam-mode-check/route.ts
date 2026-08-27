export const dynamic = "force-dynamic";

import { notifyUpcomingExamModes, executeScheduledHolds, resumeExpiredHolds } from "@/lib/examMode/applyExamMode";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const notify = await notifyUpcomingExamModes();
    const hold = await executeScheduledHolds();
    const resume = await resumeExpiredHolds();

    return Response.json({
      ok: true,
      notified: notify.notified,
      held: hold.held,
      resumed: resume.resumed,
      errors: [...notify.errors, ...hold.errors, ...resume.errors],
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("exam-mode-check cron error:", e);
    return Response.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
