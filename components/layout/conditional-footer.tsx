"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/play/")) {
    return null;
  }
  return <Footer />;
}
