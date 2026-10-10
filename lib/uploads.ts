import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { USE_SUPABASE } from "./defaults";
import { supabaseAdmin } from "./supabase-admin";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
export const BUCKET = "photos";
export const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;
// Serverless-hosting (Netlify) weigert aanvragen groter dan ~6 MB; houd marge voor de rest van het formulier.
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Valideert een lijst bestanden. Geeft een foutmelding of null. */
export function validateImages(files: File[], alreadyStored = 0): string | null {
  if (files.length + alreadyStored > MAX_PHOTOS) return `Maximaal ${MAX_PHOTOS} foto's.`;
  let total = 0;
  for (const f of files) {
    if (!EXT[f.type]) return `${f.name}: alleen JPG, PNG of WebP.`;
    if (f.size > MAX_BYTES) return `${f.name} is groter dan 5 MB.`;
    total += f.size;
  }
  if (total > MAX_TOTAL_BYTES) return "Samen mogen de foto's maximaal 5 MB zijn. Kies minder of kleinere foto's.";
  return null;
}

/** Slaat gevalideerde afbeeldingen op (Supabase Storage of lokale schijf) en geeft de bestandsnamen terug. */
export async function saveImages(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const names: string[] = [];
  if (!USE_SUPABASE) await fs.mkdir(UPLOAD_DIR, { recursive: true });
  for (const f of files) {
    const name = `${crypto.randomUUID()}.${EXT[f.type]}`;
    const bytes = Buffer.from(await f.arrayBuffer());
    if (USE_SUPABASE) {
      const { error } = await supabaseAdmin().storage.from(BUCKET).upload(name, bytes, { contentType: f.type });
      if (error) {
        console.error("[storage] upload mislukt:", error.message);
        throw new Error("Foto opslaan mislukt");
      }
    } else {
      await fs.writeFile(path.join(UPLOAD_DIR, name), bytes);
    }
    names.push(name);
  }
  return names;
}

export const onlyFiles = (list: FormDataEntryValue[]) =>
  list.filter((f): f is File => f instanceof File && f.size > 0);
