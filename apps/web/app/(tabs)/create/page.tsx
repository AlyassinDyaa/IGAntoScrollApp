import type { Metadata } from "next";
import { CreateStudio } from "./CreateStudio";

export const metadata: Metadata = { title: "Create" };

export default function CreatePage() {
  return <CreateStudio />;
}
