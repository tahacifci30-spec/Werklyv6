import type { Metadata } from "next";
import Link from "next/link";
import { AgendaView } from "@/components/agenda/AgendaView";
import { AppShell } from "@/components/AppShell";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

export default async function TechnicianAgendaPage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const session = await requireSession("technician");
  const sp = await searchParams;
  return (
    <AppShell session={session} wide>
      <Link href="/technician" className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-foreground">
        ← Mijn werk
      </Link>
      <AgendaView session={session} base="/technician/agenda" m={sp.m} d={sp.d} />
    </AppShell>
  );
}
