import { useQuery } from "@tanstack/react-query";

export interface Landmark {
  pageid: number;
  ns: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
  primary: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  extract?: string;
}

interface WikiResponse {
  query: {
    geosearch: Landmark[];
  };
}

interface WikiPageResponse {
  query: {
    pages: {
      [key: string]: {
        thumbnail?: {
          source: string;
          width: number;
          height: number;
        };
        extract?: string;
      };
    };
  };
}

const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";

export async function fetchLandmarks(lat: number, lon: number, radius: number = 10000): Promise<Landmark[]> {
  // 1. Search for nearby places
  const searchParams = new URLSearchParams({
    action: "query",
    list: "geosearch",
    gscoord: `${lat}|${lon}`,
    gsradius: radius.toString(),
    gslimit: "50",
    format: "json",
    origin: "*",
  });

  const searchRes = await fetch(`${WIKI_API_URL}?${searchParams.toString()}`);
  const searchData: WikiResponse = await searchRes.json();

  if (!searchData.query?.geosearch?.length) {
    return [];
  }

  const landmarks = searchData.query.geosearch;
  const pageIds = landmarks.map((l) => l.pageid).join("|");

  // 2. Fetch details (thumbnail, extract) for these places
  const detailsParams = new URLSearchParams({
    action: "query",
    pageids: pageIds,
    prop: "pageimages|extracts",
    pithumbsize: "500",
    exintro: "true",
    explaintext: "true", // Plain text extract
    exlimit: "max", // Fetch for all given pageids
    format: "json",
    origin: "*",
  });

  const detailsRes = await fetch(`${WIKI_API_URL}?${detailsParams.toString()}`);
  const detailsData: WikiPageResponse = await detailsRes.json();
  const pages = detailsData.query?.pages || {};

  // Merge details back into landmarks
  return landmarks.map((landmark) => {
    const details = pages[landmark.pageid];
    return {
      ...landmark,
      thumbnail: details?.thumbnail,
      extract: details?.extract,
    };
  });
}
