"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, Loader2, X, Sparkles } from "lucide-react";
import {
  createAgent,
  fetchAgents as fetchAgentsAction,
  fetchHasCard,
  fetchModelsCatalog,
  fetchReferralData,
  fetchUserSkills as fetchUserSkillsAction,
  pollWhatsAppLink,
  startWhatsAppLink,
  type ReferralData,
} from "../actions/agent.actions";
import {
  ACCENT,
  AgentCard,
  AgentCardSkeleton,
  FeedbackModal,
  ModalField,
  OverviewStyles,
  PLATFORM_ACTIVE_COLORS,
  PLATFORM_OPTIONS,
  PlatformSvg,
  StepIndicator,
  inputStyle,
  labelStyle,
  mono,
  serif,
  type AgentRecord,
  type Platform,
  type UserSkill,
} from "./shared";

interface OverviewContentProps {
  userName?: string | null;
}

export function OverviewContent({ userName }: OverviewContentProps) {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // WhatsApp QR step (shown inside modal after agent creation)
  const [waStep, setWaStep] = useState<"form" | "qr" | "linked">("form");
  const [waAgentId, setWaAgentId] = useState<string | null>(null);
  const [waQrData, setWaQrData] = useState<string | null>(null);
  const [waQrError, setWaQrError] = useState<string | null>(null);

  const [platform, setPlatform] = useState<Platform>("telegram");

  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [discordToken, setDiscordToken] = useState("");

  const [botName, setBotName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful specialist agent.");
  const [customType, setCustomType] = useState("");
  const [apiProvider, setApiProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [agentModel, setAgentModel] = useState("");
  const [modelsCatalog, setModelsCatalog] = useState<Record<string, string[]>>({});

  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  const [hasCard, setHasCard] = useState<boolean | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  const [feedbackAgentId, setFeedbackAgentId] = useState<string | null>(null);

  const refreshAgents = useCallback(async () => {
    setLoading(true);
    try {
      setAgents(await fetchAgentsAction());
    } catch {
      setError("We couldn't load your bots right now. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  const syncAgentStatuses = useCallback(async () => {
    try {
      const fresh = await fetchAgentsAction();
      setAgents((prev) => {
        const byId = new Map(fresh.map((a) => [a.id, a]));
        const merged = prev.map((a) => {
          const next = byId.get(a.id);
          if (!next) return a;
          if (
            a.status === next.status &&
            a.trialDaysLeft === next.trialDaysLeft
          ) return a;
          return { ...a, status: next.status, trialDaysLeft: next.trialDaysLeft };
        });
        const existingIds = new Set(prev.map((a) => a.id));
        const added = fresh.filter((a) => !existingIds.has(a.id));
        return added.length ? [...merged, ...added] : merged;
      });
    } catch {
      // silent — keep current state, the next tick will retry
    }
  }, []);

  useEffect(() => {
    refreshAgents();
    fetchHasCard().then(setHasCard);
    fetchModelsCatalog().then(setModelsCatalog);
    fetchReferralData().then(setReferral);
  }, [refreshAgents]);

  // Auto-refresh while any agent is still starting
  useEffect(() => {
    const hasStarting = agents.some((a) => a.status === "starting");
    if (!hasStarting) return;
    const interval = setInterval(syncAgentStatuses, 5000);
    return () => clearInterval(interval);
  }, [agents, syncAgentStatuses]);

  const providerNames = Object.keys(modelsCatalog);
  const availableModels = apiProvider ? (modelsCatalog[apiProvider] ?? []) : [];

  const resetForm = () => {
    setPlatform("telegram");
    setBotToken(""); setBotUsername("");
    setDiscordToken("");
    setBotName(""); setSystemPrompt("You are a helpful specialist agent."); setCustomType("");
    setApiProvider(""); setApiKey(""); setAgentModel("");
    setProfileImage(null);
    setSelectedSkillIds([]);
    setError(null);
    setWaStep("form"); setWaAgentId(null); setWaQrData(null); setWaQrError(null);
    setCurrentStep(1);
  };

  const step1Valid = botName.trim().length > 0 && customType.trim().length > 0 && systemPrompt.trim().length > 0;
  const step2Valid = apiProvider.trim().length > 0 && agentModel.trim().length > 0;
  const step3Valid =
    platform === "telegram" ? botToken.trim().length > 0 && botUsername.trim().length > 0 :
      platform === "discord" ? discordToken.trim().length > 0 :
        true;

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const effectiveType = customType.trim().toLowerCase();
      const base = {
        name: botName,
        systemPrompt,
        type: effectiveType,
        skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
        ...(apiProvider.trim() ? { apiProvider: apiProvider.trim() } : {}),
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        ...(agentModel.trim() ? { agentModel: agentModel.trim() } : {}),
        ...(profileImage ? { profileImage } : {}),
      };
      const body =
        platform === "telegram"
          ? { platform, botToken, botUsername, ...base }
          : platform === "discord"
            ? { platform, credentials: { botToken: discordToken }, ...base }
            : { platform, ...base };

      const { ok, data } = await createAgent(body);

      if (!ok) {
        if (data.error === "missing_payment_method") {
          setError(data.message ?? "Add a debit/credit card in Billing before creating an agent.");
          setHasCard(false);
          return;
        }
        setError(data.error ?? "We couldn't add your bot. Please try again.");
        return;
      }

      await refreshAgents();

      if (platform === "whatsapp") {
        const agentId: string = data.agent.id;
        setWaAgentId(agentId);
        setWaStep("qr");

        const linkRes = await startWhatsAppLink(agentId);
        if (!linkRes.ok) {
          setWaQrError(linkRes.error ?? "Failed to start WhatsApp linking. Try again from the agent page.");
          return;
        }

        const poll = setInterval(async () => {
          const d = await pollWhatsAppLink(agentId);
          if (d.status === "qr_ready" && d.qrData) setWaQrData(d.qrData);
          if (d.status === "linked") {
            clearInterval(poll);
            setWaStep("linked");
            await refreshAgents();
            setFeedbackAgentId(agentId);
          }
          if (d.status === "failed") {
            clearInterval(poll);
            setWaQrError("Linking failed. You can retry from the agent page.");
          }
        }, 3000);

        setTimeout(() => {
          clearInterval(poll);
          setWaQrError((prev) => prev ?? "Timed out. You can link WhatsApp from the agent page.");
        }, 5 * 60 * 1000);

        return;
      }

      const createdId: string | undefined = data.agent?.id;
      resetForm();
      setShowModal(false);
      if (createdId) setFeedbackAgentId(createdId);
    } catch {
      setError("Unable to connect. Please check your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Heading */}
      <div style={{ marginBottom: "2.5rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{
            fontFamily: serif, fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
            fontWeight: 600, letterSpacing: "-0.02em",
            color: "var(--foreground)", lineHeight: 1.1, margin: "0 0 6px",
          }}>
            {userName ? `Welcome back, ${userName}.` : "Welcome back."}
          </h1>
          <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", lineHeight: 1.6, letterSpacing: "0.02em", margin: 0 }}>
            agents active — Telegram, Discord &amp; WhatsApp
          </p>
        </div>

        <button
          onClick={async () => { resetForm(); setUserSkills(await fetchUserSkillsAction()); setShowModal(true); }}
          style={{
            background: ACCENT, color: "#fff",
            border: "none", borderRadius: 8, padding: "10px 20px",
            fontFamily: mono, fontSize: 12, fontWeight: 500,
            letterSpacing: "0.06em", textTransform: "uppercase",
            cursor: "pointer",
            display: (hasCard === false && !referral?.freeAgentCredits) ? "none" : undefined,
          }}
        >
          + New Agent
        </button>
      </div>

      {/* Referral banner */}
      {referral && (
        <div style={{
          position: "relative",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          marginBottom: "2rem",
          padding: "1.5rem 1.75rem",
          display: "flex",
          alignItems: "center",
          gap: "2rem",
          flexWrap: "wrap",
          boxShadow: "0 4px 24px rgba(0,0,0,0.02)",
          overflow: "hidden"
        }}>
          
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 style={{ fontFamily: serif, fontSize: "1.35rem", fontWeight: 600, color: "var(--foreground)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
              {referral.freeAgentCredits > 0
                ? `You have ${referral.freeAgentCredits} free credit${referral.freeAgentCredits > 1 ? "s" : ""}.`
                : "Unlock one free month."}
            </h3>
            <p style={{ fontFamily: mono, fontSize: "13px", color: "var(--foreground-3)", margin: 0, lineHeight: 1.5 }}>
              {referral.freeAgentCredits > 0
                ? "Deploy your agent now. No credit card required."
                : "Share your invite link. Every 5 friends who sign up earns you 1 free month for 1 agent."}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, flexShrink: 0, minWidth: 280, maxWidth: "100%" }}>
            {/* Progress Bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: mono, fontSize: "11px", fontWeight: 600, color: "var(--foreground-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Progress
                </span>
                <span style={{ fontFamily: mono, fontSize: "11px", color: "var(--foreground-3)", letterSpacing: "0.1em" }}>
                  {referral.referralCount % 5} / 5
                </span>
              </div>
              <div style={{ display: "flex", gap: "4px", height: "4px" }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const done = i < (referral.referralCount % 5);
                  return (
                    <div key={i} style={{
                      flex: 1,
                      background: done ? ACCENT : "var(--border)",
                      borderRadius: "2px",
                      transition: "background 0.4s ease",
                    }} />
                  );
                })}
              </div>
            </div>

            {/* Link Copy */}
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
              <span style={{ 
                flex: 1, fontFamily: mono, fontSize: "11px", color: "var(--foreground-2)", 
                padding: "10px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" 
              }}>
                {referral.referralCode
                  ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${referral.referralCode}`
                  : "Generating…"}
              </span>
              <button
                onClick={() => {
                  if (!referral.referralCode) return;
                  navigator.clipboard.writeText(`${window.location.origin}/register?ref=${referral.referralCode}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{
                  minWidth: "80px",
                  fontFamily: mono, fontSize: "11px", fontWeight: 600,
                  letterSpacing: "0.05em", textTransform: "uppercase",
                  background: copied ? "transparent" : ACCENT,
                  color: copied ? "var(--foreground-3)" : "#fff",
                  border: "none", borderLeft: "1px solid var(--border)",
                  padding: "10px 16px", cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {Array.from({ length: 3 }).map((_, i) => <AgentCardSkeleton key={i} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {agents.length === 0 && (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "3rem 2rem", textAlign: "center", gridColumn: "1 / -1" }}>
              <p style={{ fontFamily: serif, fontSize: 18, color: "var(--foreground)", fontWeight: 500, margin: "0 0 6px" }}>No agents yet</p>
              <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", margin: 0 }}>Click &quot;New Agent&quot; to connect your first bot.</p>
            </div>
          )}
          {agents.map((ag) => <AgentCard key={ag.id} ag={ag} />)}
        </div>
      )}

      {/* Add Bot Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,22,18,0.4)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div
            style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 600, margin: "1rem", maxHeight: "90vh", overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none", transform: "translateZ(0)", boxShadow: "0 8px 40px rgba(28,22,18,0.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>New Agent</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-3)", padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {waStep === "form" && <StepIndicator currentStep={currentStep} />}

            {waStep === "qr" && (
              <WhatsAppQrStep
                qrData={waQrData}
                qrError={waQrError}
                agentId={waAgentId}
                onSkip={() => { setShowModal(false); resetForm(); }}
              />
            )}

            {waStep === "linked" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "16px 0" }}>
                <div style={{ width: 56, height: 56, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PlatformSvg platform="whatsapp" size={28} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: mono, fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>WhatsApp Linked!</p>
                  <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", lineHeight: 1.6 }}>Your agent is ready to receive and send WhatsApp messages.</p>
                </div>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{ background: "#25D366", border: "none", borderRadius: 8, padding: "10px 28px", fontFamily: mono, fontSize: 12, fontWeight: 500, color: "#fff", cursor: "pointer" }}>
                  Done
                </button>
              </div>
            )}

            {error && waStep === "form" && (
              <div style={{ background: "rgba(255,77,0,0.06)", border: "1px solid rgba(255,77,0,0.3)", borderRadius: 8, padding: "10px 14px", fontFamily: mono, fontSize: 12, color: ACCENT, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAddBot} style={{ display: waStep !== "form" ? "none" : "flex", flexDirection: "column", gap: 14 }}>

              {currentStep === 1 && (
                <>
                  <ProfileImageField profileImage={profileImage} setProfileImage={setProfileImage} setError={setError} />
                  <ModalField label="Agent Name" value={botName} onChange={setBotName} placeholder="e.g. Customer Support" />

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={labelStyle}>Agent Type</label>
                    <input
                      type="text"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 60))}
                      placeholder="e.g. politics, marketing monitoring, agriculture"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={4}
                      placeholder="Describe how the agent should behave..."
                      style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
                    />
                  </div>

                  {userSkills.length > 0 && (
                    <SkillsPicker
                      userSkills={userSkills}
                      selectedSkillIds={selectedSkillIds}
                      setSelectedSkillIds={setSelectedSkillIds}
                    />
                  )}
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={labelStyle}>Provider</label>
                      <select
                        value={apiProvider}
                        onChange={(e) => { setApiProvider(e.target.value); setAgentModel(""); }}
                        style={{ ...inputStyle, cursor: "pointer" }}
                      >
                        <option value="">Select provider...</option>
                        {providerNames.map((p) => (
                          <option key={p} value={p}>{p.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                        ))}
                      </select>
                    </div>
                    <ModalField label="API Key" value={apiKey} onChange={setApiKey} placeholder="sk-..." required={false} />
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={labelStyle}>Agent Model</label>
                      <select
                        value={agentModel}
                        onChange={(e) => setAgentModel(e.target.value)}
                        style={{ ...inputStyle, cursor: "pointer" }}
                        disabled={!apiProvider}
                      >
                        <option value="">{apiProvider ? "Select model..." : "Select a provider first"}</option>
                        {availableModels.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <div>
                    <p style={{ ...labelStyle, marginBottom: 10, display: "block" }}>Choose Platform</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {PLATFORM_OPTIONS.map((p) => {
                        const active = platform === p.value;
                        const ac = PLATFORM_ACTIVE_COLORS[p.value];
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setPlatform(p.value)}
                            style={{
                              background: active ? ac.bg : "var(--surface-2)",
                              border: active ? `1px solid ${ac.border}` : "1px solid var(--border)",
                              borderRadius: 10, padding: "12px 8px",
                              cursor: "pointer",
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                              transition: "all 0.15s",
                            }}
                          >
                            <PlatformSvg platform={p.value} size={22} />
                            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, color: active ? ac.label : "var(--foreground-2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                              {p.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)", marginTop: 8, letterSpacing: "0.02em" }}>
                      {PLATFORM_OPTIONS.find(p => p.value === platform)?.description}
                    </p>
                  </div>

                  {platform === "telegram" && (
                    <>
                      <ModalField label="Bot API Token" value={botToken} onChange={setBotToken} placeholder="Paste token from BotFather" />
                      <ModalField label="Bot Username" value={botUsername} onChange={setBotUsername} placeholder="e.g. my_cool_bot" />
                    </>
                  )}

                  {platform === "discord" && (
                    <ModalField label="Discord Bot Token" value={discordToken} onChange={setDiscordToken} placeholder="Paste token from Discord Developer Portal" />
                  )}

                  {platform === "whatsapp" && (
                    <div style={{ background: "rgba(37,211,102,0.06)", border: "0.5px solid rgba(37,211,102,0.25)", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ flexShrink: 0, marginTop: 1 }}>
                        <PlatformSvg platform="whatsapp" size={20} />
                      </div>
                      <div>
                        <p style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: "#25D366", marginBottom: 4, letterSpacing: "0.04em" }}>No credentials needed</p>
                        <p style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)", lineHeight: 1.6 }}>
                          Your agent will be created immediately. Then scan a QR code with your phone to link WhatsApp.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => (s - 1) as 1 | 2 | 3)}
                    style={{
                      flex: 1, background: "transparent", color: "var(--foreground-2)",
                      border: "1px solid var(--border)", borderRadius: 8, padding: 11,
                      fontFamily: mono, fontSize: 12, fontWeight: 500,
                      letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                )}
                {currentStep < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep === 1 && !step1Valid) { setError("Fill in name, type, and system prompt."); return; }
                      if (currentStep === 2 && !step2Valid) { setError("Select a provider and a model."); return; }
                      setError(null);
                      setCurrentStep((s) => (s + 1) as 1 | 2 | 3);
                    }}
                    style={{
                      flex: 2, background: ACCENT, color: "#fff",
                      border: "none", borderRadius: 8, padding: 11,
                      fontFamily: mono, fontSize: 12, fontWeight: 500,
                      letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer",
                    }}
                  >
                    Next
                  </button>
                )}
                {currentStep === 3 && (
                  <button
                    type="submit"
                    disabled={submitting || !step3Valid}
                    style={{
                      flex: 2,
                      background: submitting || !step3Valid ? "var(--surface-2)" : ACCENT,
                      color: submitting || !step3Valid ? "var(--foreground-3)" : "#fff",
                      border: "none", borderRadius: 8, padding: 11,
                      fontFamily: mono, fontSize: 12, fontWeight: 500,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      cursor: submitting ? "wait" : !step3Valid ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    {submitting ? (
                      <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Creating…</>
                    ) : (
                      `Create ${PLATFORM_OPTIONS.find(p => p.value === platform)?.label} Agent`
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {feedbackAgentId && (
        <FeedbackModal agentId={feedbackAgentId} onClose={() => setFeedbackAgentId(null)} />
      )}

      <OverviewStyles />
    </div>
  );
}

function ProfileImageField({
  profileImage,
  setProfileImage,
  setError,
}: {
  profileImage: string | null;
  setProfileImage: (v: string | null) => void;
  setError: (v: string | null) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={labelStyle}>Profile Image</label>
      <label style={{
        display: "flex", alignItems: "center", gap: 16, width: "100%",
        padding: "14px 16px", borderRadius: 10, cursor: "pointer",
        background: profileImage ? "rgba(255,77,0,0.03)" : "var(--surface-2)",
        border: profileImage ? "1px solid rgba(255,77,0,0.2)" : "1px dashed var(--border)",
        transition: "all 0.15s",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 10, flexShrink: 0,
          background: profileImage ? "transparent" : "rgba(255,77,0,0.08)",
          border: profileImage ? "none" : "1px solid rgba(255,77,0,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profileImage} alt="Agent" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
          ) : (
            <Bot size={20} color={ACCENT} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: "var(--foreground)", margin: "0 0 2px" }}>
            {profileImage ? "Image selected" : "Click to upload"}
          </p>
          <p style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)", margin: 0 }}>
            {profileImage ? "Click to change or use the remove button" : "PNG, JPG or WebP — max 500KB"}
          </p>
        </div>
        {profileImage && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProfileImage(null); }}
            style={{
              fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
              color: "var(--foreground-3)", background: "none",
              border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            Remove
          </button>
        )}
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 500_000) { setError("Image must be under 500KB."); return; }
            const reader = new FileReader();
            reader.onload = () => setProfileImage(reader.result as string);
            reader.readAsDataURL(file);
          }}
        />
      </label>
    </div>
  );
}

function SkillsPicker({
  userSkills,
  selectedSkillIds,
  setSelectedSkillIds,
}: {
  userSkills: UserSkill[];
  selectedSkillIds: string[];
  setSelectedSkillIds: (cb: (prev: string[]) => string[]) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={labelStyle}>
        <Sparkles size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
        Attach Skills
      </label>
      <select
        value=""
        onChange={(e) => {
          const id = e.target.value;
          if (id && !selectedSkillIds.includes(id)) {
            setSelectedSkillIds((prev) => [...prev, id]);
          }
        }}
        style={{ ...inputStyle, cursor: "pointer" }}
      >
        <option value="">Select a skill to add...</option>
        {userSkills
          .filter((s) => !selectedSkillIds.includes(s.id))
          .map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
      </select>
      {selectedSkillIds.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {selectedSkillIds.map((id) => {
            const skill = userSkills.find((s) => s.id === id);
            if (!skill) return null;
            return (
              <span
                key={id}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 6,
                  background: "rgba(255,77,0,0.06)", border: "1px solid rgba(255,77,0,0.2)",
                  fontFamily: mono, fontSize: 11, fontWeight: 500, color: "var(--foreground)",
                }}
              >
                {skill.name}
                <button
                  type="button"
                  onClick={() => setSelectedSkillIds((prev) => prev.filter((i) => i !== id))}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    color: "var(--foreground-3)", fontSize: 14, lineHeight: 1,
                    display: "flex", alignItems: "center",
                  }}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WhatsAppQrStep({
  qrData,
  qrError,
  agentId,
  onSkip,
}: {
  qrData: string | null;
  qrError: string | null;
  agentId: string | null;
  onSkip: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "8px 0" }}>
      <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-2)", textAlign: "center", lineHeight: 1.6 }}>
        Open WhatsApp on your phone → <strong style={{ color: "var(--foreground)" }}>Linked Devices</strong> → <strong style={{ color: "var(--foreground)" }}>Link a Device</strong> → scan this QR
      </p>

      {qrError ? (
        <div style={{ background: "rgba(255,77,0,0.06)", border: "1px solid rgba(255,77,0,0.25)", borderRadius: 8, padding: "10px 14px", fontFamily: mono, fontSize: 12, color: ACCENT, textAlign: "center" }}>
          {qrError}
        </div>
      ) : qrData ? (
        <div style={{ background: "var(--surface)", borderRadius: 12, padding: 10, lineHeight: 0, border: "1px solid var(--border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`}
            alt="WhatsApp QR code"
            width={220}
            height={220}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 0" }}>
          <div style={{ width: 28, height: 28, border: "2px solid #25D366", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)" }}>Starting WhatsApp pairing session…</p>
        </div>
      )}

      {qrData && !qrError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#25D366", animation: "pulse 1.5s ease-in-out infinite" }} />
          <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)" }}>Waiting for scan… QR refreshes every ~60s</p>
        </div>
      )}

      {qrError && agentId && (
        <a href={`/overview/${agentId}`} style={{ fontFamily: mono, fontSize: 12, color: "#25D366", textDecoration: "none" }}>
          Go to agent page to link later
        </a>
      )}

      <button type="button" onClick={onSkip} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 20px", fontFamily: mono, fontSize: 12, color: "var(--foreground-2)", cursor: "pointer" }}>
        Skip for now
      </button>
    </div>
  );
}
