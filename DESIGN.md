---
name: Delistings Nightwatch
colors:
  background: "#07090e"
  background-top-glow: "#121826"
  surface-1: "#0f1320"
  surface-2: "#171d2e"
  surface-3: "#20283d"
  text-primary: "#f4f6ff"
  text-secondary: "#c9d0e8"
  text-muted: "#95a0c3"
  border-subtle: "#2a3248"
  border-strong: "#3b4767"
  primary: "#8b5cf6"
  primary-hover: "#9d74ff"
  secondary: "#38bdf8"
  success: "#22c55e"
  warning: "#f59e0b"
  danger: "#ef4444"
  info: "#60a5fa"
  steam: "#66c0f4"
  playstation: "#2d6cff"
  xbox: "#107c10"
  nintendo: "#e60012"
  epic: "#ffffff"
gradients:
  app-background: "radial-gradient(circle at top, #121826 0%, #07090e 52%)"
  card-highlight: "linear-gradient(145deg, rgba(139, 92, 246, 0.16), rgba(56, 189, 248, 0.08))"
typography:
  fontFamilyBase: "Inter, Segoe UI, system-ui, sans-serif"
  fontFamilyData: "\"Space Grotesk\", Inter, Segoe UI, system-ui, sans-serif"
  display-lg:
    fontFamily: "Inter, Segoe UI, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: "1.1"
    letterSpacing: "-0.02em"
  headline-md:
    fontFamily: "Inter, Segoe UI, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: "1.25"
    letterSpacing: "-0.01em"
  title-sm:
    fontFamily: "Inter, Segoe UI, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.4"
  body-md:
    fontFamily: "Inter, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.6"
  body-sm:
    fontFamily: "Inter, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.5"
  label-xs:
    fontFamily: "\"Space Grotesk\", Inter, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1.3"
    letterSpacing: "0.06em"
spacing:
  unit: "4px"
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  page-x: "24px"
  page-y: "48px"
  card-padding: "20px"
  section-gap: "48px"
radii:
  none: "0"
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  pill: "9999px"
borders:
  thin: "1px solid #2a3248"
  focus: "1px solid #8b5cf6"
  active: "1px solid #3b4767"
shadows:
  none: "none"
  card: "0 10px 30px rgba(0, 0, 0, 0.35)"
  overlay: "0 18px 45px rgba(0, 0, 0, 0.45)"
  glow-primary: "0 0 0 1px rgba(139, 92, 246, 0.3), 0 0 30px rgba(139, 92, 246, 0.25)"
elevation:
  base:
    background: "#07090e"
    border: "1px solid transparent"
    shadow: "none"
  raised:
    background: "#0f1320"
    border: "1px solid #2a3248"
    shadow: "0 10px 30px rgba(0, 0, 0, 0.35)"
  overlay:
    background: "#171d2e"
    border: "1px solid #3b4767"
    shadow: "0 18px 45px rgba(0, 0, 0, 0.45)"
motion:
  duration-fast: "120ms"
  duration-base: "180ms"
  duration-slow: "280ms"
  easing-standard: "cubic-bezier(0.2, 0, 0, 1)"
  easing-emphasized: "cubic-bezier(0.16, 1, 0.3, 1)"
  hover-lift:
    transform: "translateY(-2px)"
    duration: "180ms"
    easing: "cubic-bezier(0.2, 0, 0, 1)"
  focus-ring:
    boxShadow: "0 0 0 2px rgba(139, 92, 246, 0.45)"
opacity:
  disabled: 0.5
  muted: 0.72
  subtle: 0.9
layout:
  maxWidth: "1280px"
  columns-desktop: 12
  columns-tablet: 8
  columns-mobile: 4
  gutter: "16px"
  breakpoints:
    sm: "640px"
    md: "768px"
    lg: "1024px"
    xl: "1280px"
components:
  app-shell:
    background: "radial-gradient(circle at top, #121826 0%, #07090e 52%)"
    textColor: "#f4f6ff"
    minHeight: "100vh"
  card:
    background: "#0f1320"
    border: "1px solid #2a3248"
    radius: "14px"
    padding: "20px"
    shadow: "0 10px 30px rgba(0, 0, 0, 0.35)"
  chip:
    radius: "9999px"
    padding: "6px 10px"
    font: "0.75rem/1.3 \"Space Grotesk\", Inter, Segoe UI, system-ui, sans-serif"
    border: "1px solid #3b4767"
  input:
    height: "44px"
    background: "#171d2e"
    textColor: "#f4f6ff"
    placeholderColor: "#95a0c3"
    border: "1px solid #2a3248"
    focusBorder: "1px solid #8b5cf6"
    radius: "10px"
  button-primary:
    background: "#8b5cf6"
    textColor: "#f4f6ff"
    radius: "10px"
    padding: "10px 16px"
    hoverBackground: "#9d74ff"
---

## Brand & visual identity

This product should feel like a live archival system for a changing games ecosystem: dark, precise, and information-forward. The visual language is modern and restrained, with a night-sky base and focused color accents that communicate urgency (upcoming delistings), state (already delisted), and platform identity.

The rendered UI currently establishes this tone with a dark radial gradient (`#121826` into `#07090e`), bright near-white text, and clean sans-serif typography. The design system extends that direction into a scalable interface for timeline-heavy browsing and quick scanning.

## Color intent

The palette is anchored in deep blue-black surfaces to keep long sessions comfortable while making metadata and status elements pop. Accent colors are intentionally saturated but used sparingly:

- **Primary purple** drives active controls and focused actions.
- **Secondary cyan** supports highlights and secondary emphasis.
- **Semantic states** (success/warning/danger) are reserved for lifecycle urgency.
- **Platform colors** provide immediate recognition for storefront ecosystems.

All body text should maintain high contrast against surfaces, with muted text only for tertiary metadata.

## Typography intent

Use Inter/system sans for readable UI copy and hierarchy. Use Space Grotesk-style labeling for chips, badges, and compact metadata to give platform/date tags a technical, ledger-like cadence.

Hierarchy should prioritize scan speed:

- Large headline for page identity and trend summaries.
- Medium titles for cards and sections.
- Tight, high-contrast labels for platforms, statuses, and dates.

## Layout, rhythm, and density

The system follows a compact-but-breathable rhythm based on a 4px unit. Cards should feel dense enough for data but never cramped. Major sections are separated by 48px; card internals stay in the 8–16px range for fast scanning.

Use a 12-column desktop grid with 16px gutters and scale to 8/4 columns for tablet/mobile. Keep a centered max width and preserve generous vertical breathing room to avoid a cluttered dashboard feel.

## Elevation and interaction

Depth should come from tonal layering and soft shadows, not heavy skeuomorphism. Most elements sit on subtle raised surfaces with crisp borders. Hover and focus should be lightweight: slight lift, border tint, and controlled glow for keyboard focus.

Motion should be quick and calm (120–280ms), emphasizing clarity over flair.

## Component behavior guidance

- **Cards:** primary information container; always show title, platform, state, and date in a predictable order.
- **Filter chips:** pill-shaped, compact, and easy to scan in wrap layouts.
- **Search/filter bar:** sticky on dense timeline views; must remain legible over scrolling content.
- **Status badges:** semantic color plus concise text label; avoid color-only differentiation.
- **Empty/error/loading states:** maintain the same dark shell and typographic rhythm so state changes feel native, not abrupt.

## Accessibility and readability

Maintain strong contrast for text and controls. Focus rings must remain visible on dark backgrounds. Never rely on hue alone for state meaning; pair color with text labels and iconography where needed.
