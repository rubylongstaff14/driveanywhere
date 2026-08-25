import { EarlyAccess } from "@/components/landing/early-access";
import { FeaturedRoutes } from "@/components/landing/featured-routes";
import { FeaturesStrip } from "@/components/landing/features-strip";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LeaderboardPreview } from "@/components/landing/leaderboard-preview";
import { Roadmap } from "@/components/landing/roadmap";
import {
  getFeaturedRoutes,
  getLeaderboardPreview,
  getPublishedRoutes,
} from "@/lib/routes/get-routes";

export default async function HomePage() {
  const [featured, leaderboard, routes] = await Promise.all([
    getFeaturedRoutes(4),
    getLeaderboardPreview(5),
    getPublishedRoutes(),
  ]);

  return (
    <>
      <Hero />
      <FeaturesStrip />
      <FeaturedRoutes routes={featured} />
      <HowItWorks />
      <LeaderboardPreview entries={leaderboard} routes={routes} />
      <Roadmap />
      <EarlyAccess />
    </>
  );
}
