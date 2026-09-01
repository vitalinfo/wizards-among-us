import { getTranslations } from "next-intl/server";
import Link from "next/link";

// Shared admin navigation. A server component: it has no interactivity, so it
// ships no JS.
export async function AdminNav() {
  const t = await getTranslations("admin.nav");
  const links = [
    { href: "/admin", label: t("dashboard") },
    { href: "/admin/campaigns", label: t("campaigns") },
    { href: "/admin/applications", label: t("applications") },
    { href: "/admin/users", label: t("users") },
    { href: "/admin/reviews", label: t("reviews") },
    { href: "/admin/settings", label: t("settings") },
  ];

  return (
    <nav className="border-border border-b">
      <ul className="mx-auto flex w-full max-w-4xl gap-4 px-6 py-3 text-sm font-medium">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="hover:text-primary focus-visible:outline-ring rounded focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
