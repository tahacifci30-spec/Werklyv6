import { promises as fs } from "node:fs";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { USE_SUPABASE } from "@/lib/defaults";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { BUCKET } from "@/lib/uploads";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  if (!(await getSession())) return new Response("Unauthorized", { status: 401 });
  const { name } = await params;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    let bytes: Uint8Array;
    if (USE_SUPABASE) {
      const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(name);
      if (error || !data) return new Response("Not found", { status: 404 });
      bytes = new Uint8Array(await data.arrayBuffer());
    } else {
      bytes = new Uint8Array(await fs.readFile(path.join(process.cwd(), "data", "uploads", name)));
    }
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": TYPES[name.split(".")[1]],
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
