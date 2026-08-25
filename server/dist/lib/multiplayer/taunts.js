/** Quick-call taunts — no voice chat required. */
export const TAUNTS = [
    { id: "push", label: "Push!", key: "1" },
    { id: "nice", label: "Nice!", key: "2" },
    { id: "close", label: "Too close!", key: "3" },
    { id: "gg", label: "GG", key: "4" },
];
export function isTauntId(v) {
    return TAUNTS.some((t) => t.id === v);
}
