import type { Metadata } from "next";
import { ShopDesk } from "@/components/garage/shop-desk";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  return <ShopDesk />;
}
