export function formatDistance(metres: number): string {
  if (metres >= 1000) {
    return `${(metres / 1000).toFixed(metres % 1000 === 0 ? 0 : 1)} km`;
  }
  return `${Math.round(metres)} m`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  if (secs === 0) {
    return `${mins} min`;
  }
  return `${mins}m ${secs}s`;
}

export function formatLapTime(ms: number | null): string {
  if (ms === null) {
    return "—";
  }
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
}

export function formatDifficulty(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
