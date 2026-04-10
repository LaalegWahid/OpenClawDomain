const fs = require("fs");
let code = fs.readFileSync("src/feature/skills/components/skills-content.tsx", "utf8");

// We need to:
// 1. Remove the `<div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "2rem", alignItems: "start" }} className="skills-grid">`
// 2. Take the entire left side: "Create Skill Panel" all the way to its closing div before its sibling "Your Skills"
// 3. Move it to the bottom wrapped in a modal conditionally.
// 4. Remove the `<div>` wrapper of right column `Your Skills`.

const startSearch = `      {/* Two-column layout */}\n      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "2rem", alignItems: "start" }} className="skills-grid">\n\n      {/* -- Create Skill panel -- */}\n      <div>`;
// Wait, the terminal shows `── Create Skill panel ──` which in hex is unicode. Let's use robust regex instead of exact literal.

const topRegex = /\s*\{\/\* Two-column layout \*\/\}[\s\S]*?className="skills-grid">\s*\{\/\* .*Create Skill panel.* \*\/\}\s*<div>/;
const middleRegex = /\s*<\/div>\s*\{\/\* .*Your Skills.* \*\/\}\s*<div>/;
const bottomRegex = /\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\;\s*\}/;

const match1 = code.match(topRegex);
const match2 = code.match(middleRegex);

if (match1 && match2) {
  const panelStart = match1.index + match1[0].length;
  const panelEnd = match2.index;
  const panelCode = code.substring(panelStart, panelEnd);
  
  const rightStart = match2.index + match2[0].length;
  let remaining = code.substring(rightStart);
  
  // remaining has the right column code down to the end of the file.
  // Let's strip the last two `</div>`
  
  remaining = remaining.replace(/\s*<\/div>\s*<\/div>\s*\)\;\s*\}\s*$/, "");
  
  const modifiedPanelCode = panelCode.replace(
    /<div style=\{\{\s*marginBottom:\s*16\s*\}\}>[\s\S]*?<\/h2>\s*<p[\s\S]*?<\/p>\s*<\/div>\s*<div style=\{\{\s*background:\s*"#fff"/,
    '<div style={{ background: "transparent"'
  );
  
  const modalCode = `
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(28,22,18,0.4)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, overflowY: "auto", padding: "5vh 1rem" }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: "600px", margin: "auto", boxShadow: "0 8px 40px rgba(28,22,18,0.12)", transform: "translateZ(0)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
               <h2 style={{ fontFamily: serif, fontSize: "20px", fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Create Skill</h2>
               <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-3)", padding: "4px" }}>
                 <X size={18} />
               </button>
            </div>
            <p style={{ fontFamily: mono, fontSize: "11px", color: "var(--foreground-3)", margin: "0 0 16px", letterSpacing: "0.02em" }}>
              Choose creation method: AI generate, manual form, or import from an existing zip.
            </p>
            ${modifiedPanelCode}
          </div>
        </div>
      )}
    </div>
  );
}`;

  let topCode = code.substring(0, match1.index);
  
  const finalCode = topCode + "\n      <div>\n" + remaining + "\n      </div>\n" + modalCode;
  
  fs.writeFileSync("src/feature/skills/components/skills-content.tsx", finalCode);
  console.log("Success");
} else {
  console.log("Could not find regex matches!");
}
