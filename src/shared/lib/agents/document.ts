import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export function detectDocumentRequest(userMessage: string): "pdf" | null {
  const lower = userMessage.toLowerCase();
  const keywords = [
    "create a document", "create a report", "create a file",
    "generate a document", "generate a report", "generate a file",
    "make a document", "make a report", "make a file",
    "give me a document", "give me a report", "give me a file",
    "write a document", "write a report",
    "send me a document", "send me a report", "send me a file",
    "as a pdf", "as pdf", "in pdf", "pdf file", "pdf document", "pdf report",
    "as a file", "as a document", "export as", "download as",
    "prepare a report", "prepare a document",
  ];
  for (const kw of keywords) {
    if (lower.includes(kw)) return "pdf";
  }
  return null;
}

export function extractFilename(userMessage: string, agentType: string): string {
  const lower = userMessage.toLowerCase();
  const subjects = ["report", "analysis", "forecast", "budget", "statement", "summary", "overview", "plan", "strategy", "review"];
  for (const s of subjects) {
    if (lower.includes(s)) return `${agentType}-${s}`;
  }
  return `${agentType}-document`;
}

/**
 * Injected as role: "developer" — OpenClaw appends this to the system prompt,
 * so the model treats it as operator-level instruction. Confirmed in docs:
 * "system and developer are appended to the system prompt."
 *
 * This prevents the agent hallucinating file-save operations or refusing
 * because it thinks it needs to write a file itself.
 */
export function buildDocumentSystemInstruction(agentType: string): string {
  return `[DOCUMENT GENERATION MODE — OPERATOR INSTRUCTION]
For this request only, produce a standalone written document.

RULES:
1. Output ONLY the document content. Nothing before it, nothing after it.
2. First line: the document title as plain text (no # prefix, no bold).
3. Use ## for main sections, ### for sub-sections.
4. Use - for bullet points. Use **bold** for key figures and terms.
5. Include an Executive Summary near the top and a Conclusion at the end.

FORBIDDEN — do not write:
- "I have created / generated / saved / written this"
- "Here is your report" or any preamble
- Any mention of PDF, files, saving, or exporting
- "Let me know if you need changes" or closing offers

Your domain restrictions (${agentType} topics only) remain fully active.
You are the document. Begin.`;
}

export function rewriteAsContentPrompt(userMessage: string): string {
  let core = userMessage
    .replace(/\b(create|generate|make|write|prepare|give me|send me|export|download)\b\s+(a\s+)?(pdf\s+)?(document|report|file|analysis|summary|overview|plan|strategy|forecast|budget|statement|review)\s+(of|on|for|about)?\s*/gi, "")
    .replace(/\b(as\s+a?\s+pdf|in\s+pdf|pdf\s+format|as\s+a?\s+file|as\s+a?\s+document)\b/gi, "")
    .trim();

  if (core.length < 8) core = "the relevant topic";

  return `Write a comprehensive, well-structured professional report on: ${core}

Include: an executive summary, clearly separated ## sections, specific details and analysis, and a conclusion.`;
}

