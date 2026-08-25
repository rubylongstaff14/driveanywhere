"use client";

import { useEffect, useState } from "react";
import { useChallengesStore } from "@/stores/challenges-store";
import type { ChallengeDef } from "@/lib/progression/challenges";

type ChallengeWithProgress = ChallengeDef & { progress: number; completed: boolean };

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div
      style={{
        height: "4px",
        borderRadius: "9999px",
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        flex: 1,
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: "9999px",
          background: pct >= 100 ? "#5ad18a" : "#e8b84a",
          width: `${pct}%`,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

function ChallengeRow({ ch }: { ch: ChallengeWithProgress }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.45rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        opacity: ch.completed ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: "1rem", flexShrink: 0, width: "1.4rem", textAlign: "center" }}>
        {ch.completed ? "✅" : ch.icon}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.68rem",
            fontWeight: 600,
            color: ch.completed ? "rgba(255,255,255,0.5)" : "#ffffff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textDecoration: ch.completed ? "line-through" : "none",
          }}
        >
          {ch.title}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginTop: "0.25rem",
          }}
        >
          <ProgressBar value={ch.progress} max={ch.target} />
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.6rem",
              color: "rgba(255,255,255,0.4)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {Math.min(ch.progress, ch.target)}/{ch.target}
          </span>
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "0.1rem",
        }}
      >
        <span
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.58rem",
            fontWeight: 600,
            color: "#e8b84a",
          }}
        >
          +{ch.coinReward}
        </span>
        <span
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.58rem",
            fontWeight: 600,
            color: "#5ad18a",
          }}
        >
          +{ch.xpReward}xp
        </span>
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      style={{
        margin: "0.5rem 0 0.15rem",
        fontFamily: "ui-monospace, monospace",
        fontSize: "0.56rem",
        textTransform: "uppercase",
        letterSpacing: "0.2em",
        color: "rgba(255,255,255,0.35)",
      }}
    >
      {label}
    </p>
  );
}

export function ChallengesHud() {
  const [open, setOpen] = useState(false);
  const hydrated = useChallengesStore((s) => s.hydrated);
  const hydrate = useChallengesStore((s) => s.hydrate);
  const getDailyChallengesWithProgress = useChallengesStore(
    (s) => s.getDailyChallengesWithProgress,
  );
  const getWeeklyChallengesWithProgress = useChallengesStore(
    (s) => s.getWeeklyChallengesWithProgress,
  );

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  // Keyboard toggle: J
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === "j" ||
        e.key === "J"
      ) {
        // Don't fire inside inputs
        const tag = (e.target as HTMLElement | null)?.tagName ?? "";
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const daily: ChallengeWithProgress[] = hydrated ? getDailyChallengesWithProgress() : [];
  const weekly: ChallengeWithProgress[] = hydrated ? getWeeklyChallengesWithProgress() : [];
  const completedCount = [...daily, ...weekly].filter((c) => c.completed).length;
  const totalCount = daily.length + weekly.length;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: "1rem",
          left: "1rem",
          zIndex: 200,
          background: "rgba(8,10,16,0.82)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "9999px",
          padding: "0.35rem 0.85rem",
          fontFamily: "ui-monospace, monospace",
          fontSize: "0.68rem",
          fontWeight: 600,
          color: "rgba(255,255,255,0.75)",
          cursor: "pointer",
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span>📋</span>
        <span>
          Challenges{" "}
          <span
            style={{
              color: completedCount === totalCount && totalCount > 0 ? "#5ad18a" : "#e8b84a",
            }}
          >
            [{completedCount}/{totalCount}]
          </span>
        </span>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.58rem" }}>J</span>
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "1rem",
        zIndex: 200,
        width: "16rem",
        background: "rgba(8,10,16,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "1rem",
        padding: "0.85rem 1rem",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.1rem",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "#ffffff",
          }}
        >
          📋 Challenges
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.6rem",
              color:
                completedCount === totalCount && totalCount > 0
                  ? "#5ad18a"
                  : "rgba(255,255,255,0.4)",
            }}
          >
            {completedCount}/{totalCount}
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              padding: "0",
              cursor: "pointer",
              color: "rgba(255,255,255,0.35)",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.72rem",
              lineHeight: 1,
            }}
            aria-label="Close challenges panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Daily */}
      <SectionLabel label="Daily" />
      {daily.map((ch) => (
        <ChallengeRow key={ch.id} ch={ch} />
      ))}

      {/* Weekly */}
      <SectionLabel label="Weekly" />
      {weekly.map((ch) => (
        <ChallengeRow key={ch.id} ch={ch} />
      ))}

      <p
        style={{
          margin: "0.6rem 0 0",
          fontFamily: "ui-monospace, monospace",
          fontSize: "0.56rem",
          color: "rgba(255,255,255,0.2)",
          textAlign: "center",
          letterSpacing: "0.08em",
        }}
      >
        Press J to toggle
      </p>
    </div>
  );
}
