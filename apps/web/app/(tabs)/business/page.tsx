import type { Metadata } from "next";
import { BusinessScreen } from "./BusinessScreen";

export const metadata: Metadata = { title: "Business" };

export default function BusinessPage() {
  return <BusinessScreen />;
}
