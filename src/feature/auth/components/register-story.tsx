"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RegisterForm } from "./register-form";
import { serif, mono } from "./shared/constants";

const SLIDE_DURATION = 2000;
const ACCENT = "#FF4D00";
const BG      = "#f8f2ed";
const INK     = "#2a1f19";
const MUTED   = "#8a7060";
const BORDER  = "rgba(42,31,25,0.12)";

const Gradient = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    background: "linear-gradient(135deg, #FF4D00 0%, #ff8c00 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    color: "transparent",
  }}>
    {children}
  </span>
);

const slides = [
  {
    num: "01",
    eyebrow: "Launch Fast",
    line1: <>Deploy your <Gradient>agent</Gradient></>,
    line2: "in less than 2 minutes.",
    italic: true,
  },
  {
    num: "02",
    eyebrow: "Limitless",
    line1: <>Add any <Gradient>skill</Gradient></>,
    line2: "you want to the agent.",
    italic: true,
  },
  {
    num: "03",
    eyebrow: "Rewards",
    line1: "Bring 5 customers,",
    line2: <>get one <Gradient>free month</Gradient>.</>,
    italic: true,
  },
];

/* ── Dot-grid canvas background ── */
function DotGrid() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gap = 28;
      ctx.fillStyle = "rgba(42,31,25,0.055)";
      for (let x = gap; x < canvas.width; x += gap) {
        for (let y = gap; y < canvas.height; y += gap) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

/* ── Floating Claws Background ── */
const clawPositions = [
  // Dramatic Foreground (Huge, out of focus)
  { t: '90%',  l: '95%',  s: 700, r: -25,  o: 0.16 },
  { t: '-5%',  l: '-10%', s: 600, r: 40,   o: 0.14 },
  { t: '95%',  l: '5%',   s: 550, r: 65,   o: 0.12 },

  // Midground (Framing the text gracefully)
  { t: '20%',  l: '85%',  s: 260, r: -15,  o: 0.18 },
  { t: '80%',  l: '20%',  s: 240, r: -50,  o: 0.16 },
  { t: '40%',  l: '95%',  s: 220, r: 15,   o: 0.14 },
  { t: '50%',  l: '-5%',  s: 230, r: 80,   o: 0.16 },
  { t: '15%',  l: '25%',  s: 180, r: -35,  o: 0.12 },
  { t: '75%',  l: '75%',  s: 190, r: 45,   o: 0.14 },

  // Background (Distant, slow moving)
  { t: '30%',  l: '60%',  s: 120, r: -70,  o: 0.08 },
  { t: '65%',  l: '35%',  s: 140, r: 25,   o: 0.09 },
  { t: '10%',  l: '55%',  s: 110, r: 10,   o: 0.07 },
  { t: '55%',  l: '85%',  s: 130, r: -80,  o: 0.08 },
  { t: '85%',  l: '45%',  s: 100, r: 55,   o: 0.06 },
];

function FloatingClaws({ activeSlide, isForm }: { activeSlide: number, isForm: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slideRef = useRef(activeSlide);
  const isFormRef = useRef(isForm);

  slideRef.current = activeSlide;
  isFormRef.current = isForm;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let startTime = 0;
    let lastDraw = 0;
    const FRAME_INTERVAL = 1000 / 45; // ultra-smooth 45fps cap

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const img = new window.Image();
    img.src = '/images/claw-hero-1.webp';

    const draw = (timestamp: number) => {
      rafId = requestAnimationFrame(draw);
      if (timestamp - lastDraw < FRAME_INTERVAL) return;
      lastDraw = timestamp;
      if (!startTime) startTime = timestamp;

      const t = (timestamp - startTime) / 1000;
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const aspectH = iw > 0 ? ih / iw : 1;

      ctx.clearRect(0, 0, cw, ch);

      const globalAlphaMult = isFormRef.current ? 0.15 : 1;
      const sizeMul = cw < 640 ? 0.6 : cw < 900 ? 0.8 : 1;

      for (let i = 0; i < clawPositions.length; i++) {
        const m = clawPositions[i];
        const baseS = m.s * sizeMul;
        
        // Organic breathing effect
        const s = baseS + Math.sin(t * 0.4 + i) * (baseS * 0.04);
        
        // Continuous elegant rotation
        const rot = (m.r * (Math.PI / 180)) + (t * 0.03 * (i % 2 === 0 ? 1 : -1));
        
        // Smooth floating drift
        const driftX = Math.cos(t * 0.15 + i * 2) * (baseS * 0.15);
        const driftY = Math.sin(t * 0.2 + i * 2) * (baseS * 0.15);

        const cx = (parseFloat(m.l) / 100) * cw + driftX;
        const cy = (parseFloat(m.t) / 100) * ch + driftY;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        
        // True macro photography depth-of-field
        if (m.s >= 500) {
          // Foreground: Very blurred, passing near camera
          ctx.filter = 'blur(12px)';
          ctx.globalAlpha = m.o * globalAlphaMult * 0.85;
        } else if (m.s >= 180) {
          // Midground: Slightly out of focus, frames the text nicely
          ctx.filter = 'blur(3px)';
          ctx.globalAlpha = m.o * globalAlphaMult * 1.1;
        } else {
          // Background: Sharper but distant and faint
          ctx.filter = 'blur(1px)';
          ctx.globalAlpha = m.o * globalAlphaMult * 1.4;
        }
        
        ctx.drawImage(img, -s / 2, -(s * aspectH) / 2, s, s * aspectH);
        ctx.restore();
      }
    };

    img.onload = () => {
      rafId = requestAnimationFrame(draw);
    };

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []); // Empty dependency array ensures it never reloads

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', userSelect: 'none',
        zIndex: 0,
        opacity: isForm ? 0.5 : 1,
        transition: 'opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  );
}

export function RegisterStory() {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") ?? undefined;

  const [index, setIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [pageFading, setPageFading] = useState(false);
  const [textFading, setTextFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function transitionTo(next: number | "form") {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (next === "form") {
      setPageFading(true);
      setTimeout(() => {
        setShowForm(true);
        setPageFading(false);
      }, 200);
    } else {
      setTextFading(true);
      setTimeout(() => {
        setIndex(next);
        setTextFading(false);
      }, 200);
    }
  }

  useEffect(() => {
    if (showForm) return;
    timerRef.current = setTimeout(
      () => transitionTo(index < slides.length - 1 ? index + 1 : "form"),
      SLIDE_DURATION,
    );
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [index, showForm]);

  /* ── Form view ── */
  if (showForm) {
    return (
      <div style={{
        minHeight: "100vh", background: BG,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "1.5rem", position: "relative",
        opacity: pageFading ? 0 : 1,
        transition: "opacity 0.4s ease",
      }}>
        <DotGrid />
        <FloatingClaws activeSlide={index} isForm={true} />
        <div style={{ position: "relative", width: "100%", maxWidth: "480px", zIndex: 1 }}>
          <RegisterForm referralCode={referralCode} />
        </div>
      </div>
    );
  }

  const slide = slides[index];

  return (
    <div style={{
      minHeight: "100vh", background: BG,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "2rem", position: "relative", overflow: "hidden",
      opacity: pageFading ? 0 : 1,
      transition: "opacity 0.4s cubic-bezier(0.4,0,0.2,1)",
    }}>

      <DotGrid />
      <FloatingClaws activeSlide={index} isForm={false} />

      {/* Warm center glow — very subtle */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: "700px", height: "500px",
        transform: "translate(-50%,-50%)",
        background: `radial-gradient(ellipse, rgba(255,100,40,0.07) 0%, transparent 65%)`,
        pointerEvents: "none", zIndex: 1,
      }} />

      {/* Logo — top left */}
      <div style={{
        position: "absolute", top: "2rem", left: "2rem",
        display: "flex", alignItems: "center", gap: "9px",
        zIndex: 10,
        opacity: 0,
        animation: "storyFadeUp 0.5s ease forwards",
        animationDelay: "0.1s",
      }}>
        <svg width="26" height="26" viewBox="0 0 56 56" fill="none">
          <rect width="56" height="56" rx="13" fill={ACCENT} />
          <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
          <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
          <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
        </svg>
        <span style={{ fontFamily: serif, fontSize: "17px", fontWeight: 600, color: INK, letterSpacing: "-0.01em" }}>
          Open<span style={{ color: ACCENT }}>Claw</span>
        </span>
      </div>

      {/* Skip */}
      <button
        onClick={() => transitionTo("form")}
        style={{
          position: "absolute", top: "2rem", right: "2rem",
          fontFamily: mono, fontSize: "11px", fontWeight: 500,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: MUTED, background: "none",
          border: `1px solid ${BORDER}`, borderRadius: "6px",
          padding: "7px 16px", cursor: "pointer",
          transition: "color 0.2s, border-color 0.2s",
          zIndex: 10,
          opacity: 0,
          animation: "storyFadeUp 0.5s ease forwards",
          animationDelay: "0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = INK;
          e.currentTarget.style.borderColor = "rgba(42,31,25,0.35)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = MUTED;
          e.currentTarget.style.borderColor = BORDER;
        }}
      >
        Skip →
      </button>

      {/* Slide content — key resets all animations on change */}
      <div
        key={`slide-${index}`}
        style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", textAlign: "center",
          position: "relative", zIndex: 2,
          maxWidth: "820px", width: "100%",
          opacity: textFading ? 0 : 1,
          transform: textFading ? "translateY(-15px)" : "translateY(0)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        {/* Line 1 — slides up from mask */}
        <div style={{ overflow: "hidden", paddingBottom: "0.15em" }}>
          <h1 style={{
            fontFamily: serif,
            fontSize: "clamp(3rem, 8vw, 6.5rem)",
            fontWeight: 600,
            letterSpacing: "-0.035em",
            color: INK,
            lineHeight: 1.2,
            margin: 0,
            transform: "translateY(110%)",
            animation: "storySlideLine 0.85s cubic-bezier(0.16,1,0.3,1) forwards",
            animationDelay: "0.12s",
          }}>
            {slide.line1}
          </h1>
        </div>

        {/* Line 2 — slightly delayed */}
        <div style={{ overflow: "hidden", paddingBottom: "0.15em", marginBottom: "2rem" }}>
          <h1 style={{
            fontFamily: serif,
            fontSize: "clamp(3rem, 8vw, 6.5rem)",
            fontWeight: 600,
            letterSpacing: "-0.035em",
            color: INK,
            lineHeight: 1.2,
            margin: 0,
            fontStyle: slide.italic ? "italic" : "normal",
            transform: "translateY(110%)",
            animation: "storySlideLine 0.85s cubic-bezier(0.16,1,0.3,1) forwards",
            animationDelay: "0.28s",
          }}>
            {slide.line2}
          </h1>
        </div>
      </div>

      {/* Progress */}
      <div style={{
        position: "absolute", bottom: "3rem",
        display: "flex", gap: "16px", alignItems: "center",
        zIndex: 10,
      }}>
        {slides.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === index ? "48px" : "32px",
              height: "1px",
              background: i < index ? INK : BORDER,
              position: "relative",
              transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease",
            }}
          >
            {i === index && (
              <div
                key={`bar-${index}`}
                style={{
                  position: "absolute", inset: 0,
                  background: INK,
                  transformOrigin: "left",
                  transform: "scaleX(0)",
                  animation: `storyBarFill ${SLIDE_DURATION}ms linear forwards`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      <style>{`
        .oc-story-shimmer {
          background: linear-gradient(90deg, #FF4D00 0%, #FF8C42 40%, #FFB88C 50%, #FF8C42 60%, #FF4D00 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .oc-story-shimmer-anim {
          animation: storySlideLine 0.85s cubic-bezier(0.16,1,0.3,1) 0.28s forwards,
                     storyShimmer 4s ease-in-out 1.2s infinite;
          transform: translateY(110%);
        }
        @keyframes storySlideLine {
          to { transform: translateY(0); }
        }
        @keyframes storyFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes storyLineIn {
          to { transform: scaleX(1); }
        }
        @keyframes storyShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes storyBarFill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
