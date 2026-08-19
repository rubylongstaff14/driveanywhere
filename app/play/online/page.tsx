import type { Metadata } from "next";
import { ServerBrowser } from "@/components/multiplayer/server-browser";

export const metadata: Metadata = {
  title: "Online — Server Browser",
};

export default function OnlinePage() {
  return <ServerBrowser />;
}
