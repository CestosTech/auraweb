const DEFAULT_API_BASE = "https://aura-mobile-iota.vercel.app";
const DEFAULT_ORIGIN = "https://auraliberia.com";
const SITE_NAME = "Aura Liberia";
const DEFAULT_TITLE =
  "Aura Liberia — Food, Groceries, Homes, Motors, Events & Services";
const DEFAULT_DESCRIPTION =
  "Order food and groceries, explore homes, motors, lifestyle finds, local services, and community events across Monrovia and Liberia.";

const ROUTE_KIND: Record<string, string> = {
  food: "food",
  groceries: "grocery",
  supermarket: "grocery",
  homes: "property",
  "real-estate": "property",
  motors: "motor",
  lifestyle: "lifestyle",
};

const CATALOGS: Record<string, string> = {
  food: "menu",
  grocery: "supermarket_items",
  property: "properties",
  motor: "motor_listings",
  lifestyle: "lifestyle_items",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toAbsoluteUrl(raw: unknown, origin: string): string {
  const s = String(raw || "").trim();
  if (!s) return `${origin}/aura-icon-512.png`;
  try {
    return new URL(s, origin).toString();
  } catch {
    return `${origin}/aura-icon-512.png`;
  }
}

async function fetchJson(url: string, timeoutMs = 3000): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function resolveItem(
  apiBase: string,
  route: string,
  id: string,
): Promise<{
  title: string;
  description: string;
  image: string;
  type: string;
  jsonLd?: Record<string, unknown>;
} | null> {
  if (!id) return null;

  if (route === "events" || route === "community") {
    const data = await fetchJson(`${apiBase}/v1/${route}/${encodeURIComponent(id)}`);
    const item = data?.item;
    if (!item) return null;
    const title = String(item.title || item.name || "Aura");
    const description = String(
      item.description ||
        `${title}${item.organizerName ? ` by ${item.organizerName}` : ""} on Aura Liberia.`,
    );
    const image = String(
      item.images?.[0] || item.image || item.heroImage || item.thumbnail || "",
    );
    return {
      title: `${title} | ${SITE_NAME}`,
      description,
      image,
      type: "article",
      jsonLd:
        route === "events"
          ? {
              "@context": "https://schema.org",
              "@type": "Event",
              name: title,
              description,
              ...(image ? { image: [image] } : {}),
            }
          : {
              "@context": "https://schema.org",
              "@type": "DiscussionForumPosting",
              headline: title,
              text: description,
              ...(image ? { image: [image] } : {}),
            },
    };
  }

  if (route === "live") {
    const data = await fetchJson(`${apiBase}/v1/live/${encodeURIComponent(id)}`);
    const session = data?.session;
    if (!session) return null;
    const title = String(session.title || "Aura Live");
    const description = `${title} — Live with ${session.merchantName || "Aura merchant"} on Aura Liberia.`;
    const image = String(session.thumbnail || data?.merchantImage || "");
    return {
      title: `${title} | ${SITE_NAME}`,
      description,
      image,
      type: "video.other",
    };
  }

  if (route === "services") {
    const direct = await fetchJson(`${apiBase}/v1/services/${encodeURIComponent(id)}`);
    let item = direct?.item;
    if (!item) {
      const list = await fetchJson(`${apiBase}/v1/services`);
      item = (list?.items || []).find((row: any) => row.id === id);
    }
    if (!item) return null;
    const title = String(item.title || "Aura Service");
    const rate = item.rateUsd ? ` — $${Number(item.rateUsd)}` : "";
    const description = String(
      item.description || `${title}${rate} on Aura Liberia.`,
    );
    const image = String(
      item.images?.[0] ||
        item.image ||
        item.heroImage ||
        item.provider?.photoUrl ||
        "",
    );
    return {
      title: `${title} | ${SITE_NAME}`,
      description,
      image,
      type: "product",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Service",
        name: title,
        description,
        ...(image ? { image } : {}),
      },
    };
  }

  const kind = ROUTE_KIND[route] || "food";
  const shared = await fetchJson(
    `${apiBase}/v1/shared-listings/${kind}/${encodeURIComponent(id)}`,
  );
  let item = shared?.item;
  if (!item && CATALOGS[kind]) {
    let pageToken = "";
    for (let i = 0; i < 3; i++) {
      const qs = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
      const page = await fetchJson(`${apiBase}/v1/catalog/${CATALOGS[kind]}${qs}`);
      if (!page?.items?.length) break;
      item = page.items.find((row: any) => row.id === id);
      if (item || !page.nextPageToken) break;
      pageToken = page.nextPageToken;
    }
  }
  if (!item) return null;

  const title = String(item.title || item.name || "Item");
  const price = Number(item.promotion?.enabled ? item.promotion.salePriceUsd : item.priceUsd ?? item.price);
  const priceText = Number.isFinite(price) && price > 0 ? `$${price}` : "";
  const description = String(
    item.description ||
      `${title}${priceText ? ` — ${priceText}` : ""} on Aura Liberia.`,
  );
  const image = String(
    item.images?.[0] || item.image || item.heroImage || item.thumbnail || "",
  );
  return {
    title: `${title}${priceText ? ` (${priceText})` : ""} | ${SITE_NAME}`,
    description,
    image,
    type: "product",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: title,
      description,
      ...(image ? { image: [image] } : {}),
      ...(Number.isFinite(price) && price > 0
        ? {
            offers: {
              "@type": "Offer",
              priceCurrency: "USD",
              price,
              availability: "https://schema.org/InStock",
            },
          }
        : {}),
    },
  };
}

