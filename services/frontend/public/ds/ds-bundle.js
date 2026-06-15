/* @ds-bundle: {"format":3,"namespace":"MSSDesignSystem_fa0208","components":[{"name":"LiquidGlass","sourcePath":"components/liquid-glass/LiquidGlass.jsx"},{"name":"GlassCard","sourcePath":"components/liquid-glass/LiquidGlass.jsx"},{"name":"GlassButton","sourcePath":"components/liquid-glass/LiquidGlass.jsx"},{"name":"GlassDock","sourcePath":"components/liquid-glass/LiquidGlass.jsx"},{"name":"LiquidGlassContainer","sourcePath":"components/liquid-glass/LiquidGlass.jsx"},{"name":"GlassMerge","sourcePath":"components/liquid-glass/LiquidGlass.jsx"},{"name":"RootLayout","sourcePath":"src/frontend/app/layout.tsx"},{"name":"Icon","sourcePath":"src/frontend/components/greennode/Icon.tsx"}],"sourceHashes":{"assets/icons.js":"1539ef63046e","components/liquid-glass/LiquidGlass.jsx":"c670b5096937","src/frontend/app/layout.tsx":"e48cf270107f","src/frontend/components/greennode/Icon.tsx":"c0783fdcc496","src/frontend/components/greennode/types.ts":"9b1ce846f840","src/frontend/tailwind.config.ts":"dcaec24f3abf","ui_kits/greennode-ai/App.jsx":"9baa63574e96","ui_kits/greennode-ai/Chat.jsx":"3579efa18dc9","ui_kits/greennode-ai/KnowledgeBase.jsx":"737e246f8603","ui_kits/greennode-ai/Login.jsx":"887a5119e600","ui_kits/greennode-ai/Sidebar.jsx":"1a162000c4ed","ui_kits/greennode-ai/assets/icons.js":"1539ef63046e","ui_kits/greennode-ai/components.jsx":"9039f8fae8ec","ui_kits/greennode-ai/data.js":"c69e14668344"},"inlinedExternals":[],"unexposedExports":[{"name":"metadata","sourcePath":"src/frontend/app/layout.tsx"},{"name":"viewport","sourcePath":"src/frontend/app/layout.tsx"}]} */

