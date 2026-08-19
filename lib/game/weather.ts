export type WeatherId = "clear" | "dusk" | "night" | "rain";

export const WEATHER_OPTIONS: {
  id: WeatherId;
  label: string;
  hint: string;
}[] = [
  { id: "clear", label: "Clear", hint: "Dry track, full grip." },
  { id: "dusk", label: "Dusk", hint: "Low sun, same grip." },
  { id: "night", label: "Night", hint: "Dark streets, slightly less grip." },
  { id: "rain", label: "Rain", hint: "Wet tyres — lift earlier." },
];

export function parseWeather(value?: string | null): WeatherId {
  if (value === "dusk" || value === "night" || value === "rain") return value;
  return "clear";
}

/** Extra grip multiplier on top of the car's own tyres. */
export function weatherGripMul(weather: WeatherId): number {
  if (weather === "rain") return 0.78;
  if (weather === "night") return 0.94;
  return 1;
}
