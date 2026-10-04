import { redirect } from "next/navigation";

/** Action-first home: the app always opens on the inbox, never on content. */
export default function Home() {
  redirect("/inbox");
}
