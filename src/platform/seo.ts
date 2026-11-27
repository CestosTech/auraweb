import { useEffect } from "react";

export const SITE_NAME = "Aura Liberia";
export const DEFAULT_SITE_ORIGIN = "https://auraliberia.com";
export const DEFAULT_TITLE =
  "Aura Liberia — Food, Groceries, Homes, Motors, Events & Services";
export const DEFAULT_DESCRIPTION =
  "Order food and groceries, explore homes, motors, lifestyle finds, local services, and community events across Monrovia and Liberia with Lonestar MTN MoMo, Orange Money, or Cash on Delivery.";
export const DEFAULT_OG_IMAGE = "/aura-icon-512.png";

export type SeoConfig = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | null;
};

export function toAbsoluteUrl(rawUrl?: string, origin?: string): string {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : DEFAULT_SITE_ORIGIN);
  if (!rawUrl) return `${base}${DEFAULT_OG_IMAGE}`;
  try {
    return new URL(rawUrl, base).toString();
  } catch {
    return `${base}${DEFAULT_OG_IMAGE}`;
  }
}

export function cleanCanonicalUrl(
  rawUrl?: string,
  origin?: string,
): string {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : DEFAULT_SITE_ORIGIN);
  try {
    const parsed = new URL(
      rawUrl || (typeof window !== "undefined" ? window.location.href : "/"),
      base,
    );
    parsed.searchParams.delete("aura_ref");
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return base;
  }
}

function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string,
) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  if (typeof document === "undefined") return;
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function upsertJsonLd(data: Record<string, unknown> | null | undefined) {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("aura-ld-json");
  if (!data) {
    existing?.remove();
    return;
  }
  const script = existing || document.createElement("script");
  script.id = "aura-ld-json";
  script.setAttribute("type", "application/ld+json");
  script.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(script);
}

export function applySeo(config: SeoConfig) {
  if (typeof document === "undefined") return;
  const title = config.title ? `${config.title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const description = (config.description || DEFAULT_DESCRIPTION)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  const canonical = cleanCanonicalUrl(config.url);
  const image = toAbsoluteUrl(config.image || DEFAULT_OG_IMAGE);
  const type = config.type || "website";

  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta(
    "name",
    "robots",
    config.noindex ? "noindex, nofollow" : "index, follow",
  );
  upsertCanonical(canonical);

  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:image", image);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);

  upsertJsonLd(config.jsonLd);
}

export function useSeo(config: SeoConfig | null) {
  const serialized = JSON.stringify(config);
  useEffect(() => {
    if (!config) return;
    applySeo(config);
  }, [serialized]);
}
