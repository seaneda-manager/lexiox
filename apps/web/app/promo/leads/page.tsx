import { loadBase, loadLeads } from "../_data";
import { LeadsClient } from "./LeadsClient";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; new?: string }> | { lead?: string; new?: string };
}) {
  const sp = await searchParams;
  const { ctx, channels } = await loadBase();
  const leads = await loadLeads(ctx.org.id, ctx.supabase);
  return <LeadsClient leads={leads} channels={channels} openId={sp.lead ?? null} openNew={sp.new === "1"} />;
}
