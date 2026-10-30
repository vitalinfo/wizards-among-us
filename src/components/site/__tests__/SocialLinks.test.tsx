import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import { SITE } from "@/lib/site";
import { axe } from "@/test/axe";
import { SocialLinks } from "../SocialLinks";

const t = messages.common.footer;

describe("SocialLinks", () => {
  it("links Instagram and the Telegram channel, without the chat by default", () => {
    render(
      <SocialLinks instagramLabel={t.instagram} telegramLabel={t.telegram} />,
    );

    expect(screen.getByRole("link", { name: t.instagram })).toHaveAttribute(
      "href",
      SITE.instagramUrl,
    );
    expect(screen.getByRole("link", { name: t.telegram })).toHaveAttribute(
      "href",
      "https://t.me/charivnyky_poruch",
    );
    expect(
      screen.queryByRole("link", { name: t.telegramChat }),
    ).not.toBeInTheDocument();
  });

  it("adds the Telegram chat as a third link when it is labelled", async () => {
    const { container } = render(
      <SocialLinks
        instagramLabel={t.instagram}
        telegramLabel={t.telegram}
        telegramChatLabel={t.telegramChat}
      />,
    );

    const chat = screen.getByRole("link", { name: t.telegramChat });
    expect(chat).toHaveAttribute("href", "https://t.me/+XlZ9JMfByQZhMTU6");
    expect(chat).toHaveAttribute("target", "_blank");
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("points the Telegram link elsewhere when a URL is passed", () => {
    render(
      <SocialLinks
        instagramLabel={t.instagram}
        telegramLabel={t.telegram}
        telegramUrl={SITE.partnersTelegramUrl}
      />,
    );

    expect(screen.getByRole("link", { name: t.telegram })).toHaveAttribute(
      "href",
      "https://t.me/helen_0104",
    );
  });
});