(() => {

const __ds_ns = (window.MSSDesignSystem_fa0208 = window.MSSDesignSystem_fa0208 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// assets/icons.js
try { (() => {
/* ============================================================
   GreenNode AI — Icon set
   Ported verbatim from src/frontend/components/greennode/Icon.tsx
   Lucide-style line icons: 24×24 viewBox, 1.6 stroke, round caps/joins.
   Usage (vanilla): el.innerHTML = gnIcon('search', 16)
   Usage (string):  `<span>${gnIcon('send')}</span>`
   ============================================================ */
(function (root) {
  // Inner markup for each icon (everything inside <svg>).
  var PATHS = {
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    "send": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "paperclip": '<path d="M21 11.5 12.5 20a5 5 0 1 1-7-7L14 4.5a3.5 3.5 0 1 1 5 5L10.5 18a2 2 0 1 1-3-3l7-7"/>',
    "sparkles": '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    "settings": '<path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/><circle cx="12" cy="12" r="3"/>',
    "menu": '<path d="M4 6h16M4 12h16M4 18h16"/>',
    "x": '<path d="M18 6 6 18M6 6l12 12"/>',
    "copy": '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    "check": '<path d="m5 12 5 5 9-11"/>',
    "refresh": '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
    "thumbs-up": '<path d="M7 22V11M2 13v7a2 2 0 0 0 2 2h2V11H4a2 2 0 0 0-2 2zm5-2 4-9a2.5 2.5 0 0 1 5 0v5h5a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2h-9a2 2 0 0 1-2-2"/>',
    "thumbs-down": '<path d="M17 2v11M22 11V4a2 2 0 0 0-2-2h-2v11h2a2 2 0 0 0 2-2zm-5 2-4 9a2.5 2.5 0 0 1-5 0v-5H3a2 2 0 0 1-2-2l2-7a3 3 0 0 1 3-2h9a2 2 0 0 1 2 2"/>',
    "edit": '<path d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/>',
    "code": '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
    "bar-chart": '<path d="M3 3v18h18M8 17V9M13 17V5M18 17v-5"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    "logout": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    "share": '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
    "trash": '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>',
    "sidebar-collapse": '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M10 4v16"/><path d="m17 9-3 3 3 3"/>',
    "sidebar-expand": '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M10 4v16"/><path d="m13 9 3 3-3 3"/>',
    "sidebar-toggle": '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M10 4v16"/>',
    "book": '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    "library": '<path d="M3 4v16M8 4v16M12 4v16M17 7l4 13M21 20H3"/>',
    "upload": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    "link": '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07L11 5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.99-1.99"/>',
    "folder": '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    "crown": '<path d="M3 7l4 4 5-7 5 7 4-4-2 11H5L3 7z"/><path d="M5 21h14"/>',
    "check-circle": '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    "more": '<circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/><circle cx="5" cy="12" r="1.4" fill="currentColor"/>',
    "user": '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    "users": '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    "building": '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10M9 6h.01M14 6h.01M9 10h.01M14 10h.01"/>',
    "palette": '<circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    "lock": '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/>',
    "mail": '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/>',
    "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "eye": '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "eye-off": '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-10-7-10-7a18.45 18.45 0 0 1 3.36-4.83M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>',
    "shield-check": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    "zap": '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    "pin": '<path d="M12 17v5M9 10.76V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4.76a2 2 0 0 0 .54 1.36l1.92 2.13A1 1 0 0 1 16.74 16H7.26a1 1 0 0 1-.72-1.75l1.92-2.13a2 2 0 0 0 .54-1.36z"/>',
    "stop": '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>'
  };

  // The brand "node-eye" mark: a green ring with a dark center.
  // Two-tone (not currentColor) — matches Icon.tsx exactly.
  function nodeEye(size) {
    size = size || 16;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24">' + '<circle cx="12" cy="12" r="9" fill="none" stroke="#1ED760" stroke-width="4.2"/>' + '<circle cx="12" cy="12" r="2.6" fill="#0E1116"/></svg>';
  }
  function gnIcon(name, size) {
    size = size || 16;
    if (name === "node-eye") return nodeEye(size);
    var inner = PATHS[name] || "";
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' + 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  gnIcon.names = Object.keys(PATHS).concat(["node-eye"]);
  gnIcon.paths = PATHS;
  root.gnIcon = gnIcon;
  if (typeof module !== "undefined" && module.exports) module.exports = gnIcon;
})(typeof window !== "undefined" ? window : this);
})(); } catch (e) { __ds_ns.__errors.push({ path: "assets/icons.js", error: String((e && e.message) || e) }); }

// components/liquid-glass/LiquidGlass.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ============================================================
   LiquidGlass — the signature "Liquid Glass" surface
   GreenNode / MSS Design System

   A faithful web port of Apple's iOS 26 Liquid Glass (the effect
   wrapped by @callstack/liquid-glass's UIGlassEffect). It layers
   the traits that define the native material:
     1. backdrop blur + saturation            (the base frost)
     2. EDGE-LENSING refraction               (backdrop bends at the
        rounded rim, stays clear in the center — the iOS-26 signature,
        via a generated displacement map, not surface noise)
     3. directional specular rim-light        (bright top-left edge,
        soft bottom-right — the "lit glass" rim)
     4. pointer-tracked specular highlight     (a glow that follows touch)
     5. interactive = grow-on-touch + shimmer  (matches native semantics)
     6. materialize / dematerialize spring     (effect: regular→clear→none)
     7. spring press + spring entrance          (the "liquid" motion)

   Works on light and dark. Use as a card, a button, or a dock.
   All CSS is self-injected, so the component is portable on its own.
   ============================================================ */

const LG_STYLE_ID = "mss-liquid-glass-styles";
const LG_CSS = `
@property --lg-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }

.lg {
  --lg-fill: rgba(255,255,255,0.14);
  --lg-border: rgba(255,255,255,0.55);
  --lg-radius: 18px;
  --lg-blur: 14px;
  --lg-sat: 180%;
  --lg-bright: 1.08;
  --lg-shadow: 0 8px 32px -8px rgba(40,60,50,0.20), 0 2px 8px -2px rgba(40,60,50,0.12);
  --lg-inset: inset 0 1px 1px 0 rgba(255,255,255,0.65), inset 0 -1px 1px 0 rgba(255,255,255,0.28);
  --lg-spec-color: rgba(255,255,255,0.45);
  --lg-spec-o: 0;
  --lg-mx: 50%; --lg-my: 0%;
  --lg-ink: #243027;
  --lg-spring: cubic-bezier(0.34,1.56,0.64,1);
  --lg-glass-ease: cubic-bezier(0.16,1,0.3,1);
  /* materialization animation (effect / animated / animationDuration) */
  --lg-anim-dur: .5s;
  --lg-fill-o: 1;     /* faded by effect: regular 1 · clear ~0.5 · none 0 */
  --lg-edge-o: 1;     /* border + shadow visibility, faded on 'none' */
  --lg-mat-scale: 1;  /* materialize pop: shrinks toward 'none', springs back */
  --lg-tint: transparent;
  --lg-tint-o: 0;
  --lg-shimmer-dur: 1s;
  /* directional rim-light strength */
  --lg-rim-hi: rgba(255,255,255,0.95);
  --lg-rim-lo: rgba(255,255,255,0.42);
  --lg-rim-o: 0.9;

  position: relative;
  display: block;
  border-radius: var(--lg-radius);
  background: transparent;            /* fill now lives on .lg__fill so it can animate */
  border: 1px solid var(--lg-border);
  box-shadow: var(--lg-inset), var(--lg-shadow);
  -webkit-backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat)) brightness(var(--lg-bright));
  backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat)) brightness(var(--lg-bright));
  color: var(--lg-ink);
  isolation: isolate;
  overflow: hidden;
  transform: scale(var(--lg-mat-scale));
  transition: transform .5s var(--lg-spring),
              box-shadow var(--lg-anim-dur) var(--lg-glass-ease),
              border-color var(--lg-anim-dur) var(--lg-glass-ease),
              -webkit-backdrop-filter var(--lg-anim-dur) var(--lg-glass-ease),
              backdrop-filter var(--lg-anim-dur) var(--lg-glass-ease);
}

/* base translucent fill, on its own layer so 'effect' can fade it smoothly */
.lg__fill {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: var(--lg-fill);
  opacity: var(--lg-fill-o);
  z-index: 0;
  transition: opacity var(--lg-anim-dur) var(--lg-glass-ease),
              background var(--lg-anim-dur) var(--lg-glass-ease);
}

/* ---- effect = none : the dematerialized state (animated) ---- */
.lg[data-effect="none"] { border-color: transparent; box-shadow: none; --lg-mat-scale: 0.965; }
.lg[data-effect="none"] .lg__sheen,
.lg[data-effect="none"] .lg__spec,
.lg[data-effect="none"] .lg__ring,
.lg[data-effect="none"] .lg__rim,
.lg[data-effect="none"] .lg__tint { opacity: 0 !important; }
/* clear = thinner glass: dimmer rim, lighter sheen */
.lg[data-effect="clear"] { --lg-rim-o: 0.6; }
.lg[data-effect="clear"] .lg__sheen { opacity: 0.34; }

/* ---- tint ---- */
.lg[data-tint="neutral"] { --lg-fill: rgba(255,255,255,0.10); }
.lg[data-tint="green"] {
  --lg-fill: rgba(30,215,96,0.12);
  --lg-border: rgba(0,160,80,0.30);
  --lg-ink: #0a4b29;
  --lg-spec-color: rgba(255,255,255,0.52);
}

/* ---- dark theme ---- */
.lg[data-theme="dark"] {
  --lg-fill: rgba(40,48,50,0.22);
  --lg-border: rgba(255,255,255,0.16);
  --lg-bright: 1;
  --lg-shadow: 0 18px 50px -14px rgba(0,0,0,0.55), 0 3px 10px -4px rgba(0,0,0,0.40);
  --lg-inset: inset 0 1px 1px 0 rgba(255,255,255,0.20), inset 0 -1px 1px 0 rgba(255,255,255,0.05);
  --lg-spec-color: rgba(178,255,212,0.28);
  --lg-ink: #eef3f0;
  --lg-rim-hi: rgba(255,255,255,0.72);
  --lg-rim-lo: rgba(255,255,255,0.18);
}
.lg[data-theme="dark"][data-tint="neutral"] { --lg-fill: rgba(24,26,28,0.26); --lg-spec-color: rgba(255,255,255,0.24); }
.lg[data-theme="dark"][data-tint="green"] {
  --lg-fill: rgba(30,215,96,0.16);
  --lg-border: rgba(120,255,180,0.30);
  --lg-ink: #d7ffe7;
}

/* ---- overlays ---- */
.lg__svg { position: absolute; width: 0; height: 0; pointer-events: none; }
.lg__tint, .lg__sheen, .lg__spec, .lg__shimmer, .lg__ring, .lg__rim { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
.lg__tint  { z-index: 1; }
.lg__sheen { z-index: 1; }
.lg__spec  { z-index: 2; }
.lg__rim   { z-index: 3; }
.lg__shimmer { z-index: 4; }
.lg__ring  { z-index: 4; }

/* arbitrary overlay tint (tintColor prop) */
.lg__tint {
  background: var(--lg-tint);
  opacity: var(--lg-tint-o);
  transition: opacity var(--lg-anim-dur) var(--lg-glass-ease), background .35s ease;
}

/* directional specular rim-light — bright top-left, soft bottom-right,
   the static "lit edge" that reads as a real pane of glass. Painted only
   on the 1.5px border via a masked padding box. */
.lg__rim {
  padding: 1.4px;
  background: linear-gradient(135deg,
    var(--lg-rim-hi) 0%, rgba(255,255,255,0.10) 22%,
    transparent 46%, transparent 60%,
    rgba(255,255,255,0.06) 80%, var(--lg-rim-lo) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
  opacity: var(--lg-rim-o);
  mix-blend-mode: screen;
  transition: opacity var(--lg-anim-dur) var(--lg-glass-ease);
}

/* sweeping shimmer — a band of light that crosses the surface on touch/hover */
.lg__shimmer {
  background: linear-gradient(105deg, transparent 28%, rgba(255,255,255,0.55) 47%, rgba(255,255,255,0.0) 64%);
  mix-blend-mode: screen;
  opacity: 0;
  transform: translateX(-130%);
}
.lg[data-theme="dark"] .lg__shimmer { background: linear-gradient(105deg, transparent 28%, rgba(178,255,212,0.40) 47%, rgba(178,255,212,0.0) 64%); }
.lg--shimmer:hover .lg__shimmer,
.lg--shimmer:active .lg__shimmer,
.lg--shimmer:focus-visible .lg__shimmer { animation: lg-shimmer var(--lg-shimmer-dur) var(--lg-glass-ease); }
@keyframes lg-shimmer {
  0%   { transform: translateX(-130%); opacity: 0; }
  14%  { opacity: 1; }
  100% { transform: translateX(130%); opacity: 0; }
}

.lg__sheen {
  background: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 18%, transparent 40%);
  mix-blend-mode: screen;
  opacity: 0.55;
  transition: opacity var(--lg-anim-dur) var(--lg-glass-ease);
}
.lg[data-theme="dark"] .lg__sheen {
  background: linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.03) 22%, transparent 45%);
  opacity: 0.7;
}

.lg__spec {
  background: radial-gradient(190px circle at var(--lg-mx) var(--lg-my), var(--lg-spec-color), transparent 52%);
  mix-blend-mode: screen;
  opacity: var(--lg-spec-o);
  transition: opacity .35s ease;
}

.lg__ring {
  padding: 1.5px;
  background: conic-gradient(from var(--lg-angle),
    transparent 0deg, rgba(255,255,255,0.92) 40deg, transparent 92deg,
    transparent 180deg, rgba(255,255,255,0.62) 222deg, transparent 286deg, transparent 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
  animation: lg-spin var(--lg-ring-speed, 9s) linear infinite;
  opacity: 0.8;
}
@keyframes lg-spin { to { --lg-angle: 360deg; } }

.lg__content { position: relative; z-index: 5; display: block; }

/* ---- variants ---- */
.lg--card { --lg-radius: 20px; }
.lg--button {
  --lg-radius: 14px;
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 44px; cursor: pointer; user-select: none;
  font-family: var(--font-body, -apple-system, BlinkMacSystemFont, system-ui, sans-serif);
  font-weight: 600; font-size: 15px; letter-spacing: -0.01em;
}
.lg--button .lg__content { display: inline-flex; align-items: center; gap: 8px; padding: 0 20px; }
.lg--dock { --lg-radius: 999px; display: inline-flex; align-items: center; }
.lg--dock .lg__content { display: inline-flex; align-items: center; gap: 6px; padding: 8px; }

/* ---- interactions ---- */
.lg--card.lg--hoverlift:hover {
  transform: translateY(-3px) scale(var(--lg-mat-scale));
  box-shadow: var(--lg-inset), 0 24px 64px -16px rgba(31,138,72,0.30), 0 6px 18px -8px rgba(40,60,50,0.18);
}
/* native shrink-press */
.lg--press:active { transform: scale(calc(var(--lg-mat-scale) * 0.94)); transition-duration: .11s; }
/* callstack-style interactive: grow on touch (the native UIGlassEffect feel) */
.lg--grow:hover  { transform: scale(calc(var(--lg-mat-scale) * 1.03)); }
.lg--grow:active { transform: scale(calc(var(--lg-mat-scale) * 1.07)); transition-duration: .12s; }
.lg:focus-visible { outline: none; box-shadow: var(--lg-inset), var(--lg-shadow), 0 0 0 4px rgba(30,215,96,0.30); }

/* ---- entrance ---- */
@keyframes lg-in { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: none; } }
.lg--in { animation: lg-in .6s var(--lg-spring) both; }

@media (prefers-reduced-motion: reduce) {
  .lg, .lg--in, .lg__ring, .lg__shimmer { animation: none !important; }
  .lg { transition: none !important; }
}

/* ============================================================
   LiquidGlassContainer — merging glass (the gooey metaball join)
   Children within "spacing" of each other fuse into one blob,
   mirroring callstack's LiquidGlassContainerView. The goo SVG
   filter merges the children's own fill, so inside a merge wrap
   each .lg swaps its live backdrop blur for a frosted fill
   (backdrop-filter can't survive a parent filter).
   ============================================================ */
.lg-merge { display: inline-flex; align-items: center; }
.lg-merge--col { flex-direction: column; }
.lg-merge .lg {
  -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
  background: var(--lg-merge-fill, rgba(255,255,255,0.86)) !important;
  border: none !important;
  box-shadow: none !important;
}
.lg-merge[data-theme="dark"] .lg { --lg-merge-fill: rgba(175,238,202,0.55); }
.lg-merge .lg__fill, .lg-merge .lg__rim { display: none; }
`;
let __lgSeq = 0;
function ensureLiquidGlassStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(LG_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = LG_STYLE_ID;
  el.textContent = LG_CSS;
  document.head.appendChild(el);
}
const BLUR_BY_INTENSITY = {
  subtle: 8,
  balanced: 14,
  heavy: 22
};

/* How each effect mode scales the frost. Switching between these animates
   (materialize / dematerialize) via the CSS transitions above. */
const EFFECT_BY_MODE = {
  regular: {
    blurMul: 1,
    satMul: 1,
    fillO: 1,
    edge: true
  },
  clear: {
    blurMul: 0.42,
    satMul: 0.82,
    fillO: 0.5,
    edge: true
  },
  none: {
    blurMul: 0,
    satMul: 1,
    fillO: 0,
    edge: false
  }
};

/* ------------------------------------------------------------
   Build an EDGE-LENSING displacement map as a data-URI SVG.
   The map encodes a refraction field in its R (x) and G (y)
   channels: a horizontal red ramp + vertical green ramp give a
   smooth "magnify" field, and a neutral rounded-rect punched into
   the center (rgb 128,128) zeroes displacement there — so the
   backdrop only bends in a band around the rounded rim, exactly
   like a thick pane of iOS-26 liquid glass. The caller blurs the
   map (feGaussianBlur) to soften that band.
   ------------------------------------------------------------ */
function buildDisplacementMap(w, h, radius, rim) {
  const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
  const inset = Math.max(1, Math.min(rim, Math.min(w, h) / 2 - 1));
  const innerR = Math.max(0, r - inset);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` + `<defs>` + `<linearGradient id='rx' x1='0' y1='0' x2='1' y2='0'>` + `<stop offset='0' stop-color='#000'/><stop offset='1' stop-color='#f00'/>` + `</linearGradient>` + `<linearGradient id='gy' x1='0' y1='0' x2='0' y2='1'>` + `<stop offset='0' stop-color='#000'/><stop offset='1' stop-color='#0f0'/>` + `</linearGradient>` + `</defs>` + `<rect width='${w}' height='${h}' fill='url(#rx)'/>` + `<rect width='${w}' height='${h}' fill='url(#gy)' style='mix-blend-mode:screen'/>` + `<rect x='${inset}' y='${inset}' width='${w - 2 * inset}' height='${h - 2 * inset}' ` + `rx='${innerR}' ry='${innerR}' fill='rgb(128,128,0)'/>` + `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

/* Resolve 'system' colorScheme to light/dark once (and keep updated). */
function useResolvedScheme(colorScheme, theme) {
  const get = () => {
    const cs = colorScheme || (theme === "dark" ? "dark" : theme === "light" ? "light" : "light");
    if (cs !== "system") return cs;
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  };
  const [scheme, setScheme] = React.useState(get);
  React.useEffect(() => {
    setScheme(get());
    if ((colorScheme || "") !== "system" || typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setScheme(mq.matches ? "dark" : "light");
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on);
    };
  }, [colorScheme, theme]);
  return scheme;
}

/**
 * LiquidGlass — a configurable Liquid Glass surface.
 * See LiquidGlass.d.ts for the full prop documentation.
 */
function LiquidGlass({
  as: Tag = "div",
  variant = "card",
  theme = "light",
  colorScheme,
  intensity = "balanced",
  tint = "mint",
  radius,
  effect = "regular",
  animated = true,
  animationDuration,
  tintColor,
  refraction = true,
  refractionScale = 40,
  specular = true,
  edgeRing = false,
  ringSpeed = 9,
  sheen = true,
  shimmer,
  springPress = true,
  pressMotion,
  hoverLift = true,
  entrance = true,
  interactive,
  className = "",
  style = {},
  children,
  ...rest
}) {
  ensureLiquidGlassStyles();
  const ref = React.useRef(null);
  const filterRef = React.useRef(null);
  const feImageRef = React.useRef(null);
  const feBlurRef = React.useRef(null);
  const feDispRef = React.useRef(null);
  const idRef = React.useRef(null);
  if (idRef.current == null) idRef.current = "lgf" + ++__lgSeq;
  const fid = idRef.current;
  const [entered, setEntered] = React.useState(!entrance);
  const [dispReady, setDispReady] = React.useState(false);
  const resolvedTheme = useResolvedScheme(colorScheme, theme);
  const fx = EFFECT_BY_MODE[effect] || EFFECT_BY_MODE.regular;
  const baseBlur = BLUR_BY_INTENSITY[intensity] || 14;
  const blur = Math.round(baseBlur * fx.blurMul);
  const baseSat = intensity === "heavy" ? 200 : intensity === "subtle" ? 160 : 180;
  const sat = Math.round(baseSat * fx.satMul);
  const bright = resolvedTheme === "dark" ? 1 : 1.08;
  const rScale = refractionScale * fx.blurMul;
  const useRefraction = refraction && effect !== "none";

  // Pointer-tracked specular highlight.
  React.useEffect(() => {
    if (!specular) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const onMove = e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--lg-mx", (e.clientX - r.left) / r.width * 100 + "%");
      el.style.setProperty("--lg-my", (e.clientY - r.top) / r.height * 100 + "%");
      el.style.setProperty("--lg-spec-o", "0.7");
    };
    const onLeave = () => el.style.setProperty("--lg-spec-o", "0");
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [specular]);

  // Build + keep the edge-lensing displacement map sized to the element.
  React.useEffect(() => {
    if (!useRefraction) {
      setDispReady(false);
      return undefined;
    }
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w < 2 || h < 2) return;
      const cs = getComputedStyle(el);
      const rad = parseFloat(cs.borderTopLeftRadius) || 0;
      // refraction band width: scales with displacement strength, clamped to the box.
      const rim = Math.max(10, Math.min(rScale * 0.9, Math.min(w, h) / 2 - 1));
      const href = buildDisplacementMap(w, h, rad, rim);
      const img = feImageRef.current;
      if (img) {
        img.setAttribute("href", href);
        img.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
        img.setAttribute("x", "0");
        img.setAttribute("y", "0");
        img.setAttribute("width", String(w));
        img.setAttribute("height", String(h));
        img.setAttribute("preserveAspectRatio", "none");
      }
      if (feBlurRef.current) feBlurRef.current.setAttribute("stdDeviation", String(Math.max(0.5, rim * 0.32)));
      if (feDispRef.current) feDispRef.current.setAttribute("scale", String(rScale));
      setDispReady(true);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [useRefraction, rScale, effect, intensity, radius]);
  const isInteractive = interactive != null ? interactive : variant === "button" || variant === "dock";

  // Native semantics: an explicitly-interactive surface grows on touch and shimmers.
  const resolvedPress = pressMotion != null ? pressMotion : interactive === true ? "grow" : "shrink";
  const resolvedShimmer = shimmer != null ? shimmer : interactive === true;
  const cls = ["lg", "lg--" + variant, variant === "card" && hoverLift ? "lg--hoverlift" : "", springPress && isInteractive ? resolvedPress === "grow" ? "lg--grow" : "lg--press" : "", resolvedShimmer ? "lg--shimmer" : "", entrance && !entered ? "lg--in" : "", className].filter(Boolean).join(" ");
  const mergedStyle = {
    "--lg-blur": blur + "px",
    "--lg-sat": sat + "%",
    "--lg-ring-speed": ringSpeed + "s",
    "--lg-fill-o": fx.fillO,
    "--lg-anim-dur": (animated ? animationDuration != null ? animationDuration / 1000 : 0.5 : 0) + "s",
    ...style
  };
  if (radius != null) {
    mergedStyle["--lg-radius"] = typeof radius === "number" ? radius + "px" : radius;
  }
  if (tintColor) {
    mergedStyle["--lg-tint"] = tintColor;
    mergedStyle["--lg-tint-o"] = effect === "none" ? 0 : 0.24;
  }
  if (effect === "none") {
    mergedStyle.backdropFilter = "blur(0px) saturate(100%)";
    mergedStyle.WebkitBackdropFilter = "blur(0px) saturate(100%)";
  } else {
    const lens = useRefraction && dispReady ? `url(#${fid}) ` : "";
    const bf = `${lens}blur(${blur}px) saturate(${sat}%) brightness(${bright})`;
    mergedStyle.backdropFilter = bf;
    mergedStyle.WebkitBackdropFilter = bf;
  }
  const handleAnimEnd = e => {
    if (e.animationName === "lg-in") setEntered(true);
  };
  const extra = {};
  if (isInteractive && Tag === "div") {
    extra.role = rest.role || "button";
    extra.tabIndex = rest.tabIndex != null ? rest.tabIndex : 0;
  }
  return /*#__PURE__*/React.createElement(Tag, _extends({
    ref: ref,
    className: cls,
    "data-theme": resolvedTheme,
    "data-intensity": intensity,
    "data-tint": tint,
    "data-effect": effect,
    style: mergedStyle,
    onAnimationEnd: handleAnimEnd
  }, extra, rest), /*#__PURE__*/React.createElement("span", {
    className: "lg__fill",
    "aria-hidden": "true"
  }), useRefraction ? /*#__PURE__*/React.createElement("svg", {
    className: "lg__svg",
    "aria-hidden": "true",
    width: "0",
    height: "0"
  }, /*#__PURE__*/React.createElement("filter", {
    ref: filterRef,
    id: fid,
    x: "-30%",
    y: "-30%",
    width: "160%",
    height: "160%",
    filterUnits: "objectBoundingBox",
    primitiveUnits: "userSpaceOnUse",
    colorInterpolationFilters: "sRGB"
  }, /*#__PURE__*/React.createElement("feImage", {
    ref: feImageRef,
    result: "lgmap",
    preserveAspectRatio: "none"
  }), /*#__PURE__*/React.createElement("feGaussianBlur", {
    ref: feBlurRef,
    in: "lgmap",
    stdDeviation: "6",
    result: "lgmapb"
  }), /*#__PURE__*/React.createElement("feDisplacementMap", {
    ref: feDispRef,
    in: "SourceGraphic",
    in2: "lgmapb",
    scale: rScale,
    xChannelSelector: "R",
    yChannelSelector: "G"
  }))) : null, tintColor ? /*#__PURE__*/React.createElement("span", {
    className: "lg__tint",
    "aria-hidden": "true"
  }) : null, sheen ? /*#__PURE__*/React.createElement("span", {
    className: "lg__sheen",
    "aria-hidden": "true"
  }) : null, specular ? /*#__PURE__*/React.createElement("span", {
    className: "lg__spec",
    "aria-hidden": "true"
  }) : null, /*#__PURE__*/React.createElement("span", {
    className: "lg__rim",
    "aria-hidden": "true"
  }), resolvedShimmer ? /*#__PURE__*/React.createElement("span", {
    className: "lg__shimmer",
    "aria-hidden": "true"
  }) : null, edgeRing ? /*#__PURE__*/React.createElement("span", {
    className: "lg__ring",
    "aria-hidden": "true"
  }) : null, /*#__PURE__*/React.createElement("span", {
    className: "lg__content"
  }, children));
}

/* -------- ergonomic presets -------- */

/** A glass card (hover-lift, no press). */
function GlassCard(props) {
  return /*#__PURE__*/React.createElement(LiquidGlass, _extends({
    variant: "card"
  }, props));
}

/** A glass button (spring press, refraction). Pass `as="button"` for a real button element. */
function GlassButton(props) {
  return /*#__PURE__*/React.createElement(LiquidGlass, _extends({
    variant: "button",
    as: props.as || "button"
  }, props));
}

/** A pill-shaped glass dock / toolbar — drop glass buttons or icons inside. */
function GlassDock(props) {
  return /*#__PURE__*/React.createElement(LiquidGlass, _extends({
    variant: "dock",
    intensity: "heavy"
  }, props));
}

/* ============================================================
   LiquidGlassContainer — merging glass
   Mirrors callstack's LiquidGlassContainerView: lay LiquidGlass
   children inside, and when they come within `spacing` of each
   other their shapes fuse with a gooey liquid join (SVG metaball
   filter). Each instance gets its own filter whose blur tracks
   `spacing`, so a larger spacing fuses elements from farther away.
   ============================================================ */
const GOO_STYLE_ID = "mss-liquid-glass-goo";
let __gooSeq = 0;
function ensureGooHost() {
  if (typeof document === "undefined") return null;
  let host = document.getElementById(GOO_STYLE_ID);
  if (!host) {
    host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    host.setAttribute("id", GOO_STYLE_ID);
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:absolute;width:0;height:0;pointer-events:none;";
    document.body.appendChild(host);
  }
  return host;
}

/**
 * LiquidGlassContainer — fuse adjacent LiquidGlass children into one blob.
 * See LiquidGlass.d.ts for prop documentation.
 */
function LiquidGlassContainer({
  spacing = 12,
  direction = "row",
  theme = "light",
  className = "",
  style = {},
  children,
  ...rest
}) {
  ensureLiquidGlassStyles();
  const idRef = React.useRef(null);
  if (idRef.current == null) idRef.current = "lggoo" + ++__gooSeq;
  const fid = idRef.current;

  // The goo blur sets how far apart shapes still merge — tie it to spacing.
  const std = Math.max(2, Math.round(spacing * 0.7));
  React.useEffect(() => {
    const host = ensureGooHost();
    if (!host) return undefined;
    const NS = "http://www.w3.org/2000/svg";
    const filter = document.createElementNS(NS, "filter");
    filter.setAttribute("id", fid);
    filter.setAttribute("color-interpolation-filters", "sRGB");
    filter.innerHTML = `<feGaussianBlur in="SourceGraphic" stdDeviation="${std}" result="b"/>` + `<feColorMatrix in="b" type="matrix" ` + `values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12" result="goo"/>` + `<feComposite in="SourceGraphic" in2="goo" operator="atop"/>`;
    host.appendChild(filter);
    return () => {
      if (filter.parentNode) filter.parentNode.removeChild(filter);
    };
  }, [fid, std]);
  const cls = ["lg-merge", direction === "column" ? "lg-merge--col" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    "data-theme": theme,
    style: {
      gap: spacing + "px",
      filter: `url(#${fid})`,
      ...style
    }
  }, rest), children);
}

/** Merging-glass row preset — drop two or more LiquidGlass children inside. */
function GlassMerge(props) {
  return /*#__PURE__*/React.createElement(LiquidGlassContainer, props);
}
Object.assign(__ds_scope, { LiquidGlass, GlassCard, GlassButton, GlassDock, LiquidGlassContainer, GlassMerge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/liquid-glass/LiquidGlass.jsx", error: String((e && e.message) || e) }); }

// src/frontend/app/layout.tsx
try { (() => {
const metadata = {
  title: "GreenNode Enterprise AI — Internal Assistant",
  description: "Enterprise internal AI chatbot",
  icons: {
    icon: "/assets/favicon.png",
    shortcut: "/assets/favicon.png",
    apple: "/assets/favicon.png"
  }
};
const viewport = {
  themeColor: "#F4F6F4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};
function RootLayout({
  children
}) {
  return /*#__PURE__*/React.createElement("html", {
    lang: "en"
  }, /*#__PURE__*/React.createElement("head", null, /*#__PURE__*/React.createElement("link", {
    rel: "preconnect",
    href: "https://fonts.googleapis.com"
  }), /*#__PURE__*/React.createElement("link", {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: ""
  }), /*#__PURE__*/React.createElement("link", {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap"
  })), /*#__PURE__*/React.createElement("body", null, children));
}
Object.assign(__ds_scope, { metadata, viewport, RootLayout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "src/frontend/app/layout.tsx", error: String((e && e.message) || e) }); }

// src/frontend/components/greennode/Icon.tsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Icon({
  name,
  size = 16,
  ...rest
}) {
  const base = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...rest
  };
  switch (name) {
    case "plus":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M12 5v14M5 12h14"
      }));
    case "search":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("circle", {
        cx: "11",
        cy: "11",
        r: "7"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m20 20-3.5-3.5"
      }));
    case "send":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M5 12h14M13 6l6 6-6 6"
      }));
    case "paperclip":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M21 11.5 12.5 20a5 5 0 1 1-7-7L14 4.5a3.5 3.5 0 1 1 5 5L10.5 18a2 2 0 1 1-3-3l7-7"
      }));
    case "sparkles":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"
      }));
    case "settings":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "3"
      }));
    case "menu":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M4 6h16M4 12h16M4 18h16"
      }));
    case "x":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M18 6 6 18M6 6l12 12"
      }));
    case "copy":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("rect", {
        x: "9",
        y: "9",
        width: "11",
        height: "11",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M5 15V5a2 2 0 0 1 2-2h10"
      }));
    case "check":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "m5 12 5 5 9-11"
      }));
    case "refresh":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M21 12a9 9 0 1 1-3-6.7"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M21 4v5h-5"
      }));
    case "thumbs-up":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M7 22V11M2 13v7a2 2 0 0 0 2 2h2V11H4a2 2 0 0 0-2 2zm5-2 4-9a2.5 2.5 0 0 1 5 0v5h5a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2h-9a2 2 0 0 1-2-2"
      }));
    case "thumbs-down":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M17 2v11M22 11V4a2 2 0 0 0-2-2h-2v11h2a2 2 0 0 0 2-2zm-5 2-4 9a2.5 2.5 0 0 1-5 0v-5H3a2 2 0 0 1-2-2l2-7a3 3 0 0 1 3-2h9a2 2 0 0 1 2 2"
      }));
    case "edit":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"
      }));
    case "code":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "m16 18 6-6-6-6M8 6l-6 6 6 6"
      }));
    case "file-text":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M14 2v6h6M8 13h8M8 17h8M8 9h2"
      }));
    case "bar-chart":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M3 3v18h18M8 17V9M13 17V5M18 17v-5"
      }));
    case "globe":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "10"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
      }));
    case "logout":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
      }));
    case "share":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
      }));
    case "trash":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"
      }));
    case "sidebar-collapse":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "4",
        width: "18",
        height: "16",
        rx: "2.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M10 4v16"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m17 9-3 3 3 3"
      }));
    case "sidebar-expand":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "4",
        width: "18",
        height: "16",
        rx: "2.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M10 4v16"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m13 9 3 3-3 3"
      }));
    case "sidebar-toggle":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "4",
        width: "18",
        height: "16",
        rx: "2.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M10 4v16"
      }));
    case "book":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
      }));
    case "library":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M3 4v16M8 4v16M12 4v16M17 7l4 13M21 20H3"
      }));
    case "upload":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
      }));
    case "link":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07L11 5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.99-1.99"
      }));
    case "folder":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
      }));
    case "shield":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      }));
    case "crown":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M3 7l4 4 5-7 5 7 4-4-2 11H5L3 7z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M5 21h14"
      }));
    case "check-circle":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "10"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m8 12 3 3 5-6"
      }));
    case "clock":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "10"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M12 6v6l4 2"
      }));
    case "more":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "1.4",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "19",
        cy: "12",
        r: "1.4",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "5",
        cy: "12",
        r: "1.4",
        fill: "currentColor"
      }));
    case "user":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "7",
        r: "4"
      }));
    case "users":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "9",
        cy: "7",
        r: "4"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      }));
    case "building":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("rect", {
        x: "4",
        y: "2",
        width: "16",
        height: "20",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 22V12h6v10M9 6h.01M14 6h.01M9 10h.01M14 10h.01"
      }));
    case "palette":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("circle", {
        cx: "13.5",
        cy: "6.5",
        r: "0.5",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "17.5",
        cy: "10.5",
        r: "0.5",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "8.5",
        cy: "7.5",
        r: "0.5",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "6.5",
        cy: "12.5",
        r: "0.5",
        fill: "currentColor"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
      }));
    case "lock":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("rect", {
        x: "4",
        y: "11",
        width: "16",
        height: "10",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M8 11V7a4 4 0 1 1 8 0v4"
      }));
    case "mail":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("rect", {
        x: "2",
        y: "4",
        width: "20",
        height: "16",
        rx: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m2 6 10 7 10-7"
      }));
    case "arrow-right":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M5 12h14M13 6l6 6-6 6"
      }));
    case "eye":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "3"
      }));
    case "eye-off":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-10-7-10-7a18.45 18.45 0 0 1 3.36-4.83M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
      }));
    case "shield-check":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "m9 12 2 2 4-4"
      }));
    case "zap":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M13 2 3 14h9l-1 8 10-12h-9l1-8z"
      }));
    case "node-eye":
      return /*#__PURE__*/React.createElement("svg", _extends({
        width: size,
        height: size,
        viewBox: "0 0 24 24"
      }, rest), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "9",
        fill: "none",
        stroke: "#1ED760",
        strokeWidth: 4.2
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "2.6",
        fill: "#0E1116"
      }));
    case "pin":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("path", {
        d: "M12 17v5M9 10.76V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4.76a2 2 0 0 0 .54 1.36l1.92 2.13A1 1 0 0 1 16.74 16H7.26a1 1 0 0 1-.72-1.75l1.92-2.13a2 2 0 0 0 .54-1.36z"
      }));
    case "stop":
      return /*#__PURE__*/React.createElement("svg", base, /*#__PURE__*/React.createElement("rect", {
        x: "6",
        y: "6",
        width: "12",
        height: "12",
        rx: "1.5",
        fill: "currentColor",
        stroke: "none"
      }));
    default:
      return /*#__PURE__*/React.createElement("svg", base);
  }
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "src/frontend/components/greennode/Icon.tsx", error: String((e && e.message) || e) }); }

