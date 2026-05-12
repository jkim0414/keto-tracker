"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Scale, Utensils } from "lucide-react";

const items = [
  { href: "/", label: "Today", icon: Home },
  { href: "/log", label: "Food", icon: Utensils, primary: true },
  { href: "/weight", label: "Weight", icon: Scale },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center -mt-6 w-14 h-14 rounded-full bg-accent text-accent-fg shadow-lg active:scale-95 transition"
                aria-label={item.label}
              >
                <Icon size={26} strokeWidth={2.5} />
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center px-4 py-2 text-xs ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon size={22} />
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
