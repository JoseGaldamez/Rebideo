---
name: Rebideo Minimalist
colors:
  surface: '#111318'
  surface-dim: '#111318'
  surface-bright: '#37393e'
  surface-container-lowest: '#07090d'
  surface-container-low: '#1a1c20'
  surface-container: '#14171f'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#94a3b8'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#948f9a'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#e9ddff'
  on-primary: '#37265e'
  primary-container: '#d0bcff'
  on-primary-container: '#594983'
  inverse-primary: '#665590'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d4'
  on-secondary-container: '#00424e'
  tertiary: '#ffd8e7'
  on-tertiary: '#531c3a'
  tertiary-container: '#ffafd3'
  on-tertiary-container: '#7c3e5d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#210f48'
  on-primary-fixed-variant: '#4d3d76'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffd8e7'
  tertiary-fixed-dim: '#ffafd3'
  on-tertiary-fixed: '#390624'
  on-tertiary-fixed-variant: '#6e3351'
  background: '#111318'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: '1.1'
  headline-lg:
    fontFamily: Sora
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Sora
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '300'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-xs:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
  gutter: 32px
  margin-desktop: 64px
  sidebar-width: 80px
  header-height: 80px
---

## Brand & Style

Rebideo embodies a high-end, cinematic approach to content consumption. The brand personality is **sophisticated, intentional, and quiet**, prioritizing the visual weight of content over the UI itself. 

The design style is a hybrid of **Cinematic Minimalism** and **Glassmorphism**. It utilizes expansive whitespace (or "darkspace"), ultra-thin borders, and deep backdrop blurs to create a sense of premium atmosphere. The UI is designed to feel like a high-end gallery or a professional editing suite, using a "dark mode by default" philosophy to let video thumbnails and hero imagery command the user's full attention.

## Colors

The palette is anchored in **Deep Obsidian (#0a0c10)**, providing a near-infinite depth for the background. Primary accents use a **Muted Lavender (#d0bcff)** for interactive states, while functional elements utilize high-contrast white for maximum legibility against the dark void.

Color roles are strictly hierarchical:
- **Background & Surfaces:** Range from the absolute black of `#07090d` for the sidebar to slightly elevated `#14171f` for interactive containers.
- **Typography:** Primary text is a crisp off-white, while secondary metadata uses a desaturated Slate Blue-Gray (`#94a3b8`) to maintain a low visual profile.
- **Glass Effects:** Overlays use a white tint at 5-10% opacity with high-saturation background blurs (20px+) to create depth without introducing new colors.

## Typography

The system uses a pairing of **Sora** for expressive, geometric headlines and **Inter** for utilitarian, highly legible body text and labels.

- **Headlines:** Sora is used with tight tracking and leading for a modern, editorial feel. High-weight (600-700) headings contrast sharply with thin body text.
- **Body:** Inter is predominantly used at weight 300 (Light) for long-form descriptions to enhance the minimalist aesthetic, switching to 400 (Regular) for standard UI labels.
- **Labels:** Uppercase styling with generous letter spacing (tracking) is used for "overlines" and tactical metadata, creating a professional, technical vibe.

## Layout & Spacing

The layout follows a **Fixed Sidebar / Fluid Content** model. 
- **The Sidebar:** A strictly defined 80px vertical strip houses core navigation icons, keeping the left axis locked.
- **Content Area:** Uses a generous 64px desktop margin to prevent content from feeling cramped against the screen edges. 
- **Grid:** Video cards are arranged in a responsive grid with a 40px horizontal gap and a 64px vertical gap, emphasizing the "breathability" of the layout.
- **Rhythm:** Spacing follows a 4px base unit, with standard increments at 12px (small stacks), 24px (medium elements), and 48px (large section breaks).

## Elevation & Depth

Depth is achieved through **Tonal Separation** and **Glassmorphism** rather than traditional drop shadows.

- **Base Layer:** Background (`#0a0c10`).
- **Mid Layer:** Floating elements like the Sidebar (`#07090d`) or Search Bar use subtle border-right or surface-tint variations to distinguish themselves.
- **Top Layer:** Drawers and Modals utilize `backdrop-blur-xl` (40px blur) and a semi-transparent background (`#0a0c10/95`) to create a physical sense of "overlay" without losing the context of the underlying screen.
- **Interactive Depth:** Video cards use a `translate-y-[-4px]` transform and a deep, soft shadow (`rgba(0,0,0,0.5)`) on hover to simulate physical lifting.

## Shapes

The shape language is **Moderately Rounded** with specific exceptions for extreme roundedness on interactive targets.

- **Standard Containers:** Use a 2px radius for a sharp, professional look on small components (tooltips, tags).
- **Cards & Hero Sections:** Use a "Super-ellipse" feel with 24px to 32px (`3xl`) corners to soften the large visual masses.
- **Interactive Elements:** Buttons, Search Inputs, and Chips are **fully pill-shaped** (9999px) to indicate clickability and provide a friendly contrast to the rigid grid.

## Components

### Buttons
- **Primary:** Black text on a pure White background. Pill-shaped. No border. High-impact.
- **Secondary:** White text on a `white/10` background with a `white/10` border. Pill-shaped. Backdrop blur.

### Input Fields
- **Search:** Pill-shaped, `surface-container/50` fill, no border. Icon prefix with `on-surface-variant` color.
- **Form Inputs:** Border-bottom only (`white/5`). Transition to pure white border on focus. Labels are uppercase, 10px bold, with tracking.

### Video Cards
- **Thumbnail:** 16:9 aspect ratio, 16px radius. Image scales 105% on hover.
- **Metadata:** Title in `body-lg` (White). Channel and views in `body-sm` (`white/40`) separated by 4px dot dividers.

### Chips/Filters
- **Active:** White background, black text, pill-shaped, 12px bold.
- **Inactive:** `surface-container` background, `on-surface-variant` text. 

### Navigation
- **Sidebar Icons:** 28px Material Symbols (Outlined, weight 300). Active state uses `primary` color; inactive uses `on-surface-variant`.
