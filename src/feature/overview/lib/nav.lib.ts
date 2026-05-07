import { LayoutDashboard, Settings, CreditCard, Sparkles, Users } from "lucide-react";

export const navItems = [
  { label: "Dashboard", href: "/overview", icon: LayoutDashboard },
  { label: "Skills", href: "/skills", icon: Sparkles },
  { label: "Peer Test", href: "/peer-test", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
] as const;
