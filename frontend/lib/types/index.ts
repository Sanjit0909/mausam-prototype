// Types mirror the backend's Pydantic schemas (backend/app/models/*.py) so the frontend
// never needs to guess the shape of API responses.

export interface LocationInfo {
  name: string;
  country?: string | null;
  admin1?: string | null;
  lat: number;
  lon: number;
  timezone?: string | null;
}

export interface LocationSearchResult {
  name: string;
  country?: string | null;
  admin1?: string | null;
  lat: number;
  lon: number;
  timezone?: string | null;
  population?: number | null;
}

export type ConditionGroup = "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export interface CurrentWeather {
  temperature: number;
  feels_like: number;
  condition: string;
  condition_code: number;
  condition_group: ConditionGroup;
  is_day: boolean;
  humidity: number;
  wind_speed: number;
  wind_direction: number;
  pressure: number;
  precipitation: number;
  uv_index?: number | null;
  visibility?: number | null;
  observed_at: string;
}

export interface WeatherResponse {
  location: LocationInfo;
  current: CurrentWeather;
  source: string;
  is_demo: boolean;
}

export interface HourlyPoint {
  time: string;
  temperature: number;
  precipitation_probability?: number | null;
  condition_code: number;
  condition_group: ConditionGroup;
  wind_speed?: number | null;
  uv_index?: number | null;
  visibility?: number | null;
}

export interface DailyPoint {
  date: string;
  temp_max: number;
  temp_min: number;
  precipitation_probability_max?: number | null;
  condition_code: number;
  condition_group: ConditionGroup;
  sunrise?: string | null;
  sunset?: string | null;
  uv_index_max?: number | null;
}

export interface ForecastResponse {
  location: LocationInfo;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  source: string;
  is_demo: boolean;
}

export interface AirQualityResponse {
  location: LocationInfo;
  us_aqi?: number | null;
  european_aqi?: number | null;
  category: string;
  pm2_5?: number | null;
  pm10?: number | null;
  ozone?: number | null;
  nitrogen_dioxide?: number | null;
  sulphur_dioxide?: number | null;
  carbon_monoxide?: number | null;
  source: string;
}

export interface MarineConditions {
  wave_height?: number | null;
  wave_direction?: number | null;
  wave_period?: number | null;
  swell_wave_height?: number | null;
  swell_wave_direction?: number | null;
  swell_wave_period?: number | null;
}

export interface TideEvent {
  type: "high" | "low";
  time: string;
  height?: number | null;
}

export interface MarineResponse {
  location: LocationInfo;
  available: boolean;
  current?: MarineConditions | null;
  tides: TideEvent[];
  is_demo_tide: boolean;
  source: string;
}

export interface AstronomyResponse {
  location: LocationInfo;
  date: string;
  sunrise?: string | null;
  sunset?: string | null;
  moonrise?: string | null;
  moonset?: string | null;
  moon_phase: string;
  moon_illumination: number;
  is_moon_approx: boolean;
  source: string;
}

export interface HistoricalPoint {
  date: string;
  temp_max?: number | null;
  temp_min?: number | null;
  precipitation?: number | null;
}

export interface HistoricalResponse {
  location: LocationInfo;
  data: HistoricalPoint[];
  source: string;
}

export type AlertSeverity = "minor" | "moderate" | "severe" | "extreme";

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  alert_type: string;
  source: "official" | "derived";
  issued_at: string;
}

export interface AlertsResponse {
  location_name: string;
  alerts: WeatherAlert[];
}

export type InterestKey =
  | "health"
  | "outdoor_fitness"
  | "travel"
  | "family"
  | "agriculture"
  | "commuting"
  | "marine_beach"
  | "events";

export interface PersonalizedInsight {
  message: string;
  icon: string;
  priority: number;
}

export interface RecommendationCard {
  interest: string;
  title: string;
  description: string;
  icon: string;
}

export interface InsightsResponse {
  card_order: string[];
  insights: PersonalizedInsight[];
  recommendations: RecommendationCard[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  lat: number;
  lon: number;
  location_name?: string | null;
  interests: string[];
  units?: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  source: "gemini" | "fallback";
}

export interface ApiErrorPayload {
  error: true;
  message: string;
  source?: string | null;
}

export interface UserPreferences {
  name: string;
  interests: InterestKey[];
  preferred_location: LocationInfo | null;
  notification_prefs: {
    alerts: boolean;
    daily_summary: boolean;
  };
  units: "metric" | "imperial";
}
