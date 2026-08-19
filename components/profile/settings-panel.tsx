"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { useAuthStore } from "@/stores/auth-store";

export function SettingsPanel() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="mt-8 space-y-4 rounded-xl border border-line bg-panel/40 p-5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-fog">Signed in as</span>
        <span className="text-white">{user?.displayName}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-fog">Mode</span>
        <span className="capitalize text-white">{user?.mode}</span>
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <ButtonLink href="/profile" variant="secondary">
          Edit profile
        </ButtonLink>
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
