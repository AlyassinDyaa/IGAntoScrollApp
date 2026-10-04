import { SideNav, TabBar } from "@/components/TabBar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:pl-[244px]">
      <SideNav />
      <main className="mx-auto w-full max-w-[630px] pb-[calc(var(--tabbar-height)+var(--safe-bottom)+16px)] md:pb-10">{children}</main>
      <TabBar />
    </div>
  );
}
