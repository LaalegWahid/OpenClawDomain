import { LayoutDashboard, Settings, CreditCard, Sparkles } from "lucide-react";

export const navItems = [
  { label: "Dashboard", href: "/overview", icon: LayoutDashboard },
  { label: "Skills", href: "/skills", icon: Sparkles },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
] as const;
