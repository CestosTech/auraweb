import React, { useState } from "react";
import { useRemote } from "./hooks";
import { Dialog, Notice, Busy, Button } from "./ui";
export function TableQr({
  merchantId,
  tableId,
  onClose,
}: {
  merchantId: string;
  tableId: string;
  onClose: () => void;
}) {
  const qr = useRemote(
    `/v1/dining/${merchantId}/${tableId}/qr`,
    undefined,
    0,
    false,
  );
  const [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState<string | null>(null);
  const serverUrl = qr.data?.url;
  let url = new URL(
    `/dine/${encodeURIComponent(merchantId)}/${encodeURIComponent(tableId)}`,
    location.origin,
  ).href;
  try {
    if (
      typeof serverUrl === "string" &&
      new URL(serverUrl).protocol === "https:"
    )
      url = serverUrl;
  } catch {}
  return (
    <Dialog title="Table QR code" onClose={onClose}>
      <Notice
        error={
          qr.error
            ? "Could not verify this table right now. Check the link before printing."
            : null
        }
        retry={qr.reload}
      />
      <label className="a-field">
        <span>Table web link</span>
        <input
          aria-label="Table web link"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
        />
      </label>
      <Button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setCopyError(null);
          } catch {
            setCopyError("Select the link above to copy it manually.");
          }
        }}
      >
        {copied ? "Copied" : "Copy table link"}
      </Button>
      <Notice error={copyError} />
      <p>Use this link with your own QR design. No app download is required.</p>
      {qr.loading ? (
        <Busy />
      ) : (
        qr.data && (
          <>
            <h2>{qr.data.restaurantName}</h2>
            <p>
              {qr.data.table.area} · {qr.data.table.name}
            </p>
            <img
              width={280}
              height={380}
              alt="Scan to order at this table"
              src={
                "data:image/svg+xml;charset=utf-8," +
                encodeURIComponent(qr.data.cardSvg || qr.data.svg)
              }
            />
            <p>
              Scan, choose your food and order. This table is included
              automatically.
            </p>

            <a
              className="a-button"
              download={`Aura-table-${tableId}.svg`}
              href={
                "data:image/svg+xml;charset=utf-8," +
                encodeURIComponent(qr.data.cardSvg || qr.data.svg)
              }
            >
              Download table card for printing
            </a>
          </>
        )
      )}
    </Dialog>
  );
}
