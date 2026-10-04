import type { AccountAccent } from "@ig-focus-hub/shared";

export const ACCENT_CLASS: Record<AccountAccent, string> = {
  pink: "bg-accent-pink",
  purple: "bg-accent-purple",
  orange: "bg-accent-orange",
  blue: "bg-accent-blue",
  green: "bg-accent-green",
};

export const ACCENT_TEXT_CLASS: Record<AccountAccent, string> = {
  pink: "text-accent-pink",
  purple: "text-accent-purple",
  orange: "text-accent-orange",
  blue: "text-accent-blue",
  green: "text-accent-green",
};

export const ACCENT_HEX: Record<AccountAccent, string> = {
  pink: "#e1306c",
  purple: "#833ab4",
  orange: "#f77737",
  blue: "#0095f6",
  green: "#1cb850",
};
