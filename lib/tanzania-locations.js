import hierarchy from "../data/tanzania-location-hierarchy.json";

// Generated from HDX COD Tanzania gazetteer:
// https://data.humdata.org/dataset/cod-ab-tza (resource: tza_admgz_20181019.xlsx)
const regions = Array.isArray(hierarchy) ? hierarchy : [];

const normalizedMap = new Map();

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD");
}

for (const region of regions) {
  const regionName = String(region?.name || "").trim();
  if (!regionName) continue;

  const districtMap = new Map();

  for (const district of Array.isArray(region?.districts) ? region.districts : []) {
    const districtName = String(district?.name || "").trim();
    if (!districtName) continue;

    const wards = new Set();

    for (const ward of Array.isArray(district?.wards) ? district.wards : []) {
      const wardName = String(ward || "").trim();
      if (!wardName) continue;
      wards.add(normalizeName(wardName));
    }

    districtMap.set(normalizeName(districtName), wards);
  }

  normalizedMap.set(normalizeName(regionName), districtMap);
}

export function getTanzaniaLocationHierarchy() {
  return regions;
}

export function isValidTanzaniaLocationSelection(region, district, ward) {
  const regionKey = normalizeName(region);
  const districtKey = normalizeName(district);
  const wardKey = normalizeName(ward);

  if (!regionKey || !districtKey || !wardKey) {
    return false;
  }

  const districtMap = normalizedMap.get(regionKey);
  if (!districtMap) {
    return false;
  }

  const wardSet = districtMap.get(districtKey);
  if (!wardSet) {
    return false;
  }

  return wardSet.has(wardKey);
}
