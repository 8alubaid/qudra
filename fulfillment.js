// Shared deterministic planning over supplied inventory records.
const tiers = { basic: 0, standard: 1, performance: 2, specialist: 3 };
export const strategies = [
  "ready_only",
  "spare_upgrade",
  "recovered_upgrade",
  "combined_upgrade",
];
const positive = (n) => Number.isInteger(n) && n > 0;
const evidence = (r) =>
  r.verified === true &&
  typeof r.verification_ref === "string" &&
  r.verification_ref.trim().length > 0;
const same = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  a.trim().length > 0 &&
  a.trim().toLowerCase() === b.trim().toLowerCase();
function eligibleRule(device, rule, stock) {
  const part = stock.parts.find((p) => p.id === rule.part_id),
    donor = stock.donors.find((d) => d.id === part?.donor_id);
  if (
    !part ||
    !evidence(rule) ||
    rule.device_id !== device.id ||
    !["ram", "storage"].includes(rule.component) ||
    part.component !== rule.component ||
    !part.tested ||
    part.condition !== "passed" ||
    !part.verification_ref?.trim() ||
    !positive(part.available_count) ||
    !positive(part.capacity_gb) ||
    !same(part.interface, rule.interface) ||
    !same(part.form_factor, rule.form_factor)
  )
    return null;
  if (
    !["add", "replace"].includes(rule.method) ||
    !positive(rule.resulting_capacity_gb) ||
    !positive(rule.max_capacity_gb) ||
    rule.resulting_capacity_gb > rule.max_capacity_gb
  )
    return null;
  if (rule.method === "add" && !positive(rule.free_slots)) return null;
  if (rule.component === "storage" && part.storage_kind !== "ssd") return null;
  const base =
    rule.component === "ram"
      ? device.ram_gb
      : device.storage_kind === "ssd"
        ? device.storage_gb
        : 0;
  if (
    rule.resulting_capacity_gb !==
    (rule.method === "replace" ? part.capacity_gb : base + part.capacity_gb)
  )
    return null;
  if (
    part.source === "recovered" &&
    (!donor ||
      !evidence(donor) ||
      !["damaged", "dismantled"].includes(donor.condition))
  )
    return null;
  if (!["spare", "recovered"].includes(part.source)) return null;
  return { rule, part, donor };
}
export function fulfillmentPlan(request, stock, strategy = "ready_only") {
  if (!strategies.includes(strategy)) throw new Error("strategy_invalid");
  const a = request.analysis,
    quantity = request.quantity;
  if (
    !a ||
    a.deviceType !== request.requested_type ||
    !positive(quantity) ||
    !positive(a.ramGb) ||
    !positive(a.storageGb) ||
    tiers[a.cpuCategory] === undefined
  )
    return {
      strategy,
      quantity,
      total: 0,
      remaining: quantity,
      allocations: [],
      exclusions: [],
      blocked: "analysis_required",
    };
  if (a.missingInformation?.length)
    return {
      strategy,
      quantity,
      total: 0,
      remaining: quantity,
      allocations: [],
      exclusions: [],
      blocked: "missing_information",
    };
  const pools = new Map(stock.parts.map((p) => [p.id, p.available_count])),
    devices = new Map(stock.devices.map((d) => [d.id, d.available_count])),
    candidates = [],
    exclusions = [];
  for (const d of stock.devices) {
    let reason;
    if (d.device_type !== request.requested_type) reason = "wrong_type";
    else if (a.cpuVendor && a.cpuVendor !== "any" && String(d.cpu_vendor || "").toLowerCase() !== a.cpuVendor.toLowerCase())
      reason = "cpu_vendor_mismatch";
    else if (!evidence(d) || !["ready", "upgradeable"].includes(d.condition))
      reason = "unverified_device";
    else if (!positive(d.available_count)) reason = "out_of_stock";
    else if (
      tiers[d.cpu_category] === undefined ||
      tiers[d.cpu_category] < tiers[a.cpuCategory]
    )
      reason = "cpu_below_requirement";
    else if (a.specialized && !d.specialist_verified)
      reason = "specialist_unverified";
    else if (!positive(d.ram_gb) || !positive(d.storage_gb))
      reason = "unknown_specifications";
    if (reason) {
      exclusions.push({ deviceId: d.id, model: d.model, reason });
      continue;
    }
    const rules = stock.rules
      .filter((r) => r.device_id === d.id)
      .map((r) => eligibleRule(d, r, stock))
      .filter(Boolean);
    const options = (component) => {
      const sufficient =
        component === "ram"
          ? d.ram_gb >= a.ramGb
          : d.storage_kind === "ssd" && d.storage_gb >= a.storageGb;
      return sufficient
        ? [null]
        : rules.filter((x) => x.rule.component === component);
    };
    let found = false;
    for (const ram of options("ram"))
      for (const storage of options("storage")) {
        const upgrades = [ram, storage].filter(Boolean);
        const resultingRam = ram?.rule.resulting_capacity_gb ?? d.ram_gb,
          resultingStorage =
            storage?.rule.resulting_capacity_gb ?? d.storage_gb;
        if (
          resultingRam < a.ramGb ||
          resultingStorage < a.storageGb ||
          (!storage && d.storage_kind !== "ssd")
        )
          continue;
        if (strategy === "ready_only" && upgrades.length) continue;
        if (
          strategy === "spare_upgrade" &&
          upgrades.some((x) => x.part.source !== "spare")
        )
          continue;
        if (
          strategy === "recovered_upgrade" &&
          upgrades.some((x) => x.part.source !== "recovered")
        )
          continue;
        const sources = new Set(upgrades.map((x) => x.part.source));
        const category = upgrades.length
          ? sources.size > 1
            ? "mixed"
            : sources.has("recovered")
              ? "recovered"
              : "spare"
          : d.ram_gb === a.ramGb &&
              d.storage_gb === a.storageGb &&
              tiers[d.cpu_category] === tiers[a.cpuCategory]
            ? "exact"
            : "higher";
        const rank = { exact: 0, spare: 1, recovered: 2, mixed: 3, higher: 4 }[
          category
        ];
        const excess =
          (tiers[d.cpu_category] - tiers[a.cpuCategory]) * 10000 +
          (resultingRam - a.ramGb) * 100 +
          (resultingStorage - a.storageGb) / 128;
        candidates.push({
          device: d,
          category,
          resultingRam,
          resultingStorage,
          upgrades,
          rank,
          excess,
        });
        found = true;
      }
    if (!found)
      exclusions.push({
        deviceId: d.id,
        model: d.model,
        reason:
          strategy === "ready_only" ? "needs_upgrade" : "no_verified_upgrade",
      });
  }
  candidates.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.excess - b.excess ||
      a.upgrades.length - b.upgrades.length ||
      Number(b.device.catalog_id === request.preferred_catalog_id) -
        Number(a.device.catalog_id === request.preferred_catalog_id) ||
      a.device.id.localeCompare(b.device.id) ||
      JSON.stringify(a.upgrades.map((x) => x.rule.id)).localeCompare(
        JSON.stringify(b.upgrades.map((x) => x.rule.id)),
      ),
  );
  let remaining = quantity;
  const allocations = [];
  for (const c of candidates) {
    const count = Math.min(
      remaining,
      devices.get(c.device.id),
      ...c.upgrades.map((x) => pools.get(x.part.id)),
    );
    if (!positive(count)) continue;
    const d = c.device;
    allocations.push({
      deviceId: d.id,
      model: d.model,
      catalogId: d.catalog_id,
      deviceVersion: d.updated_at,
      count,
      category: c.category,
      cpuCategory: d.cpu_category,
      ramBefore: d.ram_gb,
      ramAfter: c.resultingRam,
      storageBefore: d.storage_gb,
      storageAfter: c.resultingStorage,
      verificationRef: d.verification_ref,
      upgrades: c.upgrades.map(({ rule: r, part: p, donor }) => ({
        ruleId: r.id,
        ruleVersion: r.updated_at,
        partId: p.id,
        partVersion: p.updated_at,
        component: r.component,
        source: p.source,
        capacityGb: p.capacity_gb,
        method: r.method,
        interface: p.interface,
        formFactor: p.form_factor,
        verificationRef: r.verification_ref,
        partVerificationRef: p.verification_ref,
        donorId: donor?.id || null,
        donorVersion: donor?.updated_at || null,
        donorModel: donor?.model || null,
        donorVerificationRef: donor?.verification_ref || null,
      })),
    });
    devices.set(d.id, devices.get(d.id) - count);
    for (const x of c.upgrades)
      pools.set(x.part.id, pools.get(x.part.id) - count);
    remaining -= count;
  }
  return {
    strategy,
    quantity,
    total: quantity - remaining,
    remaining,
    allocations,
    exclusions,
    blocked: null,
  };
}
