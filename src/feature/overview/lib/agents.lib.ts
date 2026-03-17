import { Cpu, Megaphone, LineChart } from "lucide-react";

export const agents = [
  {
    id: "operating",
    name: "Operating Agent",
    tagline: "Automate your operations",
    description:
      "Monitors workflows, manages tasks, and optimises day-to-day business processes in real time.",
    icon: Cpu,
    accentFrom: "from-brand-dark",
    accentTo: "to-brand",
    status: "Ready",
  },
  {
    id: "marketing",
    name: "Marketing Agent",
    tagline: "Scale your reach",
    description:
      "Analyses campaigns, generates content, and identifies growth opportunities across channels.",
    icon: Megaphone,
    accentFrom: "from-brand",
    accentTo: "to-brand-light",
    status: "Ready",
  },
  {
    id: "finance",
    name: "Finance Agent",
    tagline: "Control your numbers",
    description:
      "Tracks expenses, forecasts revenue, and surfaces financial insights to drive smarter decisions.",
    icon: LineChart,
    accentFrom: "from-brand-dark",
    accentTo: "to-brand-light",
    status: "Ready",
  },
] as const;
