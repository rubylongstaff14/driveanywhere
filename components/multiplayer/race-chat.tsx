"use client";

import { useEffect, useRef, useState } from "react";
import { useMultiplayerStore } from "@/stores/multiplayer-store";

export function RaceChat() {
  const chatMessages = useMultiplayerStore((s) => s.chatMessages);
  const sendChat = useMultiplayerStore((s) => s.sendChat);
  const myId = useMultiplayerStore((s) => s.myId);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "t" && !open && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setText("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed) {
      sendChat(trimmed);
    }
    setText("");
    setOpen(false);
  }

  const now = Date.now();
  const visibleMessages = chatMessages.filter((m) => now - m.timestamp < 12000 || open);

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 w-80">
      <div ref={listRef} className="mb-2 max-h-48 overflow-y-auto space-y-0.5">
        {visibleMessages.map((m, i) => (
          <div
            key={i}
            className={`pointer-events-none rounded px-2 py-0.5 text-xs backdrop-blur-sm ${
              m.playerId === myId ? "bg-accent/20 text-white" : "bg-black/50 text-white/90"
            }`}
          >
            <span className="font-medium text-accent">{m.playerName}: </span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      {open ? (
        <form onSubmit={handleSubmit} className="pointer-events-auto">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={150}
            placeholder="Type a message..."
            className="w-full rounded-lg border border-white/20 bg-black/70 px-3 py-1.5 text-sm text-white outline-none backdrop-blur-sm placeholder:text-white/40 focus:border-accent"
          />
        </form>
      ) : (
        <p className="pointer-events-none text-[10px] text-white/30">Press T to chat</p>
      )}
    </div>
  );
}
