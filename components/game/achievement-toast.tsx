"use client";

import { useEffect, useRef } from "react";
import { useAchievementStore } from "@/stores/achievement-store";

const TOAST_DURATION_MS = 4000;

const slideUpKeyframes = `
@keyframes da-achievement-slide-up {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes da-achievement-slide-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-16px) scale(0.96);
  }
}
`;

export function AchievementToast() {
  const pendingToast = useAchievementStore((s) => s.pendingToast);
  const popToast = useAchievementStore((s) => s.popToast);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingToast) return;

    // Don't restart the timer if same toast is still showing
    if (toastIdRef.current === pendingToast.id) return;
    toastIdRef.current = pendingToast.id;

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      popToast();
      toastIdRef.current = null;
      timerRef.current = null;
    }, TOAST_DURATION_MS);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pendingToast, popToast]);

  if (!pendingToast) return null;

  return (
    <>
      <style>{slideUpKeyframes}</style>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: "5.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          animation: `da-achievement-slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both`,
          pointerEvents: "none",
          minWidth: "20rem",
          maxWidth: "calc(100vw - 2rem)",
        }}
      >
        <div
          style={{
            background: "rgba(8, 10, 16, 0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "1rem",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}
        >
          {/* Badge background glow */}
          <div
            style={{
              position: "relative",
              flexShrink: 0,
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "0.75rem",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
            }}
          >
            {pendingToast.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.625rem",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: "rgba(255,255,255,0.45)",
                marginBottom: "0.2rem",
              }}
            >
              Achievement Unlocked
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "#ffffff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {pendingToast.name}
            </p>
            <p
              style={{
                margin: "0.15rem 0 0",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.55)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {pendingToast.description}
            </p>
          </div>

          <div
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "0.2rem",
            }}
          >
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#e8b84a",
                whiteSpace: "nowrap",
              }}
            >
              +{pendingToast.coinReward} coins
            </span>
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#5ad18a",
                whiteSpace: "nowrap",
              }}
            >
              +{pendingToast.xpReward} XP
            </span>
          </div>
        </div>

        {/* Progress bar that depletes over TOAST_DURATION_MS */}
        <div
          style={{
            marginTop: "0.35rem",
            height: "2px",
            borderRadius: "9999px",
            background: "rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "rgba(255,255,255,0.4)",
              borderRadius: "9999px",
              animation: `da-achievement-slide-out ${TOAST_DURATION_MS}ms linear both`,
              transformOrigin: "left",
            }}
          />
        </div>
      </div>
    </>
  );
}
