import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-4xl text-white">Terms</h1>
      <p className="text-mist mt-4">
        DriveAnywhere.ai is an early prototype. Routes are simplified playable
        approximations and must not be treated as navigation aids or accurate
        digital twins of the real world.
      </p>
      <p className="text-mist mt-4">
        Do not use the product while operating a real vehicle. Compete fairly;
        attempts may be validated and invalid runs rejected.
      </p>
    </div>
  );
}