// src/frontend/tailwind.config.ts
try { (() => {
try {
  void {
    content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
    theme: {
      extend: {}
    },
    plugins: []
  };
} catch {}
})(); } catch (e) { __ds_ns.__errors.push({ path: "src/frontend/tailwind.config.ts", error: String((e && e.message) || e) }); }

// ui_kits/greennode-ai/App.jsx
try { (() => {
/* GreenNode AI UI Kit — App shell orchestrating login → chat → KB */
function App() {
  const [authed, setAuthed] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [kbOpen, setKbOpen] = React.useState(false);
  const [lang, setLang] = React.useState("EN");
  const [activeId, setActiveId] = React.useState("c1");
  const [messages, setMessages] = React.useState([]); // [] = hero empty state
  const convRef = React.useRef(null);
  const busy = React.useRef(false);
  const scrollDown = () => {
    requestAnimationFrame(() => {
      const el = convRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };
  const send = (text, files) => {
    if (busy.current) return;
    busy.current = true;
    const userMsg = {
      id: "u" + Date.now(),
      role: "user",
      text,
      files
    };
    const botId = "a" + Date.now();
    setMessages(m => [...m, userMsg, {
      id: botId,
      role: "assistant",
      thinking: true,
      streaming: true
    }]);
    scrollDown();
    setTimeout(() => {
      const blocks = window.GN.pickReply(text);
      setMessages(m => m.map(x => x.id === botId ? {
        ...x,
        thinking: false,
        streaming: false,
        blocks
      } : x));
      busy.current = false;
      scrollDown();
    }, 1300);
  };
  const newChat = () => {
    setMessages([]);
    setActiveId(null);
  };
  const selectConv = id => {
    setActiveId(id);
    // Seed a short canned exchange so selecting history feels live.
    send.length; // noop
    setMessages([{
      id: "h-u",
      role: "user",
      text: "Summarize the Q3 infrastructure report"
    }, {
      id: "h-a",
      role: "assistant",
      blocks: window.GN.REPLIES.report
    }]);
  };
  if (!authed) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MeshBackground, null), /*#__PURE__*/React.createElement(Login, {
    onSignIn: () => setAuthed(true)
  }));
  const S = window.GN.STRINGS;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MeshBackground, null), /*#__PURE__*/React.createElement("div", {
    className: "app" + (collapsed ? " no-sidebar" : "")
  }, /*#__PURE__*/React.createElement(Sidebar, {
    activeId: activeId,
    onSelect: selectConv,
    onNewChat: newChat,
    onOpenKB: () => setKbOpen(true),
    collapsed: collapsed
  }), /*#__PURE__*/React.createElement("main", {
    className: "main glass"
  }, /*#__PURE__*/React.createElement(ChatHeader, {
    title: S.chatTitle,
    sub: S.chatSub,
    onToggleSidebar: () => setCollapsed(c => !c),
    lang: lang,
    setLang: setLang
  }), /*#__PURE__*/React.createElement("div", {
    className: "conversation-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "conversation",
    ref: convRef
  }, messages.length === 0 ? /*#__PURE__*/React.createElement(Hero, {
    onPrompt: t => send(t)
  }) : /*#__PURE__*/React.createElement("div", {
    className: "thread"
  }, messages.map(m => /*#__PURE__*/React.createElement(Message, {
    key: m.id,
    msg: m
  }))))), /*#__PURE__*/React.createElement(Composer, {
    onSend: t => send(t)
  }))), kbOpen && /*#__PURE__*/React.createElement(KnowledgeBase, {
    onClose: () => setKbOpen(false)
  }));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greennode-ai/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/greennode-ai/Chat.jsx
try { (() => {
/* GreenNode AI UI Kit — Chat: header, hero, messages, composer */

function ChatHeader({
  title,
  sub,
  onToggleSidebar,
  lang,
  setLang
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "main-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: onToggleSidebar,
    title: "Toggle sidebar"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sidebar-toggle",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "title-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "subtitle"
  }, sub)), /*#__PURE__*/React.createElement("div", {
    className: "head-actions"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lang-pill"
  }, /*#__PURE__*/React.createElement("button", {
    className: lang === "EN" ? "active" : "",
    onClick: () => setLang("EN")
  }, "EN"), /*#__PURE__*/React.createElement("button", {
    className: lang === "VI" ? "active" : "",
    onClick: () => setLang("VI")
  }, "VI")), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Share"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "share",
    size: 16
  }))));
}
function Hero({
  onPrompt
}) {
  const S = window.GN.STRINGS;
  return /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-card glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-visual"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), S.heroEyebrow), /*#__PURE__*/React.createElement("h1", null, S.heroTitle1, " ", /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }, S.heroTitle2)), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, S.heroLede)), /*#__PURE__*/React.createElement("div", {
    className: "hero-prompts"
  }, window.GN.PROMPTS.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "prompt-card",
    onClick: () => onPrompt(p.title)
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: p.icon,
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "title"
  }, p.title), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, p.desc))))));
}
function CodeBlock({
  block
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "code-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "code-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lang"
  }, block.lang), /*#__PURE__*/React.createElement("button", {
    className: "copy",
    onClick: copy
  }, /*#__PURE__*/React.createElement(Icon, {
    name: copied ? "check" : "copy",
    size: 11
  }), copied ? "Copied" : "Copy")), /*#__PURE__*/React.createElement("pre", {
    dangerouslySetInnerHTML: {
      __html: window.highlight(block.raw, block.lang)
    }
  }));
}

