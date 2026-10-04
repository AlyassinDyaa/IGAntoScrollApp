/**
 * Instagram-matching design tokens. The CSS in apps/web/app/globals.css mirrors these.
 * Values follow Instagram's web/iOS palette so the hub feels native to an IG user.
 */
export const IG_COLORS = {
  light: {
    primaryBackground: "#ffffff",
    secondaryBackground: "#fafafa",
    highlightBackground: "#efefef",
    primaryText: "#262626",
    secondaryText: "#8e8e8e",
    separator: "#dbdbdb",
    elevatedSeparator: "#efefef",
    primaryButton: "#0095f6",
    primaryButtonHover: "#1877f2",
    secondaryButton: "#efefef",
    link: "#00376b",
    error: "#ed4956",
    badge: "#ff3040",
    success: "#1cb850",
  },
  dark: {
    primaryBackground: "#000000",
    secondaryBackground: "#121212",
    highlightBackground: "#262626",
    primaryText: "#fafafa",
    secondaryText: "#a8a8a8",
    separator: "#262626",
    elevatedSeparator: "#363636",
    primaryButton: "#0095f6",
    primaryButtonHover: "#1877f2",
    secondaryButton: "#363636",
    link: "#e0f1ff",
    error: "#ed4956",
    badge: "#ff3040",
    success: "#1cb850",
  },
} as const;

/** Classic Instagram gradient used for story rings, logo and brand accents. */
export const IG_GRADIENT =
  "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)";

/** Per-account accent colors (spec: persistent color, avatar and label per account). */
export const ACCOUNT_ACCENT_HEX = {
  pink: "#e1306c",
  purple: "#833ab4",
  orange: "#f77737",
  blue: "#0095f6",
  green: "#1cb850",
} as const;
