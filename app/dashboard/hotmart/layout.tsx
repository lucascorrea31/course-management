import { HotmartNav } from "@/components/hotmart-nav";

export default function HotmartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <a href="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </a>
        <span>/</span>
        <span className="text-foreground font-medium">Hotmart</span>
      </div>

      {/* Navigation Tabs */}
      <HotmartNav />

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