// Renders one assistant reply made of block objects (see data.js)
function ReplyBlocks({
  blocks
}) {
  return blocks.map((b, i) => {
    if (b.p) return /*#__PURE__*/React.createElement("p", {
      key: i
    }, renderInline(b.p));
    if (b.h3) return /*#__PURE__*/React.createElement("h3", {
      key: i
    }, b.h3);
    if (b.ul) return /*#__PURE__*/React.createElement("ul", {
      key: i
    }, b.ul.map((li, j) => /*#__PURE__*/React.createElement("li", {
      key: j
    }, renderInline(li))));
    if (b.ol) return /*#__PURE__*/React.createElement("ol", {
      key: i
    }, b.ol.map((li, j) => /*#__PURE__*/React.createElement("li", {
      key: j
    }, renderInline(li))));
    if (b.quote) return /*#__PURE__*/React.createElement("blockquote", {
      key: i
    }, renderInline(b.quote));
    if (b.code) return /*#__PURE__*/React.createElement(CodeBlock, {
      key: i,
      block: b.code
    });
    if (b.cite) return /*#__PURE__*/React.createElement("div", {
      className: "citations",
      key: i
    }, b.cite.map((c, j) => /*#__PURE__*/React.createElement("button", {
      className: "citation-card",
      key: j
    }, /*#__PURE__*/React.createElement("span", {
      className: "citation-n"
    }, "[", j + 1, "]"), /*#__PURE__*/React.createElement("span", {
      className: "citation-name"
    }, c))));
    return null;
  });
}
function Message({
  msg
}) {
  const S = window.GN.STRINGS;
  const isUser = msg.role === "user";
  const [copied, setCopied] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "msg " + msg.role + (msg.streaming ? " is-streaming" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "bubble-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "msg-meta"
  }, isUser ? S.you : S.bot), /*#__PURE__*/React.createElement("div", {
    className: "bubble"
  }, msg.files && /*#__PURE__*/React.createElement("div", {
    className: "bubble-files"
  }, msg.files.map((f, i) => /*#__PURE__*/React.createElement("div", {
    className: "file-tile",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "file-icon",
    "data-type": f.type
  }, f.type), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("div", {
    className: "file-tile-name"
  }, f.name), /*#__PURE__*/React.createElement("div", {
    className: "file-tile-meta"
  }, f.type.toUpperCase(), " \xB7 ", f.size))))), isUser ? renderInline(msg.text) : msg.thinking ? /*#__PURE__*/React.createElement("span", {
    className: "thinking-indicator"
  }, /*#__PURE__*/React.createElement("span", {
    className: "thinking-text"
  }, "Thinking\u2026"), /*#__PURE__*/React.createElement("span", {
    className: "thinking-dots"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null))) : /*#__PURE__*/React.createElement(ReplyBlocks, {
    blocks: msg.blocks
  })), !isUser && !msg.thinking && /*#__PURE__*/React.createElement("div", {
    className: "msg-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "act-btn" + (copied ? " copied" : ""),
    onClick: () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: copied ? "check" : "copy",
    size: 12
  }), copied ? S.copied : S.copy), /*#__PURE__*/React.createElement("button", {
    className: "act-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "refresh",
    size: 12
  }), S.regenerate), /*#__PURE__*/React.createElement("button", {
    className: "act-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "thumbs-up",
    size: 12
  })))));
}
function Composer({
  onSend
}) {
  const S = window.GN.STRINGS;
  const [text, setText] = React.useState("");
  const taRef = React.useRef(null);
  const grow = el => {
    if (!el) return;
    el.style.height = "28px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };
  const submit = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
    if (taRef.current) taRef.current.style.height = "28px";
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "composer-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "composer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "composer-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "composer-attach",
    title: "Attach files"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "paperclip",
    size: 16
  })), /*#__PURE__*/React.createElement("textarea", {
    ref: taRef,
    value: text,
    rows: 1,
    placeholder: S.composerPlaceholder,
    onChange: e => {
      setText(e.target.value);
      grow(e.target);
    },
    onKeyDown: e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "send-btn",
    disabled: !text.trim(),
    onClick: submit,
    title: "Send message"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    className: "composer-hint",
    style: {
      marginTop: 8
    }
  }, S.composerHint));
}
Object.assign(window, {
  ChatHeader,
  Hero,
  Message,
  Composer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greennode-ai/Chat.jsx", error: String((e && e.message) || e) }); }

// ui_kits/greennode-ai/KnowledgeBase.jsx
try { (() => {
/* GreenNode AI UI Kit — Knowledge Base modal */
function KnowledgeBase({
  onClose
}) {
  const [view, setView] = React.useState("base"); // base list | sources of one base
  const [sources, setSources] = React.useState(window.GN.KB_SOURCES);
  const bases = window.GN.KB_BASES;
  const removeSource = id => setSources(s => s.filter(x => x.id !== id));
  return /*#__PURE__*/React.createElement("div", {
    className: "kb-overlay",
    onMouseDown: e => {
      if (e.target === e.currentTarget) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "kb-modal"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kb-head"
  }, view === "sources" ? /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: () => setView("base"),
    title: "Back"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 18,
    style: {
      transform: "rotate(180deg)"
    }
  })) : /*#__PURE__*/React.createElement("span", {
    className: "kb-head-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "library",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "title-block",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h2", null, view === "sources" ? "Engineering Docs" : "Knowledge Bases"), /*#__PURE__*/React.createElement("div", {
    className: "kb-sub"
  }, "Sources that GreenNode AI can reference. Indexed across your tenant.")), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    onClick: onClose,
    title: "Close"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "kb-body"
  }, view === "base" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "kb-section-label"
  }, "Your knowledge bases"), /*#__PURE__*/React.createElement("div", {
    className: "kb-bases"
  }, bases.map(b => /*#__PURE__*/React.createElement("button", {
    className: "kb-base-card",
    key: b.id,
    onClick: () => setView("sources")
  }, /*#__PURE__*/React.createElement("span", {
    className: "kb-base-ic",
    style: {
      background: b.color
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: b.icon,
    size: 18,
    style: {
      color: "#fff"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "kb-base-name"
  }, b.name), /*#__PURE__*/React.createElement("div", {
    className: "kb-base-desc"
  }, b.desc), /*#__PURE__*/React.createElement("div", {
    className: "kb-base-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "kb-dept-tag"
  }, b.dept), /*#__PURE__*/React.createElement("span", null, b.sources, " sources"), /*#__PURE__*/React.createElement("span", null, b.chunks.toLocaleString(), " chunks"))))))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "kb-section-label"
  }, "Add a source"), /*#__PURE__*/React.createElement("div", {
    className: "kb-add-grid"
  }, /*#__PURE__*/React.createElement("button", {
    className: "kb-add-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "kb-add-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "upload",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "kb-add-title"
  }, "Upload files"), /*#__PURE__*/React.createElement("div", {
    className: "kb-add-desc"
  }, "PDF, DOCX, MD, TXT \u2014 up to 100 MB each")), /*#__PURE__*/React.createElement("button", {
    className: "kb-add-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "kb-add-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "kb-add-title"
  }, "Add web URL"), /*#__PURE__*/React.createElement("div", {
    className: "kb-add-desc"
  }, "Crawl a public page or sitemap")), /*#__PURE__*/React.createElement("button", {
    className: "kb-add-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "kb-add-ic"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "folder",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "kb-add-title"
  }, "Connect Drive"), /*#__PURE__*/React.createElement("div", {
    className: "kb-add-desc"
  }, "Google Drive, SharePoint, Confluence"))), /*#__PURE__*/React.createElement("p", {
    className: "kb-section-label"
  }, sources.length, " sources"), /*#__PURE__*/React.createElement("div", {
    className: "kb-list"
  }, sources.map(s => /*#__PURE__*/React.createElement("div", {
    className: "kb-row",
    key: s.id
  }, /*#__PURE__*/React.createElement("span", {
    className: "file-icon",
    "data-type": s.type
  }, s.type), /*#__PURE__*/React.createElement("span", {
    className: "kb-row-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kb-row-name"
  }, s.name), /*#__PURE__*/React.createElement("div", {
    className: "kb-row-meta"
  }, s.size, " \xB7 ", s.chunks, " chunks \xB7 ", s.updated)), s.status === "indexing" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "kb-progress"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: (s.progress || 0) + "%"
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "kb-status kb-status--indexing"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot pulse"
  }), "Indexing")) : /*#__PURE__*/React.createElement("span", {
    className: "kb-status kb-status--indexed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Indexed"), /*#__PURE__*/React.createElement("button", {
    className: "kb-row-x",
    onClick: () => removeSource(s.id),
    title: "Remove"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash",
    size: 15
  })))))))));
}
window.KnowledgeBase = KnowledgeBase;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greennode-ai/KnowledgeBase.jsx", error: String((e && e.message) || e) }); }

