# Product

## Register

product

## Users
Content creators, developers, and viewers who need a distraction-free, high-performance platform to host, share, and watch video content. Their primary goal is to upload raw videos smoothly and consume transcoded streams without visual noise. They are aware of and comfortable with the platform's 30-day temporal asset retention model.

## Product Purpose
Rebideo exists to provide a high-end, event-driven video streaming experience. It showcases how serverless cloud architecture (GCP Cloud Run, Pub/Sub, and GCS) can decouple heavy media transcoding from zero-compute client uploads, offering seamless adaptive HLS playback.

## Brand Personality
**Sophisticated, Intentional, Quiet**. The interface acts as a silent gallery or professional editing suite. It steps back, using a dark-by-default environment, allowing the video content, thumbnails, and playback to hold the spotlight.

## Anti-references
- No light themes or bright, saturated background colors.
- No typical SaaS dashboard layouts with thick borders, shadow-heavy white cards, colorful icons, or aggressive call-to-actions.
- No sketch-style SVG decorations, generic template eyebrows, or numbered section markers.

## Design Principles
- **Content First, Interface Second**: The UI should never compete with the videos. Accent colors are used sparingly (≤10%) to draw attention strictly to interactive paths.
- **Atmospheric Gravity**: Leverage deep dark shades, subtle glassmorphism overlay blurs, and micro-interactions to create a premium, weighted aesthetic akin to high-end hardware/cinema consoles.
- **Process Transparency**: Video transcoding is an asynchronous backend process. The frontend must display clean, real-time status updates (Pending, Processing, Active, Failed) to eliminate ambiguity during ingestion.

## Accessibility & Inclusion
- Strict contrast compliance (≥ 4.5:1) for body text and interactive states against the dark Obsidian base.
- Respect user system preferences by handling `@media (prefers-reduced-motion: reduce)` to disable animations/blurs.
- Accessible ARIA labels and keyboard navigation support for custom video player controls.
