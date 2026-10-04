import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentScreen } from "./ContentScreen";

export const metadata: Metadata = { title: "Content" };

export default function ContentPage() {
  return (
    <Suspense>
      <ContentScreen />
    </Suspense>
  );
}
