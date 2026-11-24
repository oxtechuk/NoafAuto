import type { ISettingsData } from "../../interfaces/ISettingsData";
import api from "./http";

interface IBootSettings {
  locale: string;
  data: ISettingsData;
}

/**
 * Settings rendered into the page by app.blade.php (window.__BOOT_SETTINGS__), same shape as
 * getSettings(). Returned only for the locale the server rendered, otherwise undefined (= fetch).
 */
export function getBootSettings(language: string): ISettingsData | undefined {
  if (typeof window === "undefined") return undefined;
  const boot = (window as unknown as { __BOOT_SETTINGS__?: IBootSettings }).__BOOT_SETTINGS__;
  return boot && boot.locale === language ? boot.data : undefined;
}

export async function getSettings(): Promise<ISettingsData> {
  const response = await api.get<{ success: boolean; data: ISettingsData }>(
    "store/settings/footer",
  );
  return response.data.data;
}
