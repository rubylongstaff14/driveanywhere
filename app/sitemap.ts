import type { MetadataRoute } from "next";
import { getPublishedRoutes } from "@/lib/routes/get-routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const routes = await getPublishedRoutes();

  const staticEntries: MetadataRoute.Sitemap = [
    "",
    "/routes",
    "/leaderboard",
    "/attribution",
    "/privacy",
    "/terms",
    "/login",
    "/register",
  ].map((path) => ({
    url: `${appUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const routeEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${appUrl}/routes/${route.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...routeEntries];
}
