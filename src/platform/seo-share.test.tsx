import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { applySeo, cleanCanonicalUrl } from "./seo";
import { Catalog } from "./Catalog";
import { ServicesMarket } from "./Services";
import { Platform } from "./context";

const mockCommand = vi.fn();

vi.mock("../utils/commandApi", () => ({
  command: (...args: any[]) => mockCommand(...args),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("./Location", () => ({
  LocationDialog: () => null,
}));

const platformValue = {
  requireLogin: async () => true,
  toast: vi.fn(),
  confirm: async () => true,
  cart: [],
  setCart: vi.fn(),
  add: vi.fn(),
  saved: new Set<string>(),
  toggleSaved: vi.fn(),
  openChat: vi.fn(),
  theme: "light" as const,
  setTheme: vi.fn(),
};

describe("SEO & Share loading", () => {
  beforeEach(() => {
    mockCommand.mockReset();
    document.head.innerHTML = "";
    history.replaceState(null, "", "/");
  });

  it("applies SEO meta tags, strips aura_ref from canonical, and sets JSON-LD", () => {
    const canonical = cleanCanonicalUrl(
      "https://auraliberia.com/homes?item=h1&aura_ref=ref123",
      "https://auraliberia.com",
    );
    expect(canonical).toBe("https://auraliberia.com/homes?item=h1");

    applySeo({
      title: "3BR Apartment in Sinkor",
      description: "Spacious apartment near Tubman Blvd",
      image: "https://cdn.example.com/home.jpg",
      url: "https://auraliberia.com/homes?item=h1&aura_ref=ref123",
      type: "product",
      jsonLd: { "@context": "https://schema.org", "@type": "Product", name: "3BR Apartment in Sinkor" },
    });

    expect(document.title).toBe("3BR Apartment in Sinkor | Aura Liberia");
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "https://auraliberia.com/homes?item=h1",
    );
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe(
      "https://cdn.example.com/home.jpg",
    );
    expect(document.head.querySelector('meta[name="twitter:image"]')?.getAttribute("content")).toBe(
      "https://cdn.example.com/home.jpg",
    );
    expect(document.getElementById("aura-ld-json")?.textContent).toContain("3BR Apartment in Sinkor");
  });

  it("loads a shared food item via ?item= even when absent from the initial feed", async () => {
    history.replaceState(null, "", "/?item=dish-99");
    mockCommand.mockImplementation(async (path: string) => {
      if (path.startsWith("/v1/catalog/menu")) return { items: [], nextPageToken: null };
      if (path.startsWith("/v1/restaurants")) return { items: [] };
      if (path === "/v1/shared-listings/food/dish-99") {
        return {
          item: {
            id: "dish-99",
            name: "Jollof Rice Special",
            priceUsd: 8,
            image: "https://cdn.example.com/jollof.jpg",
            description: "Smoky party jollof with grilled chicken.",
          },
        };
      }
      return { items: [] };
    });

    render(
      <Platform.Provider value={platformValue}>
        <Catalog kind="food" />
      </Platform.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    expect(screen.getAllByText("Jollof Rice Special").length).toBeGreaterThan(0);
    const img = document.querySelector('.a-gallery img[src="https://cdn.example.com/jollof.jpg"]');
    expect(img).toBeTruthy();
  });

  it("loads a shared service via ?item= and renders Share button", async () => {
    history.replaceState(null, "", "/services?item=svc-42");
    mockCommand.mockImplementation(async (path: string) => {
      if (path === "/v1/services") {
        return {
          items: [
            {
              id: "svc-42",
              title: "AC & Refrigeration Repair",
              category: "AC & Refrigeration",
              description: "Fast home & office AC servicing.",
              rateUsd: 25,
              pricingType: "hourly",
              county: "Montserrado",
              locality: "Sinkor",
              image: "https://cdn.example.com/ac.jpg",
              provider: { name: "Kollie Tech" },
            },
          ],
        };
      }
      return { items: [] };
    });

    render(
      <Platform.Provider value={platformValue}>
        <ServicesMarket />
      </Platform.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: /Share/i })).toBeTruthy();
    const imgs = screen.getAllByAltText("AC & Refrigeration Repair");
    expect(imgs.some((el) => el.getAttribute("src") === "https://cdn.example.com/ac.jpg")).toBe(true);
  });
});
