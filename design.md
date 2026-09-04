---
version: alpha
name: HackerAI Dark
description: A stark, security-focused dark interface with high-contrast typography and restrained interactive chrome.
colors:
  primary: "#FFFFFF"
  secondary: "#A0A0A0"
  tertiary: "#333333"
  neutral: "#141414"
  surface: "#1A1A1A"
  on-surface: "#FFFFFF"
  error: "#FF5A5F"
  border: "#333333"
  muted: "#757575"
  overlay: "#000000"
typography:
  headline-display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: 700
    lineHeight: 48px
    letterSpacing: 0px
  headline-lg:
    fontFamily: Geist
    fontSize: 39px
    fontWeight: 700
    lineHeight: 47px
    letterSpacing: 0px
  headline-md:
    fontFamily: Geist
    fontSize: 31px
    fontWeight: 600
    lineHeight: 37px
    letterSpacing: 0px
  headline-sm:
    fontFamily: Geist
    fontSize: 25px
    fontWeight: 600
    lineHeight: 30px
    letterSpacing: 0px
  body-lg:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: 400
    lineHeight: 30px
    letterSpacing: 0px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0px
  link-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 6px
  md: 10px
  lg: 22px
  xl: 28px
  full: 9999px
spacing:
  xs: 2px
  sm: 10px
  md: 24px
  lg: 60px
  xl: 194px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    size: "74px"
    height: "36px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    size: "74px"
    height: "36px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "0px"
    size: "0px"
    height: "0px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "12px 0px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  chip:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "6px 10px"
---

## Overview
HackerAI feels like a focused security tool rather than a consumer lifestyle brand: dark, technical, and confident. The visual tone is spacious and calm, using a lot of negative space to keep the interface from feeling noisy even when the subject matter is dense. Interaction chrome is minimal, with the main emphasis placed on a bold central prompt and quick-access navigation actions.

## Colors
- **Primary (#FFFFFF):** Bright white is the dominant accent for key actions, the logo, and the main headline, giving the interface a crisp high-contrast presence.
- **Neutral (#141414):** The base background is a near-black charcoal that creates a stealthy, professional mood and lets white text read with maximum clarity.
- **Surface (#1A1A1A):** Slightly lighter than the page background, this surface tone is used for the prompt card and other raised UI areas to create subtle separation without breaking the dark theme.
- **Tertiary (#333333):** A restrained border and divider color used for button outlines, card edges, and other low-emphasis structural lines.
- **Secondary (#A0A0A0):** Muted gray text used for supporting copy, placeholder text, and secondary navigation labels.
- **On-surface (#FFFFFF):** The main text color on dark surfaces, ensuring legibility and maintaining the brand’s stark contrast language.
- **Error (#FF5A5F):** Reserved for destructive states or alerts; it is not prominent in the screenshot but fits the system’s security-oriented context.
- **Border (#333333):** A dedicated structural border token matching the visible fine outlines around cards and secondary controls.
- **Muted (#757575):** A quieter gray for footnotes, legal text, and low-priority metadata.
- **Overlay (#000000):** Use for modal scrims and deep shadow coloration when an even darker layer is needed.

## Typography
Geist is the single typeface across the experience, which reinforces the modern, technical tone. Headings are bold and compact, with the main hero using `headline-display` at 48px/48px to feel assertive and precise. Body copy uses lighter weights and comfortable line heights for readability, while labels and buttons rely on 14px–16px medium weights to stay legible without competing with the hero.

The system is clean and mostly neutral in letter-spacing, with no visible uppercase tracking treatment in the screenshot. That keeps the product approachable and functional rather than editorial or ornamental. Links and utility text should remain modest and readable, with no exaggerated typographic contrast beyond size and weight.

## Layout
The layout is center-weighted and highly spacious, with the hero block sitting in a large open field of negative space. A narrow top navigation bar anchors the page, while the main content uses a fixed-center composition instead of a dense multi-column grid. Vertical rhythm is intentionally loose, guided by the spacing scale in `xs` 2px, `sm` 10px, `md` 24px, `lg` 60px, and the expansive `xl` 194px separation that creates the page’s airy feel.

Card and input surfaces use generous internal padding and rounded edges rather than heavy section containers. Page edges remain clean and minimally framed, so the content can breathe and the central CTA feels like the clear focal point.

## Elevation & Depth
Depth is subtle and mostly achieved through tonal layering rather than dramatic shadow. The page background, surface cards, and outlined buttons form a quiet stack of contrast, with only a faint shadow used on controls and the main card to lift them slightly from the background. Borders are thin and dark, preserving the flat, restrained security-aesthetic.

Because the interface is intentionally quiet, elevation should never feel glossy or material-heavy. Prefer outline separation, tonal shifts, and minimal shadow over pronounced blur or floating effects.

## Shapes
The shape language is soft but disciplined. Interactive elements use a 10px radius, which gives buttons a friendly but utilitarian feel, while larger surfaces such as the prompt card use a 22px radius for a smoother, more polished container. The overall impression is rounded enough to soften the dark theme, but still precise and enterprise-oriented.

Full pills are reserved for tiny utilities like chips or circular affordances, while squared-off elements are avoided unless a link or inline text action is needed.

## Components
Buttons are restrained and high-contrast. `button-primary` is a white-filled button with black text, 8px 16px padding, 36px height, and a 10px radius; it should be used for the strongest call to action such as “Sign in” or “Get started.” `button-secondary` is transparent with a dark border and white text, matching the less prominent but still important actions such as navigation utilities. `button-tertiary` should be used sparingly for inline text actions and links, keeping padding and framing minimal.

Cards use the `card` treatment: dark surface, 22px rounding, a thin border, and only subtle shadow. They should feel like embedded panels rather than floating widgets. Inputs should follow the same tonal surface as cards, with clear padding and gentle rounding so the search/prompt field remains approachable and easy to scan.

The hero prompt area is the most important composite component: it needs a large text entry zone, muted placeholder text, and small utility affordances like the plus icon and submit arrow. Those controls should remain visually quiet so the prompt itself stays dominant. Chips, if used, should be compact pill surfaces with white text on a darker background and minimal visual weight.

Navigation links should be simple, low-chrome text items, with the brand mark staying white and prominent. Footer legal links should remain understated but clearly underlined to signal interactivity.

## Do's and Don'ts
- Do keep the interface dark, sparse, and high-contrast.
- Do use Geist consistently for every text style and control label.
- Do preserve generous negative space around the hero and prompt area.
- Do rely on thin borders and tonal changes instead of heavy shadows.
- Don't introduce bright accent colors beyond the established white-on-charcoal system.
- Don't make cards or buttons feel glossy, neon, or overly dimensional.
- Don't crowd the layout with dense multi-column content or tight vertical stacking.
- Don't use large radii inconsistently; keep buttons at 10px and panels around 22px.