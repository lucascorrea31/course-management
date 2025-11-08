import { KiwifyNav } from "@/components/kiwify-nav";

export default function KiwifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <a href="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </a>
        <span>/</span>
        <span className="text-foreground font-medium">Kiwify</span>
      </div>

      {/* Navigation Tabs */}
      <KiwifyNav />

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
