# Design System Document

## 1. Overview & Creative North Star: "The Paddock Engineering"

This design system is built to evoke the high-pressure, high-precision atmosphere of an F1 pit wall. We are moving away from the "flat web" look of the original screens toward a **High-Performance Technical Editorial** aesthetic.

The Creative North Star is **"The Paddock Engineering"**—a philosophy where every pixel serves a purpose, data is king, and the interface feels like a custom-machined tool. We break the grid through intentional asymmetry, using "telemetry-style" data clusters and overlapping high-contrast typography to create a sense of mechanical depth. The layout should feel like a sophisticated head-up display (HUD) rather than a standard webpage.

## 2. Colors

Our palette is rooted in the "Carbon & Tarmac" foundation of motorsport, punctuated by aggressive, high-visibility accents.

- **Foundation:** The `surface` (`#131315`) and `surface_container` tiers provide a deep charcoal base that eliminates eye strain while allowing accent colors to "pop" with neon-like intensity.

- **Accents:**

- `primary` (`#ffb4a8`) and `primary_container` (`#e10600`) are your "Race Red," used for critical actions and alerts.

- `secondary` (`#bdf4ff`) and `secondary_fixed_dim` (`#00daf3`) provide a "Technical Cyan" for data visualization and secondary metrics.

- `tertiary` (`#cdcd00`) acts as the "Warning Yellow," perfect for flagging locked states or qualifying sessions.

### The "No-Line" Rule

**Explicit Instruction:** Do not use 1px solid borders to define sections. In a high-end system, boundaries are felt, not seen. Separate the "Select Race" module from the "Leaderboard" using background shifts alone (e.g., placing a `surface_container_high` card on a `surface` background). If you need more definition, use vertical white space (Spacing `12` or `16`).

### Surface Hierarchy & Nesting

Treat the UI as a physical stack of materials.

- **Layer 1 (The Track):** `background` (`#131315`).

- **Layer 2 (The Chassis):** `surface_container_low` for large content areas.

- **Layer 3 (The Component):** `surface_container_highest` for individual cards.

This nesting creates a sense of "machined parts" fitting together perfectly.

### The "Glass & Gradient" Rule

To add visual "soul," use subtle linear gradients on primary surfaces (e.g., `primary` transitioning to `primary_container` at a 45-degree angle). For floating overlays or navigation bars, use **Glassmorphism**: `surface_variant` at 60% opacity with a `20px` backdrop-blur to allow the "racing glow" of the background to bleed through.

## 3. Typography

We use a dual-font system to balance technical precision with modern readability.

- **Display & Headlines (Space Grotesk):** This is our "Timing Screen" font. It is wide, bold, and unapologetically technical. Use `display-lg` for race titles and `headline-sm` for section headers. The letter-spacing should be slightly tightened for a dense, high-performance look.

- **Body & Titles (Inter):** For high-density data like standings and driver names, Inter provides maximum legibility. Use `body-md` for the bulk of the list data.

- **Labels (Space Grotesk):** All uppercase. Use `label-sm` for metadata like "JOIN CODE" or "FASTEST LAP," mimicking the etched labels on a steering wheel.

## 4. Elevation & Depth

In "The Paddock Engineering," depth is achieved through light and material, not artificial drop shadows.

- **The Layering Principle:** Instead of a shadow, place a `surface_container_lowest` item inside a `surface_container_high` area to create an "inset" or "carved" look.

- **Ambient Shadows:** For floating elements (like a prediction modal), use a high-dispersion shadow: `0px 20px 40px rgba(0, 0, 0, 0.4)`. The shadow must feel like ambient occlusion, not a hard drop shadow.

- **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` at **15% opacity**. This creates a "metallic sheen" edge rather than a flat line.

- **Carbon Fiber Texture:** On primary hero cards, apply a subtle 5% opacity noise or diagonal micro-pattern to mimic the texture of raw carbon fiber.

## 5. Components

### Buttons

- **Primary:** High-gloss. Gradient from `primary` to `primary_container`. Corner radius `DEFAULT` (0.25rem) for a sharp, precision-cut look.

- **Secondary:** Ghost style. Transparent background with a `Ghost Border` and `secondary` text.

- **States:** On hover, primary buttons should "glow" using a `primary` outer shadow with 20% opacity.

### Data Visualization (Lists & Leaderboards)

- **Cards:** Forbid the use of divider lines. Use `surface_container_low` and `surface_container_high` to alternate rows or highlight the "User" row.

- **Asymmetry:** Use a "Leading Edge" accent—a 4px vertical bar of `primary` or `tertiary` color on the left side of a card to denote "Active" or "Live" status.

### Progress & Status

- **Chips:** Use `full` roundedness for status chips (e.g., "Synced"). Background should be `surface_container_highest` with `on_surface` text.

- **Input Fields:** Use `surface_container_lowest` for the field background. The focus state should utilize a `secondary` (Cyan) ghost border to indicate "System Active."

### Additional Component: The "Telemetry Bar"

A custom data visualization component for driver performance. Use thin, horizontal bars using the Spacing Scale `0.5` or `1` with gradients to show point distributions.

## 6. Do's and Don'ts

### Do:

- **DO** use monochromatic color shifts to create hierarchy before reaching for a new color.

- **DO** lean into the technical nature of `Space Grotesk` for all numeric data (Points, Times, Ranks).

- **DO** allow elements to overlap slightly (e.g., a driver number sitting partially outside a card boundary) to create a bespoke, editorial feel.

### Don't:

- **DON'T** use 100% white (`#FFFFFF`). Always use `on_surface` (`#e5e1e4`) to maintain the dark-room "pit wall" atmosphere.

- **DON'T** use large corner radii. Stick to `DEFAULT` (4px) or `sm` (2px). Large rounded corners feel like consumer "soft" apps; we want "hard" engineering.

- **DON'T** use standard grey shadows. If a shadow is needed on a red button, tint the shadow with a hint of red to simulate light bounce.
