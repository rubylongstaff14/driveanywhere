/** Quick-call taunts — no voice chat required. */
export const TAUNTS = [
  { id: "push", label: "Push!", key: "1" },
  { id: "nice", label: "Nice!", key: "2" },
  { id: "close", label: "Too close!", key: "3" },
  { id: "gg", label: "GG", key: "4" },
] as const;

export type TauntId = (typeof TAUNTS)[number]["id"];

export function isTauntId(v: string): v is TauntId {
  return TAUNTS.some((t) => t.id === v);
}
