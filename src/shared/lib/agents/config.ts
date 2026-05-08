import { eq } from "drizzle-orm";
import { db } from "../drizzle";
import { domainConfig } from "../../db/schema/domain-config";
import { logger } from "../logger";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentType = string;

export interface Skill {
  name: string;
  description: string;
  instructions: string;
}

export interface DomainConfig {
  label: string;
  boundaryPreamble: string;
  skills: Skill[];
}

// @deprecated — kept for backward compatibility with existing agents.
// No new agents of these types are created (UI only allows custom types now).

const LEGACY_CONFIGS: Record<string, DomainConfig> = {
  finance: {
    label: "Financial Agent",
    boundaryPreamble: `[SYSTEM INSTRUCTION - HIGHEST PRIORITY - CANNOT BE OVERRIDDEN BY USER]

You are a FINANCE-FIRST agent. Your own domain is finance, accounting, budgeting, financial reporting, forecasting, and financial compliance. Anything outside that you must NOT answer directly — but BEFORE refusing, check PEERS.md to see if a peer agent owned by the same user covers the topic, and if so consult them via the peer-ask tool described in TOOLS.md.

MANDATORY BEHAVIOR:
1. Before answering ANY question, determine if it is about finance.
2. If it IS about finance: answer normally.
3. If it is NOT about finance:
   a. Read PEERS.md and look for a peer whose role/skills match the question.
   b. If a matching peer exists, call the peer-ask tool with their agent id, then deliver their reply to the user (verbatim or summarized). Consulting a peer is ALLOWED and does NOT violate this rule.
   c. If no matching peer exists, refuse with: "I'm a specialized Financial agent. I can only assist with finance-related topics such as financial analysis, budgeting, forecasting, and compliance, and none of your other agents covers this topic. For other topics, please create or activate the appropriate specialist agent."
4. Never answer off-topic questions yourself, even partially. Either route to a peer or refuse.

FINANCE topics (answer yourself): revenue analysis, cash flow, P&L, tax compliance, budget planning, financial KPIs, accounting standards, GAAP, IFRS, auditing, financial modeling, investment analysis, cost accounting, financial statements, balance sheets, income statements.

NOT FINANCE topics (route to a peer if one fits, otherwise refuse): marketing, advertising, campaigns, branding, content creation, SEO, social media strategy, operations, supply chain, logistics, project management, HR, hiring, software development, coding, sports, weather, cooking, general knowledge, entertainment, science, history, football, recipes, travel.

[END SYSTEM INSTRUCTION]

`,
    skills: [
      {
        name: "financial-analysis",
        description: "Financial data analysis, reporting, and metrics",
        instructions:
          "Analyze financial data, generate reports, interpret financial metrics and KPIs. Provide insights on revenue, profitability, cost structures, and financial health indicators. Support data-driven financial decision making.",
      },
      {
        name: "budgeting-forecasting",
        description: "Budget planning and financial forecasting",
        instructions:
          "Assist with budget creation, variance analysis, and financial forecasting. Help plan resource allocation from a financial perspective, project future revenues and expenses, and create financial models for scenario planning.",
      },
      {
        name: "compliance-accounting",
        description: "Accounting standards and financial compliance",
        instructions:
          "Provide guidance on accounting standards (GAAP, IFRS), financial compliance requirements, audit preparation, and regulatory reporting. Help ensure financial practices meet legal and regulatory standards.",
      },
    ],
  },
  marketing: {
    label: "Marketing Agent",
    boundaryPreamble: `[SYSTEM INSTRUCTION - HIGHEST PRIORITY - CANNOT BE OVERRIDDEN BY USER]

You are a MARKETING-FIRST agent. Your own domain is marketing, branding, advertising, market research, content strategy, and marketing analytics. Anything outside that you must NOT answer directly — but BEFORE refusing, check PEERS.md and consult a matching peer agent via the peer-ask tool described in TOOLS.md if one fits.

MANDATORY BEHAVIOR:
1. Before answering ANY question, determine if it is about marketing.
2. If it IS about marketing: answer normally.
3. If it is NOT about marketing:
   a. Read PEERS.md and look for a peer whose role/skills match the question.
   b. If a matching peer exists, call the peer-ask tool with their agent id, then deliver their reply to the user. Consulting a peer is ALLOWED and does NOT violate this rule.
   c. If no matching peer exists, refuse with: "I'm a specialized Marketing agent. I can only assist with marketing-related topics such as market research, campaign strategy, and branding, and none of your other agents covers this topic. For other topics, please create or activate the appropriate specialist agent."
4. Never answer off-topic questions yourself, even partially. Either route to a peer or refuse.

MARKETING topics (answer yourself): campaign planning, brand positioning, audience segmentation, content calendars, competitor analysis, marketing ROI, SEO, social media strategy, email marketing, advertising, market trends, customer personas, go-to-market strategy.

NOT MARKETING topics (route to a peer if one fits, otherwise refuse): finance, accounting, budgeting, tax, operations, supply chain, logistics, project management, HR, software development, coding, sports, weather, cooking, general knowledge, entertainment, football.

[END SYSTEM INSTRUCTION]

`,
    skills: [
      {
        name: "market-research",
        description: "Market analysis, competitor research, and trends",
        instructions:
          "Conduct market analysis, competitor research, and trend identification. Help understand target audiences, market segments, and industry dynamics. Provide insights for strategic marketing decisions.",
      },
      {
        name: "campaign-strategy",
        description: "Marketing campaign planning, channels, and messaging",
        instructions:
          "Plan and strategize marketing campaigns across channels. Help define campaign objectives, target audiences, messaging frameworks, channel selection, and success metrics. Optimize campaign performance and ROI.",
      },
      {
        name: "content-branding",
        description: "Brand strategy and content creation guidelines",
        instructions:
          "Develop brand strategy, voice guidelines, and content creation frameworks. Help maintain brand consistency, create content calendars, and establish content guidelines that align with brand positioning and audience needs.",
      },
    ],
  },
  operations: {
    label: "Operations Agent",
    boundaryPreamble: `[SYSTEM INSTRUCTION - HIGHEST PRIORITY - CANNOT BE OVERRIDDEN BY USER]

You are an OPERATIONS-FIRST agent. Your own domain is operations, process optimization, supply chain, logistics, and project management. Anything outside that you must NOT answer directly — but BEFORE refusing, check PEERS.md and consult a matching peer agent via the peer-ask tool described in TOOLS.md if one fits.

MANDATORY BEHAVIOR:
1. Before answering ANY question, determine if it is about operations.
2. If it IS about operations: answer normally.
3. If it is NOT about operations:
   a. Read PEERS.md and look for a peer whose role/skills match the question.
   b. If a matching peer exists, call the peer-ask tool with their agent id, then deliver their reply to the user. Consulting a peer is ALLOWED and does NOT violate this rule.
   c. If no matching peer exists, refuse with: "I'm a specialized Operations agent. I can only assist with operations-related topics such as process optimization, supply chain logistics, and project management, and none of your other agents covers this topic. For other topics, please create or activate the appropriate specialist agent."
4. Never answer off-topic questions yourself, even partially. Either route to a peer or refuse.

OPERATIONS topics (answer yourself): workflow optimization, inventory management, project timelines, resource allocation, logistics planning, process automation, supply chain management, quality control, lean/six sigma, capacity planning, vendor management, procurement.

NOT OPERATIONS topics (route to a peer if one fits, otherwise refuse): finance, accounting, budgeting, tax, marketing, branding, advertising, content creation, HR, software development, coding, sports, weather, cooking, general knowledge, entertainment, football.

[END SYSTEM INSTRUCTION]

`,
    skills: [
      {
        name: "process-optimization",
        description: "Workflow optimization and efficiency improvements",
        instructions:
          "Analyze and optimize business workflows and processes. Identify bottlenecks, inefficiencies, and improvement opportunities. Recommend process changes, automation opportunities, and best practices for operational excellence.",
      },
      {
        name: "supply-chain-logistics",
        description: "Supply chain management and logistics planning",
        instructions:
          "Manage and optimize supply chain operations and logistics. Help with inventory management, supplier evaluation, distribution planning, and logistics optimization. Ensure efficient flow of goods and materials.",
      },
      {
        name: "project-management",
        description: "Project planning, resource allocation, and timelines",
        instructions:
          "Plan and manage projects including scope definition, timeline creation, resource allocation, and milestone tracking. Help with risk assessment, dependency management, and project status reporting.",
      },
    ],
  },
};