// ui_kits/greennode-ai/Login.jsx
try { (() => {
/* GreenNode AI UI Kit — Login (email → 6-digit code) */
function Login({
  onSignIn
}) {
  const [step, setStep] = React.useState("email"); // email | code
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState(["", "", "", "", "", ""]);
  const [error, setError] = React.useState("");
  const cellRefs = React.useRef([]);
  const continueEmail = () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid work email.");
      return;
    }
    setError("");
    setStep("code");
    setTimeout(() => cellRefs.current[0] && cellRefs.current[0].focus(), 60);
  };
  const setCell = (i, v) => {
    v = v.replace(/\D/g, "").slice(-1);
    const next = code.slice();
    next[i] = v;
    setCode(next);
    if (v && i < 5) cellRefs.current[i + 1] && cellRefs.current[i + 1].focus();
  };
  const verify = () => {
    if (code.join("").length < 6) {
      setError("Enter the 6-digit code from your Authenticator.");
      return;
    }
    setError("");
    onSignIn();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "login-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-aside glass",
    style: {
      borderRadius: 0,
      border: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-aside-ring"
  }), /*#__PURE__*/React.createElement("div", {
    className: "login-tag"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield-check",
    size: 16
  }), " GreenNode Enterprise AI Cloud"), /*#__PURE__*/React.createElement("h2", null, "Your private AI, on ", /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }, "your own cluster.")), /*#__PURE__*/React.createElement("div", {
    className: "login-features"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-feature"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fi"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 16
  })), "Internal-only data, never leaves your tenant"), /*#__PURE__*/React.createElement("div", {
    className: "login-feature"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fi"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "zap",
    size: 16
  })), "GPU inference on private cluster"), /*#__PURE__*/React.createElement("div", {
    className: "login-feature"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fi"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 16
  })), "ISO 27001 \xB7 SOC 2 Type II"))), /*#__PURE__*/React.createElement("div", {
    className: "login-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-card glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lc-brand"
  }, /*#__PURE__*/React.createElement(BrandMark, {
    size: 36
  }), /*#__PURE__*/React.createElement("span", {
    className: "brand-name"
  }, /*#__PURE__*/React.createElement("span", {
    className: "top",
    style: {
      fontWeight: 800
    }
  }, "GreenNode AI"), /*#__PURE__*/React.createElement("span", {
    className: "sub",
    style: {
      color: "var(--ink-4)",
      fontSize: 11
    }
  }, "Enterprise Assistant"))), step === "email" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h1", null, "Welcome back"), /*#__PURE__*/React.createElement("p", {
    className: "lc-sub"
  }, "Sign in to continue to GreenNode AI"), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Work email"), /*#__PURE__*/React.createElement("div", {
    className: "field-input"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mail",
    size: 16
  }), /*#__PURE__*/React.createElement("input", {
    value: email,
    placeholder: "yourname@vng.com.vn",
    autoFocus: true,
    onChange: e => setEmail(e.target.value),
    onKeyDown: e => e.key === "Enter" && continueEmail()
  }))), error && /*#__PURE__*/React.createElement("div", {
    className: "login-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "btn-block",
    onClick: continueEmail
  }, "Send verification code"), /*#__PURE__*/React.createElement("div", {
    className: "login-divider"
  }, "or continue with"), /*#__PURE__*/React.createElement("div", {
    className: "sso-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "sso-btn",
    onClick: onSignIn
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 16
  }), " SSO (SAML)"), /*#__PURE__*/React.createElement("button", {
    className: "sso-btn",
    onClick: onSignIn
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "globe",
    size: 16
  }), " Google Workspace")), /*#__PURE__*/React.createElement("div", {
    className: "login-foot"
  }, "\xA9 2026 GreenNode \xB7 Internal use only")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h1", null, "Check your email"), /*#__PURE__*/React.createElement("p", {
    className: "lc-sub"
  }, "We sent a 6-digit code to ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, email)), /*#__PURE__*/React.createElement("div", {
    className: "code-inputs"
  }, code.map((c, i) => /*#__PURE__*/React.createElement("input", {
    key: i,
    ref: el => cellRefs.current[i] = el,
    className: "code-cell" + (c ? " filled" : ""),
    value: c,
    inputMode: "numeric",
    maxLength: 1,
    onChange: e => setCell(i, e.target.value),
    onKeyDown: e => {
      if (e.key === "Backspace" && !code[i] && i > 0) cellRefs.current[i - 1].focus();
      if (e.key === "Enter") verify();
    }
  }))), error && /*#__PURE__*/React.createElement("div", {
    className: "login-error",
    style: {
      textAlign: "center",
      marginTop: 10
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    className: "code-hint"
  }, "The code expires in 10 minutes."), /*#__PURE__*/React.createElement("button", {
    className: "btn-block",
    onClick: verify
  }, "Verify & sign in"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 18,
      display: "flex",
      justifyContent: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "link-btn",
    onClick: () => {
      setStep("email");
      setError("");
    }
  }, "Use a different email"), /*#__PURE__*/React.createElement("button", {
    className: "link-btn"
  }, "Resend code"))))));
}
window.Login = Login;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greennode-ai/Login.jsx", error: String((e && e.message) || e) }); }

