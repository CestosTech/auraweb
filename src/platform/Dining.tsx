import React, { useEffect, useState } from "react";
import { useRemote, friendly } from "./hooks";
import { usePlatform } from "./context";
import { command } from "../utils/commandApi";
import { Row } from "./model";
import { Button, Busy, Notice, Photo, Field } from "./ui";
import { ProductCard, ItemDetail } from "./Catalog";
import { CartSheet } from "./Commerce";
import { rememberTable } from "./dining-session";
export { rememberedTable } from "./dining-session";
import { TableQr } from "./TableQr";
export function Dining({
  merchantId,
  tableId,
}: {
  merchantId: string;
  tableId: string;
}) {
  const entry = useRemote(
      `/v1/dining/${encodeURIComponent(merchantId)}/${encodeURIComponent(tableId)}`,
      undefined,
      0,
      false,
    ),
    { cart } = usePlatform();
  const [extra, setExtra] = useState<Row[]>([]),
    [next, setNext] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [detail, setDetail] = useState<Row | null>(null),
    [basket, setBasket] = useState(false),
    [qrOpen, setQrOpen] = useState(
      new URLSearchParams(location.search).get("qr") === "1",
    ),
    [error, setError] = useState<string | null>(null),
    [paging, setPaging] = useState(false);
  useEffect(() => {
    if (entry.data) {
      rememberTable(merchantId, tableId);
      setExtra([]);
      setNext(entry.data.nextPageToken ?? null);
    }
  }, [entry.data, merchantId, tableId]);
  if (entry.loading)
    return (
      <section className="a-page">
        <Busy />
      </section>
    );
  if (!entry.data)
    return (
      <section className="a-page">
        <h1>Welcome to your table</h1>
        <Notice error={entry.error} retry={entry.reload} />
        <p>Ask the kitchen for a new table code if this one is unavailable.</p>
      </section>
    );
  const { restaurant, table } = entry.data,
    items = [...entry.data.items, ...extra].filter(
      (i) => i.isAvailable !== false,
    ),
    categories = [
      ...new Set<string>(items.map((i) => i.category?.trim()).filter(Boolean)),
    ],
    count = cart
      .filter((l) => l.kind === "food" && l.item.restaurantId === merchantId)
      .reduce((n, l) => n + l.quantity, 0);
  return (
    <section className="a-page a-dining-page">
      <div className="a-dining-table" role="status">
        <strong>
          Dining in · {[table.area, table.name].filter(Boolean).join(" · ")}
        </strong>
        <p>Your table is selected. No app download needed.</p>
      </div>
      <Photo
        src={restaurant.heroImage}
        style={{
          width: "100%",
          maxHeight: 280,
          objectFit: "cover",
          borderRadius: 24,
        }}
      />
      <h1>{restaurant.name}</h1>
      <p>{restaurant.cuisine}</p>
      {restaurant.isOpen === false && (
        <p className="a-warning">
          The kitchen is currently closed. You can browse its menu.
        </p>
      )}
      <div className="a-row between">
        <h2>Menu</h2>
      </div>
      <Field label="Search this menu">
        <input
          type="search"
          value={query}
          placeholder="Find a dish or drink"
          onChange={(e) => setQuery(e.target.value)}
        />
      </Field>
      <div className="a-tabs a-dining-categories" style={{ overflowX: "auto" }}>
        {["", ...categories].map((c) => (
          <button
            key={c}
            className={category === c ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            {c || "All"}
          </button>
        ))}
      </div>
      <Notice error={error} />
      <div className="a-grid">
        {items
          .filter(
            (i) =>
              (!category || i.category?.trim() === category) &&
              `${i.name || ""} ${i.description || ""}`
                .toLowerCase()
                .includes(query.trim().toLowerCase()),
          )
          .map((i) => (
            <ProductCard
              key={i.id}
              kind="food"
              item={{
                ...i,
                isAvailable:
                  restaurant.isOpen !== false && i.isAvailable !== false,
              }}
              onOpen={() => setDetail(i)}
            />
          ))}
      </div>
      {items.length > 0 &&
        !items.some(
          (i) =>
            (!category || i.category?.trim() === category) &&
            `${i.name || ""} ${i.description || ""}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
        ) && <p>No dishes match. Try another search or category.</p>}
      {!items.length && (
        <p>No dishes are available yet. Ask the kitchen for help.</p>
      )}
      {next && (
        <Button
          secondary
          disabled={paging}
          onClick={async () => {
            setPaging(true);
            try {
              const page = await command(
                `/v1/dining/${merchantId}/${tableId}?after=${encodeURIComponent(next)}`,
                undefined,
                undefined,
                false,
              );
              setExtra((old) => [...old, ...page.items]);
              setNext(page.nextPageToken ?? null);
            } catch (e) {
              setError(friendly(e));
            } finally {
              setPaging(false);
            }
          }}
        >
          Load more dishes
        </Button>
      )}
      {detail && (
        <ItemDetail
          key={detail.id}
          item={{
            ...detail,
            isAvailable:
              restaurant.isOpen !== false && detail.isAvailable !== false,
          }}
          kind="food"
          items={items}
          shops={[restaurant]}
          onClose={() => setDetail(null)}
          onSelect={setDetail}
        />
      )}
      {qrOpen && (
        <TableQr
          merchantId={merchantId}
          tableId={tableId}
          onClose={() => setQrOpen(false)}
        />
      )}
      <div className="a-dining-basket">
        <div>
          <strong>{table.name}</strong>
          <span>
            {count
              ? `${count} ${count === 1 ? "item" : "items"} in your order`
              : "Choose dishes to start"}
          </span>
        </div>
        <Button
          onClick={() => setBasket(true)}
          disabled={!count || restaurant.isOpen === false}
        >
          {restaurant.isOpen === false ? "Kitchen closed" : "View your order"}
        </Button>
      </div>
      {basket && (
        <CartSheet
          kind="food"
          merchants={[restaurant]}
          onClose={() => setBasket(false)}
        />
      )}
    </section>
  );
}
