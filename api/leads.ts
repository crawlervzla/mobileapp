import { createClient } from "@supabase/supabase-js";
import { consentVersion, parseLead, type LeadRecord } from "../src/lead.ts";

const maxBodyBytes = 16_384;
const productionOrigins = new Set(["https://mobileapp.cl", "https://www.mobileapp.cl"]);

export type LeadSaveResult = "saved" | "limited";
export type LeadWriter = (lead: LeadRecord, meta: { consentVersion: string }) => Promise<LeadSaveResult>;

export async function POST(request: Request): Promise<Response> {
  return handleLeadRequest(request);
}

export async function handleLeadRequest(request: Request, writer?: LeadWriter): Promise<Response> {
  try {
    if (request.method !== "POST") return json({ ok: false, message: "Método no permitido." }, 405);

    if (!originAllowed(request)) return json({ ok: false, message: "No pudimos aceptar la solicitud." }, 403);
    if (!writer && readEnv("MOBILEAPP_LEADS_ENABLED") !== "true") {
      return json({ ok: false, message: "El formulario está temporalmente desactivado. La solicitud no se guardó." }, 503);
    }

    const body = await readJson(request);
    if (!body.ok) return json({ ok: false, message: body.message }, body.status);

    const parsed = parseLead(body.value);
    if (!parsed.ok) return json({ ok: false, message: parsed.message }, 400);
    if (parsed.lead.companyWebsite.trim() !== "") return json({ ok: true }, 200);

    const save = writer ?? writerFromEnv();
    if (!save) {
      return json({ ok: false, message: "El almacenamiento todavía no está configurado. La solicitud no se guardó." }, 503);
    }

    const result = await save(parsed.lead, { consentVersion });
    if (result === "limited") {
      return json({ ok: false, message: "Ya recibimos varias solicitudes con este correo. Escríbenos más tarde." }, 429);
    }
    return json({ ok: true }, 201);
  } catch {
    return json({ ok: false, message: "No pudimos guardar la solicitud. Inténtalo de nuevo en unos minutos." }, 502);
  }
}

export default { fetch: POST };

function writerFromEnv(): LeadWriter | null {
  const url = readEnv("SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;

  return async (lead, meta) => {
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("mob_insert_mobileapp_lead", {
      payload: {
        full_name: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        location: lead.location,
        business_name: lead.businessName,
        business_stage: lead.businessStage,
        industry: lead.industry,
        services: lead.services,
        challenge: lead.challenge,
        startup_capital: lead.startupCapital,
        project_budget: lead.projectBudget,
        timeline: lead.timeline,
        consent_version: meta.consentVersion,
      },
    });
    if (error) throw new Error("lead-provider");
    if (data === "rate_limited") return "limited";
    if (data === "inserted") return "saved";
    throw new Error("lead-provider");
  };
}

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let requestOrigin = "";
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }
  return origin === requestOrigin || productionOrigins.has(origin);
}

async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; status: number; message: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, status: 400, message: "No pudimos leer la solicitud." };
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    return { ok: false, status: 413, message: "La solicitud es demasiado grande." };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBodyBytes) {
    return { ok: false, status: 413, message: "La solicitud es demasiado grande." };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, message: "No pudimos leer la solicitud." };
  }
}

function readEnv(name: string): string | undefined {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = runtime.process?.env?.[name];
  return value && value.trim() !== "" ? value : undefined;
}

function json(body: { ok: boolean; message?: string }, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
