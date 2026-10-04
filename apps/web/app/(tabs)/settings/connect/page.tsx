import type { Metadata } from "next";
import { ConnectScreen } from "./ConnectScreen";

export const metadata: Metadata = { title: "Connect accounts" };

export default function ConnectPage() {
  return <ConnectScreen />;
}