function buildMetaTags(meta: {
  title: string;
  description: string;
  image: string;
  canonical: string;
  type: string;
  jsonLd?: Record<string, unknown>;
}) {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description.replace(/\s+/g, " ").trim().slice(0, 300));
  const img = escapeHtml(meta.image);
  const url = escapeHtml(meta.canonical);
  const type = escapeHtml(meta.type);
  const ld = meta.jsonLd
    ? `\n    <script id="aura-ld-json" type="application/ld+json">${JSON.stringify(meta.jsonLd).replaceAll("<", "\\u003c")}</script>`
    : "";

  return `<title>${t}</title>
    <meta name="description" content="${d}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${url}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_LR" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${img}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${img}" />${ld}`;
}

export default async function handler(req: any, res: any) {
  const env = ((globalThis as any).process?.env || {}) as Record<string, string | undefined>;
  const apiBase = (env.VITE_COMMAND_API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, "");

  const proto = String(req.headers?.["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers?.["x-forwarded-host"] || req.headers?.host || "").split(",")[0].trim();
  const origin = host ? `${proto}://${host}` : DEFAULT_ORIGIN;

  const query = req.query || {};
  const route = String(query.route || "food").toLowerCase();
  const id = String(query.id || query.item || "").trim();

  const pathByRoute: Record<string, string> = {
    food: "/",
    groceries: "/groceries",
    supermarket: "/groceries",
    homes: "/homes",
    "real-estate": "/homes",
    motors: "/motors",
    lifestyle: "/lifestyle",
    services: "/services",
    events: `/events/${encodeURIComponent(id)}`,
    community: `/community/${encodeURIComponent(id)}`,
    live: `/live/${encodeURIComponent(id)}`,
  };
  const basePath = pathByRoute[route] || "/";
  const canonical =
    ["events", "community", "live"].includes(route) || !id
      ? `${origin}${basePath}`
      : `${origin}${basePath}?item=${encodeURIComponent(id)}`;

  const [htmlRes, resolved] = await Promise.all([
    fetch(`${origin}/index.html`, { signal: AbortSignal.timeout(3000) }).catch(() => null),
    resolveItem(apiBase, route, id),
  ]);

  let html = htmlRes && htmlRes.ok ? await htmlRes.text() : "";
  if (!html) {
    html = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /></head><body><div id="root"></div></body></html>`;
  }

  const headBlock = buildMetaTags({
    title: resolved?.title || DEFAULT_TITLE,
    description: resolved?.description || DEFAULT_DESCRIPTION,
    image: toAbsoluteUrl(resolved?.image, origin),
    canonical,
    type: resolved?.type || "website",
    jsonLd: resolved?.jsonLd,
  });

  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta[^>]+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, "")
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<meta[^>]+property=["']og:[^"']+["'][^>]*>/gi, "")
    .replace(/<meta[^>]+name=["']twitter:[^"']+["'][^>]*>/gi, "")
    .replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "")
    .replace("</head>", `    ${headBlock}\n  </head>`);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.status(200).send(html);
}
