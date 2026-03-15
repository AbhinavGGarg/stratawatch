import { findNearestRegion, REGION_LOOKUP } from "@/lib/region-catalog";
import type { Signal, SignalType } from "@/lib/types";

const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, value));

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const asString = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const toIso = (value: unknown): string => {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return new Date().toISOString();
};

const decodeXmlEntities = (value: string): string =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");

const stripCdata = (value: string): string => value.replaceAll("<![CDATA[", "").replaceAll("]]>", "");

interface ParsedRssItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

const readTag = (input: string, tag: string): string => {
  const match = input.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? decodeXmlEntities(stripCdata(match[1].trim())) : "";
};

const parseRssItems = (xmlPayload: string): ParsedRssItem[] => {
  const itemMatches = [...xmlPayload.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

  return itemMatches
    .map((match) => {
      const block = match[1] ?? "";
      return {
        title: readTag(block, "title"),
        link: readTag(block, "link"),
        pubDate: readTag(block, "pubDate"),
        source: readTag(block, "source") || "Google News",
      };
    })
    .filter((item) => item.title.length > 0 && item.link.length > 0);
};

const mapEonetCategoryToType = (category: string): SignalType => {
  const normalized = category.toLowerCase();

  if (
    normalized.includes("storm") ||
    normalized.includes("flood") ||
    normalized.includes("wildfire") ||
    normalized.includes("drought")
  ) {
    return "extreme_weather";
  }

  if (normalized.includes("volcano") || normalized.includes("landslide") || normalized.includes("earthquake")) {
    return "infrastructure_disruption";
  }

  return "news_sentiment_spike";
};

const mapEonetSeverity = (category: string): number => {
  const normalized = category.toLowerCase();

  if (normalized.includes("volcano") || normalized.includes("earthquake")) return 0.84;
  if (normalized.includes("storm") || normalized.includes("flood")) return 0.76;
  if (normalized.includes("wildfire")) return 0.68;
  return 0.58;
};

const toLocation = (coordinates: unknown): [number, number] | null => {
  const values = asArray<unknown>(coordinates);
  if (values.length < 2) {
    return null;
  }

  const lng = asNumber(values[0], Number.NaN);
  const lat = asNumber(values[1], Number.NaN);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  return [lng, lat];
};

const weatherSeverity = (windGust: number, precipitation: number): number => {
  const gustFactor = clamp(windGust / 95);
  const rainFactor = clamp(precipitation / 18);
  return clamp(gustFactor * 0.7 + rainFactor * 0.3);
};

const fetchJson = async (url: string): Promise<unknown | null> => {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

export const fetchUsgsSignals = async (): Promise<Signal[]> => {
  const payload = await fetchJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson");
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const features = asArray<Record<string, unknown>>((payload as { features?: unknown }).features);

  return features.flatMap((feature) => {
    const properties = (feature.properties ?? {}) as Record<string, unknown>;
    const geometry = (feature.geometry ?? {}) as Record<string, unknown>;
    const location = toLocation(geometry.coordinates);

    if (!location) {
      return [];
    }

    const magnitude = asNumber(properties.mag, 1);
    const region = findNearestRegion(location);
    const severity = clamp(magnitude / 8.5);

    return [
      {
        id: `usgs-${asString(feature.id, Math.random().toString(16).slice(2, 10))}`,
        type: "infrastructure_disruption" as const,
        source: "usgs" as const,
        severity,
        timestamp: toIso(properties.time),
        location,
        regionId: region.id,
        details: `M${magnitude.toFixed(1)} ${asString(properties.place, "earthquake event")}`,
      },
    ];
  });
};

export const fetchEonetSignals = async (): Promise<Signal[]> => {
  const payload = await fetchJson("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50");
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const events = asArray<Record<string, unknown>>((payload as { events?: unknown }).events);

  return events.flatMap((event) => {
    const categories = asArray<Record<string, unknown>>(event.categories);
    const geometryList = asArray<Record<string, unknown>>(event.geometry);
    const latestGeometry = geometryList[geometryList.length - 1];

    if (!latestGeometry) {
      return [];
    }

    const location = toLocation(latestGeometry.coordinates);
    if (!location) {
      return [];
    }

    const categoryTitle = asString(categories[0]?.title, "Natural Event");
    const type = mapEonetCategoryToType(categoryTitle);
    const severity = mapEonetSeverity(categoryTitle);
    const region = findNearestRegion(location);
    const title = asString(event.title, "EONET Event");

    return [
      {
        id: `eonet-${asString(event.id, Math.random().toString(16).slice(2, 10))}`,
        type,
        source: "eonet" as const,
        severity,
        timestamp: toIso(latestGeometry.date),
        location,
        regionId: region.id,
        details: `${categoryTitle}: ${title}`,
      },
    ];
  });
};

export const fetchOpenMeteoSignals = async (): Promise<Signal[]> => {
  const monitoredRegions = [
    { id: "suez_corridor", center: [32.5, 30.0] as [number, number] },
    { id: "gulf_aden", center: [47.5, 12.0] as [number, number] },
    { id: "persian_gulf", center: [52.5, 26.5] as [number, number] },
    { id: "strait_malacca", center: [102.5, 3.0] as [number, number] },
    { id: "south_china_sea", center: [113.0, 12.5] as [number, number] },
    { id: "north_sea", center: [3.5, 56.0] as [number, number] },
    { id: "us_gulf", center: [-90.0, 28.5] as [number, number] },
    { id: "panama_canal", center: [-79.7, 9.2] as [number, number] },
    { id: "north_atlantic", center: [-35.0, 44.0] as [number, number] },
    { id: "cape_good_hope", center: [18.5, -34.5] as [number, number] },
  ];

  const params = new URLSearchParams();
  for (const region of monitoredRegions) {
    params.append("latitude", String(region.center[1]));
    params.append("longitude", String(region.center[0]));
  }

  params.set("current", "wind_speed_10m,wind_gusts_10m,precipitation");
  params.set("timezone", "UTC");

  const payload = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  const entries = asArray<Record<string, unknown>>(payload);

  if (entries.length === 0) {
    return [];
  }

  return entries.flatMap((entry, index) => {
    const region = monitoredRegions[index];
    if (!region) {
      return [];
    }

    const current = (entry.current ?? {}) as Record<string, unknown>;
    const gusts = asNumber(current.wind_gusts_10m, 0);
    const wind = asNumber(current.wind_speed_10m, 0);
    const precipitation = asNumber(current.precipitation, 0);

    // Focus on genuinely abnormal weather that can impact logistics/ports.
    if (gusts < 52 && precipitation < 6 && wind < 35) {
      return [];
    }

    const severity = weatherSeverity(gusts, precipitation);
    const type: SignalType = gusts > 64 ? "shipping_congestion" : "extreme_weather";

    return [
      {
        id: `meteo-${region.id}-${asString(current.time, new Date().toISOString())}`,
        type,
        source: "open_meteo" as const,
        severity,
        timestamp: toIso(current.time),
        location: region.center,
        regionId: region.id,
        details: `wind gust ${Math.round(gusts)} km/h, precipitation ${precipitation.toFixed(1)} mm`,
      },
    ];
  });
};

const conflictFeeds = [
  "https://news.google.com/rss/search?q=Iran+OR+Israel+OR+Gaza+OR+Lebanon+missile+OR+strike+when:1d&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=Ukraine+OR+Russia+drone+attack+OR+shelling+when:1d&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=Yemen+OR+Red+Sea+Houthi+attack+when:1d&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=Sudan+conflict+OR+clashes+when:1d&hl=en-US&gl=US&ceid=US:en",
];

const conflictRegionHints: Array<{ regionId: string; pattern: RegExp }> = [
  { regionId: "persian_gulf", pattern: /\biran\b|\btehran\b|\bhormuz\b/i },
  { regionId: "east_med", pattern: /\bisrael\b|\bgaza\b|\blebanon\b|\bsyria\b|\bwest bank\b/i },
  { regionId: "black_sea", pattern: /\bukraine\b|\brussia\b|\bcrimea\b|\bblack sea\b/i },
  { regionId: "gulf_aden", pattern: /\byemen\b|\bred sea\b|\bhouthi\b|\baden\b/i },
  { regionId: "east_africa", pattern: /\bsudan\b|\bkhartoum\b|\bdarfur\b/i },
];

const lowRelevancePattern =
  /\bfootball\b|\bsoccer\b|\bbasketball\b|\bnba\b|\bnfl\b|\bcricket\b|\bmatch\b|\bcup\b/i;

const inferConflictRegion = (title: string): string => {
  for (const hint of conflictRegionHints) {
    if (hint.pattern.test(title)) {
      return hint.regionId;
    }
  }

  // Global spillover default for unmatched conflict headlines.
  return "east_med";
};

const conflictSeverity = (headline: string): number => {
  const text = headline.toLowerCase();
  const high = /\bmissile\b|\bairstrike\b|\bbombardment\b|\binvasion\b|\bmass casualty\b/.test(text);
  const elevated = /\battack\b|\bdrone\b|\bclash\b|\bshelling\b|\bwar\b|\bconflict\b/.test(text);

  if (high) return 0.88;
  if (elevated) return 0.76;
  return 0.66;
};

const jitterAround = (location: [number, number], range = 1.8): [number, number] => {
  const lng = clamp(location[0] + (Math.random() * 2 - 1) * range, -179.8, 179.8);
  const lat = clamp(location[1] + (Math.random() * 2 - 1) * (range * 0.65), -84, 84);
  return [lng, lat];
};

const stableId = (input: string): string => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

export const fetchConflictSignals = async (): Promise<Signal[]> => {
  const responses = await Promise.all(
    conflictFeeds.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return "";
        return await response.text();
      } catch {
        return "";
      }
    }),
  );

  const seenLinks = new Set<string>();
  const signals: Signal[] = [];

  for (const feedXml of responses) {
    if (!feedXml) {
      continue;
    }

    const items = parseRssItems(feedXml);
    for (const item of items) {
      if (signals.length >= 24) {
        break;
      }

      if (seenLinks.has(item.link) || lowRelevancePattern.test(item.title)) {
        continue;
      }

      seenLinks.add(item.link);
      const regionId = inferConflictRegion(item.title);
      const region = REGION_LOOKUP.get(regionId);
      if (!region) {
        continue;
      }

      const severity = conflictSeverity(item.title);

      signals.push({
        id: `news-${stableId(item.link)}`,
        type: "news_sentiment_spike",
        source: "google_news",
        severity,
        timestamp: toIso(item.pubDate || new Date().toISOString()),
        location: jitterAround(region.center, 2.2),
        regionId: region.id,
        details: `${item.title} (${item.source})`,
      });
    }
  }

  return signals;
};

export const fetchLiveSignals = async (): Promise<Signal[]> => {
  const [usgs, eonet, meteo, conflict] = await Promise.all([
    fetchUsgsSignals(),
    fetchEonetSignals(),
    fetchOpenMeteoSignals(),
    fetchConflictSignals(),
  ]);

  return [...usgs, ...eonet, ...meteo, ...conflict]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 60);
};
