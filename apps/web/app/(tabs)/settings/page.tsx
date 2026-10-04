import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsScreen } from "./SettingsScreen";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsScreen />
    </Suspense>
  );
}
