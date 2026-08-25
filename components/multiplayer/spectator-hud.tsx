"use client";

import { useRouter } from "next/navigation";
import { useMultiplayerStore } from "@/stores/multiplayer-store";

/** Banner + controls while watching a live race as a late joiner. */
export function SpectatorHud() {
  const router = useRouter();
  const spectating = useMultiplayerStore((s) => s.spectating);
  const racing = useMultiplayerStore((s) => s.racing);
  const currentRoom = useMultiplayerStore((s) => s.currentRoom);
  const joinNextRace = useMultiplayerStore((s) => s.joinNextRace);
  const leaveRoom = useMultiplayerStore((s) => s.leaveRoom);

  if (!spectating) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-lg flex-col items-center gap-2 rounded-2xl border border-sky-400/25 bg-black/70 px-5 py-3 text-center shadow-xl backdrop-blur-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-sky-300">
          Spectating
        </p>
        <p className="text-sm text-white/85">
          {racing
            ? "Watching live — Q / E cycle cameras. You’ll race next round."
            : "Joined as ghost — hit Join next race when the lobby opens."}
        </p>
        <div className="mt-1 flex gap-2">
          {!racing && currentRoom?.status === "waiting" && (
            <button
              type="button"
              onClick={() => joinNextRace()}
              className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent/80"
            >
              Join next race
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              leaveRoom();
              router.push("/play/online");
            }}
            className="rounded-lg border border-white/15 px-4 py-1.5 text-xs text-mist hover:bg-white/5"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