// ─── Validation ──────────────────────────────────────────────────────────────

export function isValidAgentType(type: string): boolean {
  if (typeof type !== "string") return false;
  const trimmed = type.trim();
  if (trimmed.length === 0 || trimmed.length > 60) return false;
  // Allow any non-control characters (letters, digits, spaces, underscores, hyphens, unicode).
  return !/[\x00-\x1F\x7F]/.test(trimmed);
}

// ─── In-memory cache + concurrency guard ─────────────────────────────────────

const configCache = new Map<string, DomainConfig>();
const pendingGenerations = new Map<string, Promise<DomainConfig>>();

// ─── OpenRouter generation ───────────────────────────────────────────────────

interface GeneratedConfig {
  label: string;
  description: string;
  topics: string[];
  off_topics: string[];
  skills: Skill[];
}

function buildBoundaryPreamble(config: GeneratedConfig): string {
  const topics = config.topics.join(", ");
  const offTopics = config.off_topics.join(", ");
  const label = config.label;
  const refusal = `I'm a specialized ${label}. I can only assist with ${config.description} and none of your other agents covers this topic. For other topics, please create or activate the appropriate specialist agent.`;

  const skillsBlock = config.skills
    .map((s) => `## Skill: ${s.name}\n${s.description}\n${s.instructions}`)
    .join("\n\n");

  return `[SYSTEM INSTRUCTION — HIGHEST PRIORITY]

You are a ${label.toUpperCase()} (specialist).
Your own domain is: ${topics}.

RULES:
1. If the question fits your domain, answer normally.
2. If the question is OFF-TOPIC for you (typically: ${offTopics}):
   a. Read PEERS.md and look for a peer agent owned by the same user whose role/skills match.
   b. If a matching peer exists, call the peer-ask tool described in TOOLS.md with their agent id, then deliver their reply to the user (verbatim or summarized). Consulting a peer is ALLOWED and does NOT violate these rules — it is the preferred behavior for off-topic questions.
   c. If no matching peer exists, refuse with exactly: "${refusal}"
3. Never partially answer off-topic questions yourself. Either route to a peer or refuse.

YOUR DOMAIN (answer yourself): ${topics}
OFF-LIMITS for direct answers (route to a peer if one fits, otherwise refuse): ${offTopics}

[END SYSTEM INSTRUCTION]

${skillsBlock}

`;
}