// ui_kits/greennode-ai/Sidebar.jsx
try { (() => {
/* GreenNode AI UI Kit — Sidebar */
function Sidebar({
  activeId,
  onSelect,
  onNewChat,
  onOpenKB,
  collapsed
}) {
  const S = window.GN.STRINGS;
  const [q, setQ] = React.useState("");
  const groups = window.GN.HISTORY.map(g => ({
    ...g,
    items: g.items.filter(it => it.title.toLowerCase().includes(q.toLowerCase()))
  })).filter(g => g.items.length);
  return /*#__PURE__*/React.createElement("aside", {
    className: "sidebar glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sidebar-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement(BrandMark, {
    size: 30
  }), /*#__PURE__*/React.createElement("span", {
    className: "brand-name"
  }, /*#__PURE__*/React.createElement("span", {
    className: "top"
  }, S.brand), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, S.brandSub)))), /*#__PURE__*/React.createElement("button", {
    className: "sidebar-new",
    onClick: onNewChat
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), S.newChat), /*#__PURE__*/React.createElement("button", {
    className: "sidebar-kb",
    onClick: onOpenKB
  }, /*#__PURE__*/React.createElement("span", {
    className: "sidebar-kb-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "library",
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "sidebar-kb-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sidebar-kb-title"
  }, "Knowledge Base"), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-kb-sub"
  }, S.kbManage)), /*#__PURE__*/React.createElement("span", {
    className: "sidebar-kb-tag"
  }, "Admin")), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-search"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 14
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: S.searchPlaceholder
  })), /*#__PURE__*/React.createElement("div", {
    className: "history-scroll"
  }, groups.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.group
  }, /*#__PURE__*/React.createElement("div", {
    className: "history-group-label"
  }, g.group), g.items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.id,
    className: "history-item" + (it.id === activeId ? " active" : ""),
    onClick: () => onSelect(it.id)
  }, it.pinned && /*#__PURE__*/React.createElement("span", {
    className: "pin"
  }), /*#__PURE__*/React.createElement("span", {
    className: "title"
  }, it.title))))), !groups.length && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 14px",
      fontSize: 12.5,
      color: "var(--ink-4)"
    }
  }, "No conversations found.")), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "user-chip"
  }, /*#__PURE__*/React.createElement("span", {
    className: "avatar"
  }, window.GN.USER.initials), /*#__PURE__*/React.createElement("span", {
    className: "meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, window.GN.USER.name), /*#__PURE__*/React.createElement("div", {
    className: "role"
  }, window.GN.USER.role))), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Settings"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 16
  }))));
}
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greennode-ai/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/greennode-ai/assets/icons.js
try { (() => {
/* ============================================================
   GreenNode AI — Icon set
   Ported verbatim from src/frontend/components/greennode/Icon.tsx
   Lucide-style line icons: 24×24 viewBox, 1.6 stroke, round caps/joins.
   Usage (vanilla): el.innerHTML = gnIcon('search', 16)
   Usage (string):  `<span>${gnIcon('send')}</span>`
   ============================================================ */
(function (root) {
  // Inner markup for each icon (everything inside <svg>).
  var PATHS = {
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    "send": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "paperclip": '<path d="M21 11.5 12.5 20a5 5 0 1 1-7-7L14 4.5a3.5 3.5 0 1 1 5 5L10.5 18a2 2 0 1 1-3-3l7-7"/>',
    "sparkles": '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    "settings": '<path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/><circle cx="12" cy="12" r="3"/>',
    "menu": '<path d="M4 6h16M4 12h16M4 18h16"/>',
    "x": '<path d="M18 6 6 18M6 6l12 12"/>',
    "copy": '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    "check": '<path d="m5 12 5 5 9-11"/>',
    "refresh": '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
    "thumbs-up": '<path d="M7 22V11M2 13v7a2 2 0 0 0 2 2h2V11H4a2 2 0 0 0-2 2zm5-2 4-9a2.5 2.5 0 0 1 5 0v5h5a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2h-9a2 2 0 0 1-2-2"/>',
    "thumbs-down": '<path d="M17 2v11M22 11V4a2 2 0 0 0-2-2h-2v11h2a2 2 0 0 0 2-2zm-5 2-4 9a2.5 2.5 0 0 1-5 0v-5H3a2 2 0 0 1-2-2l2-7a3 3 0 0 1 3-2h9a2 2 0 0 1 2 2"/>',
    "edit": '<path d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/>',
    "code": '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
    "bar-chart": '<path d="M3 3v18h18M8 17V9M13 17V5M18 17v-5"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    "logout": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    "share": '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
    "trash": '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>',
    "sidebar-collapse": '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M10 4v16"/><path d="m17 9-3 3 3 3"/>',
    "sidebar-expand": '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M10 4v16"/><path d="m13 9 3 3-3 3"/>',
    "sidebar-toggle": '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M10 4v16"/>',
    "book": '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    "library": '<path d="M3 4v16M8 4v16M12 4v16M17 7l4 13M21 20H3"/>',
    "upload": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    "link": '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07L11 5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.99-1.99"/>',
    "folder": '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    "crown": '<path d="M3 7l4 4 5-7 5 7 4-4-2 11H5L3 7z"/><path d="M5 21h14"/>',
    "check-circle": '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    "more": '<circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/><circle cx="5" cy="12" r="1.4" fill="currentColor"/>',
    "user": '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    "users": '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    "building": '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10M9 6h.01M14 6h.01M9 10h.01M14 10h.01"/>',
    "palette": '<circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    "lock": '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/>',
    "mail": '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/>',
    "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "eye": '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "eye-off": '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-10-7-10-7a18.45 18.45 0 0 1 3.36-4.83M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>',
    "shield-check": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    "zap": '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    "pin": '<path d="M12 17v5M9 10.76V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4.76a2 2 0 0 0 .54 1.36l1.92 2.13A1 1 0 0 1 16.74 16H7.26a1 1 0 0 1-.72-1.75l1.92-2.13a2 2 0 0 0 .54-1.36z"/>',
    "stop": '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>'
  };

  // The brand "node-eye" mark: a green ring with a dark center.
  // Two-tone (not currentColor) — matches Icon.tsx exactly.
  function nodeEye(size) {
    size = size || 16;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24">' + '<circle cx="12" cy="12" r="9" fill="none" stroke="#1ED760" stroke-width="4.2"/>' + '<circle cx="12" cy="12" r="2.6" fill="#0E1116"/></svg>';
  }
  function gnIcon(name, size) {
    size = size || 16;
    if (name === "node-eye") return nodeEye(size);
    var inner = PATHS[name] || "";
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' + 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  gnIcon.names = Object.keys(PATHS).concat(["node-eye"]);
  gnIcon.paths = PATHS;
  root.gnIcon = gnIcon;
  if (typeof module !== "undefined" && module.exports) module.exports = gnIcon;
})(typeof window !== "undefined" ? window : this);
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greennode-ai/assets/icons.js", error: String((e && e.message) || e) }); }

// ui_kits/greennode-ai/components.jsx
try { (() => {
/* GreenNode AI UI Kit — shared atoms: Icon, MeshBackground, inline markdown */

// Icon — wraps the gnIcon() SVG-string helper from assets/icons.js
function Icon({
  name,
  size = 16,
  className,
  style
}) {
  return React.createElement("span", {
    className,
    style: Object.assign({
      display: "inline-grid",
      placeItems: "center",
      lineHeight: 0
    }, style),
    dangerouslySetInnerHTML: {
      __html: window.gnIcon(name, size)
    }
  });
}

// The drifting mint mesh background (orbs).
function MeshBackground() {
  return /*#__PURE__*/React.createElement("div", {
    className: "mesh-bg",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mesh-orb o1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mesh-orb o2"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mesh-orb o3"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mesh-orb o4"
  }));
}

// Brand mark tile (node-eye glyph in a glass square).
function BrandMark({
  size = 30
}) {
  const inner = Math.round(size * 0.7);
  return /*#__PURE__*/React.createElement("span", {
    className: "brand-mark",
    style: {
      width: size,
      height: size
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "node-eye",
    size: inner
  }));
}

// Minimal inline markdown: **bold** and `code`.
function renderInline(text) {
  const nodes = [];
  let i = 0,
    key = 0;
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let m,
    last = 0;
  while (m = re.exec(text)) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(/*#__PURE__*/React.createElement("strong", {
      key: key++
    }, m[2]));else if (m[3] !== undefined) nodes.push(/*#__PURE__*/React.createElement("code", {
      key: key++
    }, m[3]));
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// Lightweight syntax tinting for a few token classes in code blocks.
function highlight(raw, lang) {
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = esc(raw);
  // comments
  html = html.replace(/(#.*$)/gm, '<span class="tok-com">$1</span>');
  // strings
  html = html.replace(/(&quot;[^&]*?&quot;|"[^"]*")/g, '<span class="tok-str">$1</span>');
  // numbers
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  // keywords
  html = html.replace(/\b(module|source|version|resource|greennode|rollout|create)\b/g, '<span class="tok-kw">$1</span>');
  return html;
}
Object.assign(window, {
  Icon,
  MeshBackground,
  BrandMark,
  renderInline,
  highlight
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greennode-ai/components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/greennode-ai/data.js
try { (() => {
/* GreenNode AI UI Kit — mock content (English subset of the product's data.ts) */
window.GN = function () {
  const STRINGS = {
    brand: "GreenNode AI",
    brandSub: "Enterprise Assistant",
    newChat: "New chat",
    searchPlaceholder: "Search conversations…",
    chatTitle: "Enterprise Assistant",
    chatSub: "Connected to internal knowledge · GreenNode Cloud",
    composerPlaceholder: "Ask anything about your data, docs, or workflows…",
    composerHint: "GreenNode can make mistakes. Check important info.",
    heroEyebrow: "GreenNode Enterprise · Internal",
    heroTitle1: "How can I help you,",
    heroTitle2: "today?",
    heroLede: "Ask about company data, summarize docs, generate code, or brainstorm. Everything stays inside your GreenNode tenant.",
    you: "You",
    bot: "GreenNode AI",
    sources: "Sources",
    regenerate: "Regenerate",
    copy: "Copy",
    copied: "Copied",
    share: "Share",
    kbManage: "Manage knowledge",
    kbAdmin: "Admin only"
  };
  const PROMPTS = [{
    icon: "file-text",
    title: "Summarize the Q3 infrastructure report",
    desc: "Pull key metrics, risks and action items"
  }, {
    icon: "bar-chart",
    title: "Explain our internal token pricing",
    desc: "From the latest enterprise pricing doc"
  }, {
    icon: "code",
    title: "Write a Terraform module for GPU nodes",
    desc: "H100, 8-GPU cluster, with autoscaling"
  }, {
    icon: "search",
    title: "Find clients with expiring contracts",
    desc: "Within the next 60 days, sorted by ARR"
  }];
  const HISTORY = [{
    group: "Today",
    items: [{
      id: "c1",
      title: "GPU cluster cost optimization",
      pinned: true
    }, {
      id: "c2",
      title: "Q3 OKR review — Platform team"
    }, {
      id: "c3",
      title: "Kafka retention policy draft"
    }]
  }, {
    group: "Yesterday",
    items: [{
      id: "c4",
      title: "Llama 3.1 fine-tune dataset"
    }, {
      id: "c5",
      title: "Vendor security questionnaire"
    }]
  }, {
    group: "Last 7 days",
    items: [{
      id: "c6",
      title: "Migration plan: us-east → ap-se"
    }, {
      id: "c7",
      title: "ISO 27001 evidence summary"
    }, {
      id: "c8",
      title: "Onboarding doc — DevRel"
    }]
  }];
  const USER = {
    name: "Phạm Phú Khánh",
    initials: "PK",
    email: "khanhpp@vng.com.vn",
    role: "Platform Engineering"
  };

  // Markdown-ish reply blocks rendered by the kit's tiny renderer.
  const REPLIES = {
    default: [{
      p: "Sure — here's a quick take."
    }, {
      p: "**TL;DR.** Based on the latest data in your tenant, I'd suggest a phased rollout: stage in **ap-southeast-1** first, validate the canary for 48 hours, then promote."
    }, {
      h3: "Why this works"
    }, {
      ol: ["Lower blast radius — only 8% of traffic", "The canary mirrors prod KV cache config", "Rollback path is automated via the platform CLI"]
    }, {
      code: {
        lang: "bash",
        lines: [["kw", "greennode"], [" rollout create \\"]],
        raw: "greennode rollout create \\\n  --service inference-gateway \\\n  --canary 8% \\\n  --region ap-southeast-1 \\\n  --auto-rollback"
      }
    }, {
      quote: "Heads up: the new shape uses **H100 80GB**. Confirm reservation in capacity dashboard before promoting."
    }, {
      p: "Want me to draft the runbook too?"
    }, {
      cite: ["Q3 Infrastructure Report.pdf", "Platform Runbook v3.pdf"]
    }],
    report: [{
      p: "I've parsed the **Q3 Infrastructure Report** (47 pages, uploaded 12 min ago)."
    }, {
      h3: "Key metrics"
    }, {
      ul: ["**Uptime:** 99.987% (target 99.95% ✓)", "**P95 inference latency:** 142ms (down 18% QoQ)", "**GPU utilization:** 71% avg, peak 94%", "**Cost per 1M tokens:** $0.42 (down from $0.51)"]
    }, {
      h3: "Risks flagged"
    }, {
      ol: ["**Capacity headroom** on ap-southeast-1 is at 12% — order lead time is 8 weeks", "**Two Sev-2 incidents** in September, both root-caused to upstream KV cache eviction", "**Vendor concentration:** 78% of GPU spend with a single supplier"]
    }, {
      p: "Want me to draft the exec summary?"
    }, {
      cite: ["Q3 Infrastructure Report.pdf"]
    }],
    code: [{
      p: "Here's a starting point — opinionated, ready to slot into your IaC repo:"
    }, {
      code: {
        lang: "hcl",
        raw: 'module "gpu_cluster" {\n  source  = "greennode/k8s-gpu/aws"\n  version = "~> 2.4"\n\n  cluster_name    = "inference-prod"\n  region          = "ap-southeast-1"\n  node_pool_size  = 8\n  instance_type   = "p5.48xlarge"   # 8x H100 80GB\n\n  autoscaling = {\n    min_nodes = 2\n    max_nodes = 16\n    metric    = "gpu_utilization"\n  }\n}'
      }
    }, {
      ul: ["The `p5.48xlarge` shape gives you ~989 TFLOPS BF16 per node", "Autoscaling is metric-based — swap to schedule-based if load is predictable", "Tags follow the GreenNode tagging convention for cost allocation"]
    }, {
      cite: ["Platform Runbook v3.pdf", "Internal Token Pricing v4.docx"]
    }]
  };
  function pickReply(text) {
    const t = (text || "").toLowerCase();
    if (/terraform|code|module|gpu cluster|node/.test(t)) return REPLIES.code;
    if (/q3|report|infrastructure|metric|summar/.test(t)) return REPLIES.report;
    return REPLIES.default;
  }
  const KB_BASES = [{
    id: "kb1",
    name: "Engineering Docs",
    desc: "Runbooks, post-mortems, ADRs, infra guides",
    icon: "code",
    color: "#1ED760",
    sources: 8,
    chunks: 2547,
    dept: "Engineering",
    updated: "2 hours ago"
  }, {
    id: "kb2",
    name: "Pricing & Sales",
    desc: "Internal pricing model, deal docs, contracts",
    icon: "bar-chart",
    color: "#5F8CE6",
    sources: 6,
    chunks: 824,
    dept: "Sales Eng",
    updated: "1 day ago"
  }, {
    id: "kb3",
    name: "HR & Policies",
    desc: "Employee handbook, benefits, security policies",
    icon: "shield-check",
    color: "#F0B450",
    sources: 12,
    chunks: 1432,
    dept: "HR",
    updated: "3 days ago"
  }, {
    id: "kb5",
    name: "MSS Playbooks",
    desc: "SOC playbooks, incident response, on-call runbooks",
    icon: "shield-check",
    color: "#7A6FE6",
    sources: 9,
    chunks: 1108,
    dept: "MSS",
    updated: "1 hour ago"
  }];
  const KB_SOURCES = [{
    id: "k1",
    type: "pdf",
    name: "Q3 Infrastructure Report.pdf",
    size: "4.2 MB",
    chunks: 312,
    status: "indexed",
    updated: "2 days ago"
  }, {
    id: "k2",
    type: "docx",
    name: "Internal Token Pricing v4.docx",
    size: "182 KB",
    chunks: 28,
    status: "indexed",
    updated: "12 hours ago"
  }, {
    id: "k3",
    type: "xlsx",
    name: "ISO 27001 Controls Matrix.xlsx",
    size: "1.1 MB",
    chunks: 94,
    status: "indexed",
    updated: "5 days ago"
  }, {
    id: "k4",
    type: "pdf",
    name: "Platform Runbook v3.pdf",
    size: "2.6 MB",
    chunks: 184,
    status: "indexing",
    progress: 64,
    updated: "now"
  }];
  return {
    STRINGS,
    PROMPTS,
    HISTORY,
    USER,
    REPLIES,
    pickReply,
    KB_BASES,
    KB_SOURCES
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greennode-ai/data.js", error: String((e && e.message) || e) }); }

__ds_ns.LiquidGlass = __ds_scope.LiquidGlass;

__ds_ns.GlassCard = __ds_scope.GlassCard;

__ds_ns.GlassButton = __ds_scope.GlassButton;

__ds_ns.GlassDock = __ds_scope.GlassDock;

__ds_ns.LiquidGlassContainer = __ds_scope.LiquidGlassContainer;

__ds_ns.GlassMerge = __ds_scope.GlassMerge;

__ds_ns.RootLayout = __ds_scope.RootLayout;

__ds_ns.Icon = __ds_scope.Icon;

})();
