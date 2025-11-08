"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Package, ShoppingCart, GraduationCap } from "lucide-react";

const navItems = [
  {
    title: "Visão Geral",
    href: "/dashboard/hotmart",
    icon: Home,
  },
  {
    title: "Produtos",
    href: "/dashboard/hotmart/products",
    icon: Package,
  },
  {
    title: "Vendas",
    href: "/dashboard/hotmart/sales",
    icon: ShoppingCart,
    disabled: true,
  },
  {
    title: "Alunos",
    href: "/dashboard/hotmart/students",
    icon: GraduationCap,
    disabled: true,
  },
];

export function HotmartNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.disabled ? "#" : item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              item.disabled && "opacity-50 cursor-not-allowed pointer-events-none",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
            {item.disabled && (
              <span className="ml-1 text-xs">(Em breve)</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
