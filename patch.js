const fs = require("fs");
let code = fs.readFileSync("src/feature/skills/components/skills-content.tsx", "utf8");

code = code.replace(
  "Archive, Folder, File as FileIcon } from \"lucide-react\";",
  "Archive, Folder, File as FileIcon, X } from \"lucide-react\";"
);

code = code.replace(
  "const [deleting, setDeleting] = useState<string | null>(null);",
  "const [deleting, setDeleting] = useState<string | null>(null);\n  const [showModal, setShowModal] = useState(false);"
);

code = code.replace(
  "setAiDraft(null);\n      fetchSkills();",
  "setAiDraft(null);\n      setShowModal(false);\n      fetchSkills();"
);

code = code.replace(
  "setName(\"\");\n      setDescription(\"\");\n      setInstructions(\"\");\n      fetchSkills();",
  "setName(\"\");\n      setDescription(\"\");\n      setInstructions(\"\");\n      setShowModal(false);\n      fetchSkills();"
);

code = code.replace(
  "setImportDraft(null);\n      setArchiveFile(null);\n      setExtractedFiles([]);\n      fetchSkills();",
  "setImportDraft(null);\n      setArchiveFile(null);\n      setExtractedFiles([]);\n      setShowModal(false);\n      fetchSkills();"
);

// We need to cut out the "Create Skill" left column and wrap it in the modal.
// We also need to change the top div to include the button.
// The file has `<div style={{ marginBottom: "2rem" }}>` for the header
let headerRegex = /<div style=\{\{ marginBottom: "2rem" \}\}>([\s\S]*?)<\/div>/;
let newHeader = `<div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)", margin: "0 0 6px", lineHeight: 1.1 }}>Skills</h1>
          <p style={{ fontFamily: mono, fontSize: "12px", color: "var(--foreground-3)", margin: 0, letterSpacing: "0.02em" }}>
            Build, import, or generate reusable skills for your agents.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: "#FF4D00", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontFamily: mono, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}
        >
          <Sparkles size={14} /> New Skill
        </button>
      </div>`;

code = code.replace(headerRegex, newHeader);

// The main grid replacement
// Left column (Create Skill) is `<div> \n <div style={{ marginBottom: 16 }}> ... \n {/* -- Your Skills (right column) -- */}`
const leftColStart = `      {/* Two-column layout */}\n      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "2rem", alignItems: "start" }} className="skills-grid">\n\n      {/* -- Create Skill panel -- */}\n      <div>`;
const rightColStart = `      </div>\n\n      {/* -- Your Skills (right column) -- */}\n      <div>`;

const leftColIdx = code.indexOf(leftColStart);
const rightColIdx = code.indexOf(rightColStart);

if (leftColIdx > -1 && rightColIdx > -1) {
  const panelContent = code.substring(leftColIdx + leftColStart.length, rightColIdx);
  
  // Create Modal code
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
               <h2 style={{ fontFamily: serif, fontSize: "20px", fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Create Skill</h2>
               <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-3)", padding: "4px" }}>
                 <X size={18} />
               </button>
            </div>
            
            <p style={{ fontFamily: mono, fontSize: "11px", color: "var(--foreground-3)", margin: "0 0 16px", letterSpacing: "0.02em" }}>
              Choose creation method: AI generate, manual form, or import from an existing zip.
            </p>
            ${panelContent.replace(/<div style={{ marginBottom: 16 }}>([\s\S]*?)<\/h2>.*?<\/p>([\s\S]*?)<\/div>\s*<div style={{ background: "#fff"/g, '\n        <div style={{ background: "transparent" ')}
          </div>
        </div>
      )}
  `;

  // The new grid layout will just be the single column
  const endDivIdx = code.indexOf('    </div>\n  );\n}');
  
  let restOfRightCol = code.substring(rightColIdx + rightColStart.length, endDivIdx);
  // remove the trailing </div> from the wrapping grid 
  restOfRightCol = restOfRightCol.replace(/      <\/div>\n$/, '');
  
  const bottomCode = `      {/* Your Skills Grid */}\n      <div>\n${restOfRightCol}\n      </div>\n${modalCode}\n    </div>\n  );\n}`;
  
  code = code.substring(0, leftColIdx) + bottomCode;
}

fs.writeFileSync("src/feature/skills/components/skills-content.tsx", code);
