import type { Metadata } from "next";
import { AgendaView } from "@/components/agenda/AgendaView";
import { AppShell } from "@/components/AppShell";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const session = await requireSession("owner");
  const sp = await searchParams;
  return (
    <AppShell session={session} wide>
      <AgendaView session={session} base="/dashboard/agenda" m={sp.m} d={sp.d} />
    </AppShell>
  );
}
