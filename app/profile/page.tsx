import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/require-auth";
import { RecentAttemptsPanel } from "@/components/leaderboard/client-leaderboard";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileSummary } from "@/components/profile/profile-summary";
import { FavouriteRoutesPanel } from "@/components/routes/favourite-routes-panel";
import { getPublishedRoutes } from "@/lib/routes/get-routes";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your DriveAnywhere.ai profile, personal bests and attempts.",
};

export default async function ProfilePage() {
  const routes = await getPublishedRoutes();

  return (
    <RequireAuth>
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <ProfileSummary />
        <div className="mt-10">
          <RecentAttemptsPanel />
        </div>
        <div className="mt-10">
          <FavouriteRoutesPanel routes={routes} />
        </div>
        <section className="mt-10 rounded-xl border border-line bg-panel/40 p-5">
          <h2 className="mb-4 text-lg text-white">Edit profile</h2>
          <ProfileForm />
        </section>
      </div>
    </RequireAuth>
  );
}