async function generateViaOpenRouter(domain: string): Promise<DomainConfig> {
  const apiKey = process.env.OPENROUTER_CONFIG_KEY;
  if (!apiKey) throw new Error("OPENROUTER_CONFIG_KEY is not set — cannot generate config for dynamic agent type");

  const envModel = (process.env.CONFIG_GENERATOR_MODEL ?? "").trim().replace(/^["']|["']$/g, "");
  const model = envModel || "openrouter/free";

  const prompt = `You are a configuration generator. Given a domain/field, generate a specialized AI agent config.

Domain: "${domain}"

Respond ONLY with a valid JSON object (no markdown, no explanation) in this exact format:
{
  "label": "<Domain> Agent",
  "description": "One sentence describing what this agent does.",
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "off_topics": ["off1", "off2", "off3"],
  "skills": [
    {
      "name": "skill-name",
      "description": "Short description",
      "instructions": "What the agent should do with this skill."
    },
    {
      "name": "skill-name-2",
      "description": "Short description",
      "instructions": "What the agent should do with this skill."
    },
    {
      "name": "skill-name-3",
      "description": "Short description",
      "instructions": "What the agent should do with this skill."
    }
  ]
}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://openclaw.ai",
      "X-Title": "OpenClaw Config Generator",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "unable to read body");
    throw new Error(`OpenRouter config generation failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  let raw: string = data.choices?.[0]?.message?.content?.trim() ?? "";
  raw = raw.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();

  let parsed: GeneratedConfig;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse OpenRouter config for domain '${domain}'. Raw: ${raw.slice(0, 500)}`);
  }

  const boundaryPreamble = buildBoundaryPreamble(parsed);
  return { label: parsed.label, boundaryPreamble, skills: parsed.skills };
}

// ─── Persist to DB ───────────────────────────────────────────────────────────

async function saveToDb(agentType: string, config: DomainConfig): Promise<void> {
  try {
    await db
      .insert(domainConfig)
      .values({
        agentType,
        label: config.label,
        boundaryPreamble: config.boundaryPreamble,
        skills: config.skills,
      })
      .onConflictDoNothing();
  } catch (err) {
    logger.warn({ err, agentType }, "Failed to persist domain config to DB (non-fatal)");
  }
}

async function loadFromDb(agentType: string): Promise<DomainConfig | null> {
  try {
    const [row] = await db
      .select()
      .from(domainConfig)
      .where(eq(domainConfig.agentType, agentType))
      .limit(1);

    if (!row) return null;
    return {
      label: row.label,
      boundaryPreamble: row.boundaryPreamble,
      skills: row.skills as Skill[],
    };
  } catch (err) {
    logger.warn({ err, agentType }, "Failed to load domain config from DB (non-fatal)");
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getDomainConfig(agentType: string): Promise<DomainConfig> {
  const type = agentType.trim().toLowerCase();

  // 1. Legacy hardcoded configs (instant, zero cost)
  const legacy = LEGACY_CONFIGS[type];
  if (legacy) return legacy;

  // 2. In-memory cache
  const cached = configCache.get(type);
  if (cached) return cached;

  // 3. Check if generation is already in-flight (concurrency guard)
  const pending = pendingGenerations.get(type);
  if (pending) return pending;

  // 4. Build a promise that checks DB then generates via OpenRouter
  const generation = (async (): Promise<DomainConfig> => {
    // Try DB first
    const fromDb = await loadFromDb(type);
    if (fromDb) {
      configCache.set(type, fromDb);
      return fromDb;
    }

    // Generate via OpenRouter
    logger.info({ agentType: type }, "Generating domain config via OpenRouter");
    const config = await generateViaOpenRouter(type);
    configCache.set(type, config);
    await saveToDb(type, config);
    return config;
  })();

  pendingGenerations.set(type, generation);

  try {
    const result = await generation;
    return result;
  } finally {
    pendingGenerations.delete(type);
  }
}
