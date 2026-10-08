import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import Link from "next/link";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { axe } from "@/test/axe";
import { BlobArt } from "../BlobArt";
import { PageHero } from "../PageHero";

const t = messages.parent.info;

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="uk" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function hero(extra?: Partial<Parameters<typeof PageHero>[0]>) {
  return wrap(
    <PageHero
      title="Як це працює для батьків"
      lead={t.lead}
      cta={<Link href="/parent/applications">{t.heroCta}</Link>}
      {...extra}
    />,
  );
}

describe("PageHero", () => {
  it("names the page with the one h1", () => {
    hero();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Як це працює для батьків",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders the action it is given", () => {
    hero();
    expect(screen.getByRole("link", { name: t.heroCta })).toHaveAttribute(
      "href",
      "/parent/applications",
    );
  });

  it("renders the card under the action, and omits it when there is none", () => {
    const { unmount } = hero({ below: <p>{t.note.title}</p> });
    expect(screen.getByText(t.note.title)).toBeInTheDocument();
    unmount();

    hero();
    expect(screen.queryByText(t.note.title)).not.toBeInTheDocument();
  });

  // The illustration carries none of the argument, so it is decorative in the
  // accessibility tree only when the caller says so — here it is a named
  // picture and must keep its description.
  it("renders the illustration with its description", () => {
    hero({
      art: (
        <BlobArt
          src="/parent-hero.webp"
          alt={t.heroAlt}
          width={1213}
          height={1541}
          blobClassName="h-[80%] w-[114%]"
        />
      ),
    });
    expect(screen.getByRole("img", { name: t.heroAlt })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = hero({
      below: <p>{t.note.title}</p>,
      art: (
        <BlobArt
          src="/parent-hero.webp"
          alt={t.heroAlt}
          width={1213}
          height={1541}
          blobClassName="h-[80%] w-[114%]"
        />
      ),
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
