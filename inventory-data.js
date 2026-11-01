// Illustrative project inventory for the frontend journey, not production stock.
// Quantities, model configurations and inspection references are sample data.
export function initialInventory() {
  const version = { updated_at: "2026-01-01T00:00:00Z" };
  const verified = { ...version, verified: true, verification_ref: "INS-2026-001" };
  const device = {
    ...verified, device_type: "laptop", cpu_category: "standard", cpu_vendor: "Intel",
    ram_gb: 8, storage_gb: 256, storage_kind: "ssd", condition: "ready",
    specialist_verified: false, reserved_count: 0, issued_count: 0,
  };
  const part = {
    ...version, component: "ram", capacity_gb: 4, interface: "DDR4",
    form_factor: "SODIMM", condition: "passed", tested: true,
    verification_ref: "MEM-2026-004", reserved_count: 0, issued_count: 0,
  };
  const rule = {
    ...verified, component: "ram", method: "add", interface: "DDR4",
    form_factor: "SODIMM", free_slots: 1, resulting_capacity_gb: 8,
    max_capacity_gb: 32,
  };
  return {
    devices: [
      { ...device, id: "LP-101", model: "Dell Latitude 5490", available_count: 14 },
      { ...device, id: "LP-102", model: "Lenovo ThinkPad T480", ram_gb: 4, condition: "upgradeable", available_count: 4 },
      { ...device, id: "LP-103", model: "HP ProBook 440 G5", ram_gb: 4, condition: "upgradeable", available_count: 2 },
      { ...device, id: "LP-104", model: "Dell Latitude 5420", cpu_category: "performance", ram_gb: 16, storage_gb: 512, available_count: 6 },
      { ...device, id: "LP-105", model: "Laptop — fixed memory", ram_gb: 4, available_count: 3 },
      { ...device, id: "LP-106", model: "Damaged laptop — inspection pending", condition: "damaged", available_count: 2 },
      { ...device, id: "PC-101", model: "Dell OptiPlex 7060", device_type: "desktop", available_count: 10 },
      { ...device, id: "PC-102", model: "HP EliteDesk 800 G4", device_type: "desktop", cpu_category: "performance", ram_gb: 16, storage_gb: 512, available_count: 5 },
    ],
    parts: [
      { ...part, id: "RAM-S01", source: "spare", donor_id: null, available_count: 4 },
      { ...part, id: "RAM-R01", source: "recovered", donor_id: "DN-001", available_count: 2 },
    ],
    donors: [
      { ...verified, id: "DN-001", model: "HP ProBook — damaged display", condition: "damaged" },
      { ...version, id: "DN-002", model: "Laptop — awaiting component inspection", condition: "quarantined", verified: false, verification_ref: "" },
    ],
    rules: [
      { ...rule, id: "RULE-01", device_id: "LP-102", part_id: "RAM-S01" },
      { ...rule, id: "RULE-02", device_id: "LP-103", part_id: "RAM-R01" },
    ],
  };
}
