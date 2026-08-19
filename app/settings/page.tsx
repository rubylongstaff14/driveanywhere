import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/require-auth";
import { SettingsPanel } from "@/components/profile/settings-panel";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your DriveAnywhere.ai account settings.",
};

export default function SettingsPage() {
  return (
    <RequireAuth>
      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
          Settings
        </p>
        <h1 className="mt-3 font-display text-4xl text-white">Account</h1>
        <p className="mt-3 text-mist">
          Graphics presets arrive with the performance pass. You can log out or
          update your profile now.
        </p>
        <SettingsPanel />
        <p className="mt-6 text-sm text-fog">
          Password reset will use Supabase email recovery when that mode is
          enabled later. In mock mode, create a new local account if needed.
        </p>
      </div>
    </RequireAuth>
  );
}
