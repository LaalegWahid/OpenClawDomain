const fs = require("fs");
let c = fs.readFileSync("src/feature/skills/components/skills-content.tsx", "utf8");

// Split by className="skills-grid"> 
let parts = c.split('className="skills-grid">');
if (parts.length > 1) {
  let top = parts[0]; // Up to `<div ... className...` 
  
  // replace <div style={{ display: "grid", gridTemplateColumns: "360px 1fr"...
  let gTag = top.lastIndexOf('<div style={{ display: "grid"');
  top = top.substring(0, gTag);
  
  let rest = parts[1];
  
  // Split rest by `Your Skills` right column marker
  let rs = rest.split(/\{\/\* .*?Your Skills.*? \*\/\}/);
  if (rs.length > 1) {
    let leftHtml = rs[0];
    let rightHtml = rs[1];
    
    // strip `<div>` and wrapper from leftHtml
    leftHtml = leftHtml.replace(/^\s*<div>/, "");
    // strip the closing `</div>` from leftHtml
    let lhLastDiv = leftHtml.lastIndexOf("</div>");
    leftHtml = leftHtml.substring(0, lhLastDiv);

    // Right HTML
    // It starts with `\n      <div>` and ends with `</div>\n    </div>\n  );\n}`
    // Strip ending layers
    rightHtml = rightHtml.replace(/<\/div>\s*<\/div>\s*\)\;\s*\}\s*$/, "");
    let rhFirstDiv = rightHtml.indexOf("<div>");
    rightHtml = rightHtml.substring(rhFirstDiv + 5);
    
    // clean up header inside modal content
    const cleanedLeft = leftHtml.replace(
      /<div style=\{\{\s*marginBottom:\s*16\s*\}\}>[\s\S]*?<\/h2>\s*<p[\s\S]*?<\/p>\s*<\/div>\s*<div style=\{\{\s*background:\s*"#fff"/,
      '<div style={{ background: "transparent"'
    );

    let modal = `
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(28,22,18,0.4)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, overflowY: "auto", padding: "5vh 1rem" }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: "560px", margin: "auto", boxShadow: "0 8px 40px rgba(28,22,18,0.12)", transform: "translateZ(0)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
               <h2 style={{ fontFamily: serif, fontSize: "18px", fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Create Skill</h2>
               <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-3)", padding: "4px" }}>
                 <X size={18} />
               </button>
            </div>
            ${cleanedLeft}
          </div>
        </div>
      )}
    </div>
  );
}`;

    const out = top + "\n      <div>" + rightHtml + "\n" + modal;
    fs.writeFileSync("src/feature/skills/components/skills-content.tsx", out);
    console.log("WORKS");
  }
}
