import Link from "next/link";
import { Logo } from "@/components/layout/logo";

const footerLinks = [
  { href: "/routes", label: "Routes" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/attribution", label: "Attribution" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="border-line bg-ink-975 mt-auto border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="text-mist max-w-md text-sm leading-relaxed">
            Race simplified versions of real London routes and challenge your
            friends for the fastest time. Routes are playable approximations —
            not perfect digital twins.
          </p>
          <p className="text-fog/80 font-mono text-xs">
            © OpenStreetMap contributors
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-mist focus-visible:ring-accent transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-line/70 border-t">
        <div className="text-fog/70 mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} DriveAnywhere.ai</p>
          <p>MVP · Mock mode · Desktop-first driving prototype</p>
        </div>
      </div>
    </footer>
  );
}
