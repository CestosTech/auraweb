type TableSession = { merchantId: string; tableId: string; until: number };
let memory: TableSession | null = null;
let storageUnavailable = false;
export function rememberTable(merchantId: string, tableId: string) {
  memory = { merchantId, tableId, until: Date.now() + 7200000 };
  try {
    sessionStorage.setItem("aura_table_session", JSON.stringify(memory));
    sessionStorage.setItem("aura_dining_merchant", merchantId);
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
  }
}
export function rememberedTable(merchantId: string) {
  let value: TableSession | null = memory;
  if (!storageUnavailable) {
    try {
      value = JSON.parse(
        sessionStorage.getItem("aura_table_session") || "null",
      );
    } catch {
      value = memory;
    }
  }
  return value?.merchantId === merchantId &&
    typeof value.tableId === "string" &&
    Number.isFinite(value.until) &&
    value.until > Date.now()
    ? value.tableId
    : "";
}
export function forgetTable() {
  memory = null;
  storageUnavailable = false;
  try {
    sessionStorage.removeItem("aura_table_session");
    sessionStorage.removeItem("aura_dining_merchant");
  } catch {}
}
