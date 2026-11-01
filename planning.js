import { fulfillmentPlan, strategies } from "./fulfillment.js";
export const lineKey = (a) => a.deviceId + "|" + a.upgrades.map((u) => u.ruleId).sort().join(",");
export function candidates(row, stock) {
  const found = new Map();
  for (const device of stock.devices) for (const strategy of strategies) {
    const result = fulfillmentPlan({ ...row, quantity: 1000 }, { ...stock, devices: [device] }, strategy);
    for (const a of result.allocations) found.set(lineKey(a), { ...a, key: lineKey(a) });
  }
  return [...found.values()];
}
export function selectedDraft(row, stock) {
  const available = candidates(row, stock), warnings = [];
  const devices = new Map(), parts = new Map();
  const allocations = (row.draft_lines || []).map((line) => {
    const candidate = available.find((x) => x.key === line.key);
    if (!candidate || !Number.isInteger(line.count) || line.count < 1) {
      warnings.push("plan_invalid"); return null;
    }
    devices.set(candidate.deviceId, (devices.get(candidate.deviceId) || 0) + line.count);
    for (const u of candidate.upgrades) parts.set(u.partId, (parts.get(u.partId) || 0) + line.count);
    return { ...candidate, count: line.count };
  }).filter(Boolean);
  for (const [id, count] of devices) if (count > stock.devices.find((x) => x.id === id)?.available_count) warnings.push("inventory_changed");
  for (const [id, count] of parts) if (count > stock.parts.find((x) => x.id === id)?.available_count) warnings.push("inventory_changed");
  const total = (row.draft_lines || []).reduce((n, a) => n + (Number.isInteger(a.count) ? a.count : 0), 0);
  if (total > row.quantity) warnings.push("plan_over_quantity");
  return { strategy: "selected", quantity: row.quantity, total, remaining: Math.max(0, row.quantity - total),
    allocations, exclusions: [], blocked: warnings[0] || (row.analysis?.missingInformation?.length ? "missing_information" : null), warnings };
}
export function editDraft(row, stock, input) {
  const lines = structuredClone(row.draft_lines || []);
  if (input.action === "clear") return [];
  if (input.action === "remove") return lines.filter((x) => x.key !== input.key);
  const add = (key, requested, replace = false) => {
    if (!Number.isInteger(requested) || requested < 0) throw new Error("plan_quantity_invalid");
    const before = lines.find((x) => x.key === key);
    const target = requested + (!replace ? before?.count || 0 : 0);
    const rest = lines.filter((x) => x.key !== key);
    const option = candidates(row, stock).find((x) => x.key === key);
    if (!option) throw new Error("plan_invalid");
    const used = selectedDraft({ ...row, draft_lines: rest }, stock);
    const deviceUsed = used.allocations.filter((x) => x.deviceId === option.deviceId).reduce((n, x) => n + x.count, 0);
    let cap = Math.min(row.quantity - used.total, stock.devices.find((x) => x.id === option.deviceId).available_count - deviceUsed);
    for (const u of option.upgrades) {
      const consumed = used.allocations.reduce((n, a) => n + a.count * a.upgrades.filter((p) => p.partId === u.partId).length, 0);
      cap = Math.min(cap, stock.parts.find((p) => p.id === u.partId).available_count - consumed);
    }
    if (target > cap) throw new Error("plan_selection_conflict");
    if (before) lines.splice(lines.indexOf(before), 1);
    if (target) lines.push({ key, count: target });
  };
  if (input.action === "add" || input.action === "quantity") add(input.key, Number(input.count), input.action === "quantity");
  else if (input.action === "apply") {
    const proposal = fulfillmentPlan(row, stock, input.strategy);
    if (proposal.blocked) throw new Error("technical_review_required");
    // Preserve manual choices; an overlapping proposal fails atomically.
    for (const a of proposal.allocations) add(lineKey(a), a.count);
  } else throw new Error("plan_invalid");
  return lines;
}
export function evaluation(row, stock) {
  const band = { ...stock, devices: stock.devices.filter((d) => d.ram_gb <= Math.max(2 * (row.analysis?.ramGb || 0), (row.analysis?.ramGb || 0) + 8) && d.storage_gb <= Math.max(2 * (row.analysis?.storageGb || 0), (row.analysis?.storageGb || 0) + 256)) };
  const direct = fulfillmentPlan(row, band, "ready_only");
  return { direct: direct.remaining === 0 && !direct.blocked, ready: direct.total, remaining: direct.remaining };
}
