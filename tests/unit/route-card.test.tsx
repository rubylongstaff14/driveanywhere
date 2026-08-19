import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouteCard } from "@/components/routes/route-card";
import { MOCK_ROUTES } from "@/lib/database/mock/routes";

vi.mock("next/image", () => ({
  default: (props: {
    alt: string;
    src: string;
    fill?: boolean;
    className?: string;
  }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} className={props.className} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("RouteCard", () => {
  it("renders route name and play link", () => {
    const route = MOCK_ROUTES[0];
    render(<RouteCard route={route} />);

    expect(
      screen.getByRole("heading", { name: route.name }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /play/i })).toHaveAttribute(
      "href",
      `/play/${route.slug}`,
    );
  });
});
