import { Cpu, Megaphone, LineChart } from "lucide-react";

const agents = [
  {
    id: "operating",
    name: "Operating Agent",
    tagline: "Automate your operations",
    description: "Monitors workflows, manages tasks, and optimises day-to-day business processes in real time.",
    icon: Cpu,
  },
  {
    id: "marketing",
    name: "Marketing Agent",
    tagline: "Scale your reach",
    description: "Analyses campaigns, generates content, and identifies growth opportunities across channels.",
    icon: Megaphone,
  },
  {
    id: "finance",
    name: "Finance Agent",
    tagline: "Control your numbers",
    description: "Tracks expenses, forecasts revenue, and surfaces financial insights to drive smarter decisions.",
    icon: LineChart,
  },
];

interface OverviewContentProps {
  userName?: string | null;
}

export function OverviewContent({ userName }: OverviewContentProps) {
  return (
    <div>
      {/* Heading */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{
          fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "#F0EEE8",
          marginBottom: "6px",
          lineHeight: 1.1,
        }}>
          {userName ? `Welcome back, ${userName}.` : "Welcome back."}
        </h1>
        <p style={{ fontSize: "13px", color: "#555555", lineHeight: 1.6 }}>
          Your AI agents are ready. Select one to get started.
        </p>
      </div>

      {/* Agent cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: "14px",
      }}>
        {agents.map(agent => {
          const Icon = agent.icon;
          return (
            <div key={agent.id} style={{
              background: "#111111",
              border: "0.5px solid #1E1E1E",
              borderRadius: "16px",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}>
              {/* Icon + status */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{
                  width: "40px", height: "40px",
                  background: "rgba(255,77,0,0.1)",
                  border: "0.5px solid rgba(255,77,0,0.2)",
                  borderRadius: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={18} color="#FF4D00" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{
                    width: "5px", height: "5px", borderRadius: "50%",
                    background: "#4CAF50", display: "inline-block",
                  }} />
                  <span style={{ fontSize: "10px", color: "#444444", letterSpacing: "0.05em" }}>Ready</span>
                </div>
              </div>

              {/* Text */}
              <div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "#F0EEE8", marginBottom: "4px" }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: "11px", color: "#FF4D00", letterSpacing: "0.02em", marginBottom: "10px" }}>
                  {agent.tagline}
                </div>
                <div style={{ fontSize: "12px", color: "#555555", lineHeight: 1.7 }}>
                  {agent.description}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: "0.5px", background: "#1E1E1E" }} />

              {/* CTA */}
              <button style={{
                background: "#FF4D00",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                width: "100%",
                letterSpacing: "-0.01em",
              }}>
                Launch Agent →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
