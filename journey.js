import { candidates, selectedDraft, editDraft, evaluation } from "./planning.js";
import { fulfillmentPlan, strategies } from "./fulfillment.js";
import { initialInventory } from "./inventory-data.js";

export const dataKey = "qudra.frontend.v1";
export const sessionKey = "qudra.technician.v1";
const fail = (code) => { throw new Error(code); };
const clean = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
const fingerprint = (row, plan) => JSON.stringify({ version: row.updated_at, analysis: row.analysis, plan });

async function analyzeRemotely(row, input) {
  let response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(110000),
      body: JSON.stringify({ organization: row.organization, description: row.description,
        type: row.requested_type, quantity: row.quantity, context: "", lang: input.lang, inventory: input.inventory }),
    });
  } catch (error) { fail(["AbortError", "TimeoutError"].includes(error?.name) ? "gemini_timeout" : "api_unreachable"); }
  if (!response.headers.get("content-type")?.includes("application/json")) fail("api_not_available");
  const result = await response.json().catch(() => null);
  if (!response.ok) fail(result?.error || "server_error");
  if (!result?.analysis || typeof result.analysis_model !== "string") fail("analysis_invalid");
  return result;
}

// The requested fixed account is a frontend navigation gate, not real authentication.
// Local storage is deliberate: no Supabase Auth, tables, or production writes.
export function createJourney({ storage = globalThis.localStorage, session = globalThis.sessionStorage,
  analyze = analyzeRemotely, now = Date.now, uuid = () => crypto.randomUUID() } = {}) {
  const load = () => {
    let raw;
    try { raw = storage.getItem(dataKey); } catch { fail("local_storage_unavailable"); }
    if (!raw) return { version: 1, requests: [], inventory: initialInventory() };
    let data;
    try { data = JSON.parse(raw); } catch { fail("local_data_invalid"); }
    if (data?.version !== 1 || !Array.isArray(data.requests) ||
        !["devices", "parts", "donors", "rules"].every((key) => Array.isArray(data.inventory?.[key])))
      fail("local_data_invalid");
    return data;
  };
  const save = (data) => {
    try { storage.setItem(dataKey, JSON.stringify(data)); } catch { fail("local_storage_unavailable"); }
  };
  const authorize = () => {
    try { if (session.getItem(sessionKey) === "technician") return; }
    catch { fail("local_storage_unavailable"); }
    fail("technician_login_required");
  };
  const stamp = (row) => new Date(Math.max(now(), (Date.parse(row?.updated_at) || 0) + 1)).toISOString();
  const find = (data, id) => data.requests.find((row) => row.id === id) || fail("request_not_found");
  const plan = (row, stock, strategy) => {
    const value = fulfillmentPlan(row, stock, strategy);
    return { ...value, fingerprint: fingerprint(row, value) };
  };
  const changeStock = (stock, allocations, from, to) => {
    for (const a of allocations) {
      const resources = [stock.devices.find((x) => x.id === a.deviceId),
        ...a.upgrades.map((u) => stock.parts.find((x) => x.id === u.partId))];
      for (const resource of resources) {
        if (!resource || resource[from] < a.count) fail("inventory_changed");
        resource[from] -= a.count;
        resource[to] += a.count;
        resource.updated_at = stamp(resource);
      }
    }
  };
  return async (path, method = "GET", input = {}) => {
    if (path === "/requests" && method === "POST") {
      const organization = clean(input.organization, 120), description = clean(input.description, 2000),
        quantity = Number(input.quantity);
      if (organization.length < 2 || description.length < 10 || !Number.isInteger(quantity) ||
          quantity < 1 || quantity > 100 || !["laptop", "desktop"].includes(input.type)) fail("request_invalid");
      const data = load(), id = uuid(), updated = stamp();
      data.requests.unshift({ id, organization, description, quantity, requested_type: input.type,
        status: "pending", analysis: null, updated_at: updated, created_at: updated });
      save(data);
      return { id, status: "pending" };
    }
    if (path === "/technician/login" && method === "POST") {
      if (clean(input.email, 254).toLowerCase() !== "admin@gmail.com" || input.password !== "1234")
        fail("login_failed");
      try { session.setItem(sessionKey, "technician"); } catch { fail("local_storage_unavailable"); }
      return { authenticated: true };
    }
    if (path === "/technician/logout" && method === "POST") {
      try { session.removeItem(sessionKey); } catch { fail("local_storage_unavailable"); }
      return { ok: true };
    }
    authorize();
    if (path === "/technician/session" && method === "GET") return { authenticated: true };
    const data = load();
    if (path === "/technician/requests" && method === "GET") return { items: data.requests };
    if (path === "/technician/catalog" && method === "GET") {
      let response;
      try {response=await fetch("/api/catalog",{signal:AbortSignal.timeout(30000)});}catch{fail("database_unreachable");}
      const result=await response.json().catch(()=>null);
      if(!response.ok || !Array.isArray(result?.items))fail(result?.error || "catalog_unavailable");
      return result;
    }
    if (path === "/technician/inventory" && method === "GET") return { inventory: data.inventory };
    const match = path.match(/^\/technician\/requests\/([a-f0-9-]{36})\/(fulfillment|analyze|decision|prepare|draft|requirements)$/);
    if (!match) fail("api_not_found");
    const row = find(data, match[1]), action = match[2];
    if (action === "fulfillment" && method === "GET") {
      if (["approved", "completed"].includes(row.status))
        return { plans: [], approvedPlan: row.fulfillment_plan, item: row };
      return { plans: strategies.map((s) => plan(row, data.inventory, s)), item: row, candidates: candidates(row, data.inventory), evaluation: evaluation(row, data.inventory), draft: row.draft_lines ? { ...selectedDraft(row, data.inventory), fingerprint: fingerprint(row, selectedDraft(row, data.inventory)) } : null };
    }
    if (method !== "POST") fail("method_not_allowed");
    if (action === "draft" || action === "requirements") {
      if (row.status !== "pending") fail("request_not_pending");
      if (action === "draft") row.draft_lines = editDraft(row, data.inventory, input);
      else {
        const ram = Number(input.ramGb), storageGb = Number(input.storageGb);
        if (![8,16,32,64].includes(ram) || ![128,256,512,1024,2048].includes(storageGb) ||
            !["basic","standard","performance","specialist"].includes(input.cpuCategory) || clean(input.note,1000).length < 5) fail("requirements_invalid");
        row.analysis = { deviceType: row.requested_type, ramGb: ram, storageGb, cpuCategory: input.cpuCategory,
          usage: "Technician requirements", explanation: clean(input.note,1000), specialized: input.cpuCategory === "specialist", missingInformation: [] };
        if (!["any","Intel","AMD","Apple","Qualcomm"].includes(input.cpuVendor || "any")) fail("requirements_invalid");
        row.analysis.cpuVendor = input.cpuVendor || "any";
        row.analysis_model = "technician";
      }
      row.updated_at = stamp(row); save(data); return { item: row };
    }
    if (action === "prepare") {
      if (row.status !== "approved" || input.expectedVersion !== row.updated_at) fail("request_changed");
      if (!input.preparedConfirmed || clean(input.note, 1000).length < 5) fail("preparation_confirmation_required");
      changeStock(data.inventory, row.fulfillment_plan.allocations, "reserved_count", "issued_count");
      row.status = "completed";
      row.preparation_note = clean(input.note, 1000);
    } else {
      if (row.status !== "pending") fail("request_not_pending");
      if (action === "analyze") {
        const version = row.updated_at;
        const result = await analyze(structuredClone(row), { ...input, context: "", inventory: structuredClone(data.inventory) });
        authorize();
        const current = load(), latest = find(current, row.id);
        if (latest.updated_at !== version || latest.status !== "pending") fail("request_changed");
        Object.assign(latest, result, { updated_at: stamp(latest) });
        save(current);
        return { item: latest };
      }
      if (action !== "decision") fail("method_not_allowed");
      if (input.status === "approved") {
        if (!row.analysis || row.analysis.missingInformation?.length || input.reviewConfirmed !== true)
          fail("technical_review_required");
        if (!strategies.includes(input.strategy) && input.strategy !== "selected") fail("plan_selection_required");
        const selected = input.strategy === "selected" ? selectedDraft(row, data.inventory) : plan(row, data.inventory, input.strategy);
        if (input.strategy === "selected") selected.fingerprint = fingerprint(row, selected);
        if (selected.blocked || !selected.total || selected.total > row.quantity || (selected.remaining && input.partialConfirmed !== true)) fail("plan_incomplete");
        row.partial_approved = selected.remaining > 0;
        if (selected.fingerprint !== input.planFingerprint) fail("inventory_changed");
        row.fulfillment_plan = selected;
        changeStock(data.inventory, selected.allocations, "available_count", "reserved_count");
        row.technical_review_confirmed = true;
      } else {
        if (!["rejected", "modification"].includes(input.status)) fail("decision_invalid");
        if (!clean(input.reason, 1000)) fail("reason_required");
        row.decision_reason = clean(input.reason, 1000);
      }
      row.status = input.status;
    }
    row.updated_at = stamp(row);
    save(data);
    return { item: row };
  };
}
