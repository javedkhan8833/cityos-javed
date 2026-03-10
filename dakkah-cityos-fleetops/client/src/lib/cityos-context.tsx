export interface CityOSContextValue {
  country: string;
  city: string;
  tenant: string;
  channel: string;
}

export function getCityOSHeaders(): Record<string, string> {
  return {};
}
