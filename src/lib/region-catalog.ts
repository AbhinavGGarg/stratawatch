import { latLngToCell } from "h3-js";
import type { RegionSeed } from "@/lib/types";

const rawRegions: Array<{ id: string; name: string; center: [number, number] }> = [
  { id: "suez_corridor", name: "Suez Corridor", center: [32.5, 30.0] },
  { id: "east_med", name: "Eastern Mediterranean", center: [34.5, 34.0] },
  { id: "gulf_aden", name: "Gulf of Aden", center: [47.5, 12.0] },
  { id: "persian_gulf", name: "Persian Gulf", center: [52.5, 26.5] },
  { id: "arabian_sea", name: "Arabian Sea", center: [64.0, 17.0] },
  { id: "bay_bengal", name: "Bay of Bengal", center: [89.0, 15.0] },
  { id: "strait_malacca", name: "Strait of Malacca", center: [102.5, 3.0] },
  { id: "south_china_sea", name: "South China Sea", center: [113.0, 12.5] },
  { id: "east_china_sea", name: "East China Sea", center: [124.5, 29.0] },
  { id: "sea_japan", name: "Sea of Japan", center: [136.0, 38.0] },
  { id: "korea_industrial", name: "Korea Industrial Belt", center: [128.0, 36.0] },
  { id: "tokyo_bay", name: "Tokyo Bay", center: [140.0, 35.5] },
  { id: "north_sea", name: "North Sea", center: [3.5, 56.0] },
  { id: "baltic_gateway", name: "Baltic Gateway", center: [19.0, 57.0] },
  { id: "black_sea", name: "Black Sea", center: [35.0, 43.0] },
  { id: "central_europe_grid", name: "Central Europe Grid", center: [10.0, 50.0] },
  { id: "uk_logistics", name: "UK Logistics Belt", center: [-1.0, 53.0] },
  { id: "us_gulf", name: "US Gulf Coast", center: [-90.0, 28.5] },
  { id: "panama_canal", name: "Panama Canal", center: [-79.7, 9.2] },
  { id: "caribbean_hub", name: "Caribbean Hub", center: [-72.0, 18.0] },
  { id: "west_coast_us", name: "US West Coast", center: [-122.0, 37.0] },
  { id: "north_atlantic", name: "North Atlantic Lanes", center: [-35.0, 44.0] },
  { id: "brazil_coast", name: "Brazilian Coast", center: [-43.0, -22.0] },
  { id: "west_africa_ports", name: "West African Ports", center: [-4.0, 6.0] },
  { id: "cape_good_hope", name: "Cape of Good Hope", center: [18.5, -34.5] },
  { id: "east_africa", name: "East African Corridor", center: [40.0, -3.0] },
  { id: "india_power", name: "India Power Belt", center: [78.0, 22.0] },
  { id: "indo_archipelago", name: "Indonesian Archipelago", center: [118.0, -2.0] },
  { id: "australia_east", name: "Australia East Hub", center: [151.0, -33.0] },
  { id: "andean_fiber", name: "Andean Fiber Route", center: [-77.0, -12.0] },
];

const H3_RESOLUTION = 3;

const toRadians = (value: number): number => (value * Math.PI) / 180;

const haversineDistance = (a: [number, number], b: [number, number]): number => {
  const [lngA, latA] = a;
  const [lngB, latB] = b;
  const earthRadiusKm = 6371;
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);
  const lat1 = toRadians(latA);
  const lat2 = toRadians(latB);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
};

const withHex = rawRegions.map((region) => ({
  ...region,
  hexId: latLngToCell(region.center[1], region.center[0], H3_RESOLUTION),
}));

export const REGION_CATALOG: RegionSeed[] = withHex.map((region) => {
  const nearestNeighbors = withHex
    .filter((candidate) => candidate.id !== region.id)
    .map((candidate) => ({
      id: candidate.id,
      distance: haversineDistance(region.center, candidate.center),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 4)
    .map((candidate) => candidate.id);

  return {
    id: region.id,
    name: region.name,
    center: region.center,
    hexId: region.hexId,
    neighbors: nearestNeighbors,
  };
});

export const REGION_LOOKUP = new Map(REGION_CATALOG.map((region) => [region.id, region]));
