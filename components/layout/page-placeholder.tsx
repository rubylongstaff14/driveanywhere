import { ButtonLink } from "@/components/ui/button-link";

interface PagePlaceholderProps {
  eyebrow: string;
  title: string;
  body: string;
}

export function PagePlaceholder({
  eyebrow,
  title,
  body,
}: PagePlaceholderProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-16 sm:px-6">
      <p className="text-accent font-mono text-xs tracking-[0.22em] uppercase">
        {eyebrow}
      </p>
      <h1 className="font-display text-4xl text-white">{title}</h1>
      <p className="text-mist">{body}</p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/routes">Browse routes</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </div>
  );
}
