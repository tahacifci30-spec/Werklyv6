import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, Session } from "./types";
import { DEFAULT_COMPANY, getSettings } from "./store";

/**
 * Sessie-laag met een ondertekende cookie. De eigenaar logt in met het wachtwoord uit de omgeving (DEMO_PASSWORD);
 * elke monteur met zijn eigen e-mailadres en wachtwoord, die de eigenaar instelt bij Instellingen > Team.
 * Vervang later door Supabase Auth: getSession() blijft dezelfde vorm houden.
 */
const COOKIE = "werkly_session";
const SECRET = process.env.AUTH_SECRET ?? "dev-only-secret-change-me";
const PASSWORD = process.env.DEMO_PASSWORD ?? "werkly";

/**
 * In productie weigeren we inloggen zolang AUTH_SECRET en DEMO_PASSWORD niet zelf zijn ingesteld.
 * Anders zou een openbare site open staan met een bekend wachtwoord en een raadbaar cookie-geheim.
 */
export const AUTH_CONFIGURED =
  process.env.NODE_ENV !== "production" ||
  (!!process.env.AUTH_SECRET && !!process.env.DEMO_PASSWORD);

const USERS: Record<string, Session> = {
  "eigenaar@demo.nl": { name: "Eigenaar", role: "owner", company_id: DEFAULT_COMPANY },
  "monteur@demo.nl": { name: "Sven Bakker", role: "technician", company_id: DEFAULT_COMPANY },
};

export const DEMO_HINT = { password: PASSWORD, users: Object.keys(USERS) };

const sign = (v: string) => createHmac("sha256", SECRET).update(v).digest("base64url");

/** Wachtwoord van een monteur: alleen de afgeleide sleutel wordt bewaard, nooit het wachtwoord zelf. */
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length || 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function verifyLogin(email: string, password: string): Promise<Session | null> {
  if (!AUTH_CONFIGURED) return null;
  const key = email.trim().toLowerCase();
  const fixed = USERS[key];
  if (fixed) return same(password, PASSWORD) ? fixed : null;
  // Een monteur met een eigen login, ingesteld door de eigenaar.
  const { team } = await getSettings(DEFAULT_COMPANY);
  const member = team.find((m) => m.email?.toLowerCase() === key && m.pass);
  if (!member || !checkPassword(password, member.pass!)) return null;
  return { name: member.name, role: "technician", company_id: DEFAULT_COMPANY };
}

export async function startSession(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  if (!AUTH_CONFIGURED) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !same(sign(payload), sig)) return null;
  const text = Buffer.from(payload, "base64url").toString();
  try {
    const s = JSON.parse(text) as Partial<Session>;
    if (typeof s.name === "string" && (s.role === "owner" || s.role === "technician") && typeof s.company_id === "string") {
      return { name: s.name, role: s.role, company_id: s.company_id };
    }
    return null;
  } catch {
    // Cookie van voor deze versie: daar stond alleen het e-mailadres in.
    return USERS[text] ?? null;
  }
}

export async function requireSession(role?: Role): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (role && s.role !== role) redirect(s.role === "owner" ? "/dashboard" : "/technician");
  return s;
}
