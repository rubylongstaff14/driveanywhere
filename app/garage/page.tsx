import type { Metadata } from "next";
import { GarageStudio } from "@/components/garage/garage-studio";

export const metadata: Metadata = { title: "Garage" };

export default function GaragePage() {
  return <GarageStudio />;
}
