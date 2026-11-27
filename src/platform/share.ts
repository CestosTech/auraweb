import { command } from "../utils/commandApi";

export async function auraShareUrl(rawUrl: string): Promise<string> {
  try {
    const url = new URL(rawUrl, location.origin);
    const target = `${url.pathname}${url.search}`;
    const referral = await command<{ code: string }>("/v1/aura-points/share", { target });
    url.searchParams.set("aura_ref", referral.code);
    return url.toString();
  } catch {
    return rawUrl;
  }
}
