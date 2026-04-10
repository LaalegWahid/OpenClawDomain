const fs = require("fs");
let code = fs.readFileSync("src/feature/skills/components/skills-content.tsx", "utf8");

// Try to parse using regex that ignores line endings
const gridRegex = /\s*\{\/\* Two-column layout \*\/\}[\s\S]*?className="skills-grid">[\s\S]*?\{\/\* .*?Create Skill panel.*? \*\/\}[\s\S]*?<div>([\s\S]*?)<\/div>\s*\{\/\* .*?Your Skills.*? \*\/\}[\s\S]*?<div>([\s\S]*?)<\/div>[\s]*<\/div>[\s]*\n  \);\n\}/m;

const match = code.match(gridRegex);

if (match) {
  const panelContent = match[1];
  let skillsContent = match[2];
  
  const modalCode = `
      {/* Create Skill Modal */}
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
            ${panelContent.replace(/<div style=\{\{\s*marginBottom:\s*16\s*\}\}>[\s\S]*?<\/h2>[\s\S]*?<\/p>\s*<\/div>\s*<div style=\{\{\s*background:\s*"#fff"/g, '\n        <div style={{ background: "transparent"')}
          </div>
        </div>
      )}
  `;

  // remove grid class from skillsContent? Wait, the container to return needs to be just a wrapper.
  const replacement = `
      {/* Your Skills Grid */}
      <div>
${skillsContent}
      </div>
${modalCode}
    </div>
  );
}`;

  code = code.replace(gridRegex, replacement);
  fs.writeFileSync("src/feature/skills/components/skills-content.tsx", code);
} else {
  console.log("No match found for grid!");
}
