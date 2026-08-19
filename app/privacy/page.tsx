import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-4xl text-white">Privacy</h1>
      <p className="text-mist mt-4">
        This MVP privacy notice will expand before public launch. In mock mode,
        authentication and attempts stay on your machine (localStorage in later
        milestones). When Supabase is configured, account and attempt data are
        stored in your project database under your control.
      </p>
      <p className="text-mist mt-4">
        We do not sell personal data. Analytics are prepared as a typed
        abstraction and log locally in development until a provider is
        connected.
      </p>
    </div>
  );
}