export function stripConversationalFiller(text: string): string {
  return text
    .replace(/I(?:'ve| have) (?:created|generated|saved|written|prepared|made)[^.!?\n]*[.!?]/gi, "")
    .replace(/^Here(?:'s| is)(?: your| the| a)?.{0,80}[:\n]/gim, "")
    .replace(/I(?:'ll| will)(?: now)? (?:create|generate|write|prepare)[^.!?\n]*[.!?]/gi, "")
    .replace(/Would you like[^?]*\?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isUsableContent(text: string): boolean {
  return text.length >= 200 && text.includes("\n");
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

/**
 * Replace non-Latin-1 characters that pdf-lib's StandardFonts can't render.
 */
function sanitizeForPdf(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D\u201E]/g, '"')   // smart double quotes
    .replace(/[\u2013\u2014]/g, "-")          // en/em dashes
    .replace(/\u2026/g, "...")                // ellipsis
    .replace(/\u2022/g, "*")                  // bullet
    .replace(/[\u00A0]/g, " ")               // non-breaking space
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\xFF]/g, "");            // drop anything else outside Latin-1
}

export async function generatePdf(content: string, title: string, agentType: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const safeTitle = sanitizeForPdf(title);
  const safeContent = sanitizeForPdf(content);

  doc.setTitle(safeTitle);
  doc.setAuthor(`${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent`);
  doc.setCreator("OpenClaw Agent Platform");

  const accentColor =
    agentType === "finance" ? rgb(0.18, 0.49, 0.20)
    : agentType === "marketing" ? rgb(0.08, 0.40, 0.75)
    : rgb(0.90, 0.32, 0.00);

  const PAGE_W = 595.28, PAGE_H = 841.89, MARGIN = 60;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const LINE_H = 16, FONT_SIZE = 11;
  const H = { h1: 20, h2: 16, h3: 13 };

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Top accent bar
  page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: accentColor });
  y -= 10;

  // Title
  const tw = fontBold.widthOfTextAtSize(safeTitle, 22);
  page.drawText(safeTitle, { x: Math.max(MARGIN, (PAGE_W - tw) / 2), y, size: 22, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 28;

  // Subtitle
  const sub = `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent  •  ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
  const sw = font.widthOfTextAtSize(sub, 10);
  page.drawText(sub, { x: Math.max(MARGIN, (PAGE_W - sw) / 2), y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 20;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 24;

  function newPage() {
    addFooter(page, doc.getPageCount());
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN + 40) newPage();
  }

  function addFooter(p: typeof page, num: number) {
    const ft = `Generated by OpenClaw ${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent  •  Page ${num}`;
    const fw = font.widthOfTextAtSize(ft, 8);
    p.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_W - MARGIN, y: 42 }, thickness: 0.3, color: rgb(0.85, 0.85, 0.85) });
    p.drawText(ft, { x: Math.max(MARGIN, (PAGE_W - fw) / 2), y: 28, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
  }

  function wrap(text: string, f: typeof font, size: number, maxW: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > maxW) { if (cur) lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }

  for (const line of safeContent.split("\n")) {
    const t = line.trim();
    if (!t) { y -= LINE_H * 0.6; continue; }
    const clean = t.replace(/\*\*/g, "");

    if (t.startsWith("### ")) {
      ensureSpace(H.h3 + 12); y -= 8;
      page.drawText(clean.replace(/^###\s*/, ""), { x: MARGIN, y, size: H.h3, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
      y -= H.h3 + 6;
    } else if (t.startsWith("## ")) {
      ensureSpace(H.h2 + 14); y -= 12;
      page.drawRectangle({ x: MARGIN - 8, y: y - 2, width: 3, height: H.h2 + 2, color: accentColor });
      page.drawText(clean.replace(/^##\s*/, ""), { x: MARGIN, y, size: H.h2, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      y -= H.h2 + 8;
    } else if (t.startsWith("# ")) {
      ensureSpace(H.h1 + 16); y -= 14;
      page.drawText(clean.replace(/^#\s*/, ""), { x: MARGIN, y, size: H.h1, font: fontBold, color: rgb(0.05, 0.05, 0.05) });
      y -= H.h1 + 6;
    } else if (t.startsWith("---")) {
      y -= 8;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.4, color: rgb(0.85, 0.85, 0.85) });
      y -= 12;
    } else if (t.startsWith("* ") || t.startsWith("- ")) {
      const bt = clean.replace(/^[*-]\s+/, "");
      const wrapped = wrap(bt, font, FONT_SIZE, CONTENT_W - 20);
      for (let i = 0; i < wrapped.length; i++) {
        ensureSpace(LINE_H);
        if (i === 0) page.drawCircle({ x: MARGIN + 6, y: y + 3, size: 2, color: accentColor });
        page.drawText(wrapped[i], { x: MARGIN + 16, y, size: FONT_SIZE, font, color: rgb(0.2, 0.2, 0.2) });
        y -= LINE_H;
      }
    } else {
      const bold = t.startsWith("**") && t.endsWith("**");
      for (const wl of wrap(clean, bold ? fontBold : font, FONT_SIZE, CONTENT_W)) {
        ensureSpace(LINE_H);
        page.drawText(wl, { x: MARGIN, y, size: FONT_SIZE, font: bold ? fontBold : font, color: rgb(0.2, 0.2, 0.2) });
        y -= LINE_H;
      }
    }
  }

  addFooter(page, doc.getPageCount());
  return Buffer.from(await doc.save());
}