import { LayoutDashboard, Settings, CreditCard } from "lucide-react";

export const navItems = [
  { label: "Dashboard", href: "/overview", icon: LayoutDashboard },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
] as const;
