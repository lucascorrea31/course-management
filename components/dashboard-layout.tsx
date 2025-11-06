import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "@/components/dashboard-nav";
import { redirect } from "next/navigation";

export async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="flex h-16 items-center justify-between px-6">
          <h1 className="text-xl font-bold">Course Management</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-muted/10 p-6">
          <DashboardNav />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 max-w-[1600px]">{children}</main>
      </div>
    </div>
  );
}
