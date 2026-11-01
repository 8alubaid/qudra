// Catalog records are not inventory. Unknown quantities and compatibility remain
// unknown; this helper never invents donor parts or CPU equivalence.
export function catalogCandidates(request, items) {
  const a = request.analysis;
  if (!a) return [];
  return items
    .filter(
      (item) =>
        item.type === request.requested_type &&
        item.availability !== 0 &&
        item.storageKind !== "hdd" &&
        item.ram !== null &&
        item.storage !== null &&
        item.ram >= a.ramGb &&
        item.storage >= a.storageGb,
    )
    .sort((x, y) => {
      const fit = (item) =>
        (item.id === request.preferred_catalog_id ? -10000 : 0) +
        (item.ram - a.ramGb) * 10 +
        (item.storage - a.storageGb) / 128;
      return fit(x) - fit(y) || x.model.localeCompare(y.model);
    });
}
