import type { Metadata } from "next";
import { TournamentHub } from "@/components/tournament/tournament-hub";

export const metadata: Metadata = {
  title: "Tournament",
  description: "Enter a coin buy-in tournament. Race 3 maps. Winner takes the pot.",
};

export default function TournamentPage() {
  return <TournamentHub />;
}
