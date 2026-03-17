"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Power, RefreshCw, Cpu, Megaphone, LineChart } from "lucide-react";
import { SidebarInset } from "@/shared/components/ui/sidebar";
import { Separator } from "@/shared/components/ui/separator";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

interface AgentRecord {
  id: string;
  type: string;
  name: string;
  status: string;
  containerId: string | null;
  containerPort: number | null;
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  metadata: unknown;
  createdAt: string;
}

const typeIcons: Record<string, typeof Cpu> = {
  ops: Cpu,
  marketing: Megaphone,
  finance: LineChart,
};

interface AgentDetailContentProps {
  agentId: string;
}

export function AgentDetailContent({ agentId }: AgentDetailContentProps) {
  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent);
        setActivities(data.activities ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const handleStop = async () => {
    setStopping(true);
    try {
      await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      await fetchAgent();
    } finally {
      setStopping(false);
    }
  };

  const Icon = agent ? (typeIcons[agent.type] ?? Cpu) : Cpu;

  return (
    <SidebarInset>
      <main className="flex flex-1 flex-col gap-6 p-6 bg-black">
        <Link href="/overview">
          <Button variant="ghost" className="text-white/60 hover:text-white gap-2 px-0">
            <ArrowLeft className="size-4" />
            Back to Overview
          </Button>
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="size-6 animate-spin text-white/40" />
          </div>
        ) : !agent ? (
          <p className="text-white/50">Agent not found.</p>
        ) : (
          <>
            {/* Agent header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-brand">
                  <Icon className="size-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{agent.name}</h1>
                  <p className="text-sm text-white/50">
                    {agent.type} agent &middot; Created{" "}
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    agent.status === "active"
                      ? "bg-success/15 text-success"
                      : agent.status === "error"
                        ? "bg-red-500/15 text-red-400"
                        : agent.status === "starting"
                          ? "bg-yellow-500/15 text-yellow-400"
                          : "bg-white/10 text-white/50"
                  }`}
                >
                  {agent.status}
                </span>

                {agent.status === "active" && (
                  <Button
                    onClick={handleStop}
                    disabled={stopping}
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Power className="size-4 mr-1" />
                    {stopping ? "Stopping..." : "Stop"}
                  </Button>
                )}
              </div>
            </div>

            {/* Container info */}
            {agent.containerId && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/40 mb-1">Container</p>
                <p className="text-sm text-white/70 font-mono">
                  {agent.containerId} &middot; Port {agent.containerPort}
                </p>
              </div>
            )}

            <Separator className="bg-white/10" />

            {/* Activity log */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">
                Activity Log
              </h2>

              {activities.length === 0 ? (
                <p className="text-sm text-white/40">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                    >
                      <div
                        className={`mt-0.5 size-2 rounded-full shrink-0 ${
                          activity.type === "error"
                            ? "bg-red-400"
                            : activity.type === "launch"
                              ? "bg-success"
                              : activity.type === "stop"
                                ? "bg-white/30"
                                : "bg-brand"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/70">
                          {activity.message}
                        </p>
                        <p className="text-xs text-white/30 mt-1">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </SidebarInset>
  );
}
