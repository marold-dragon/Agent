# Internal Tool Design Source

## Origin

DESIGN.md was derived from a September 2026 audit of Together AI's public website and official brand/new-look materials.

## Transferable Principles (not proprietary assets)

The design adopts these system-level ideas from Together AI's visual language:

1. **Connectedness** -- Evidence, review, supporting signals, report, and export are visibly connected as a workflow system
2. **Geometric modernist typography** -- Manrope/Inter font stack, strong editorial hierarchy
3. **Restrained neutral surfaces with energetic multi-color nodes** -- Warm canvas (#f5f3ee), white surfaces, violet/magenta/orange/sky accents at meaningful workflow points
4. **Large decisive statements followed by dense technical proof** -- Metric-forward summary, compact review rows
5. **Structured technical content** -- Tables allowed, compact rows preferred, category separators
6. **Product/research content as one connected ecosystem** -- Workflow rail with 5 connected nodes

## Explicitly NOT transferred

- Together AI logo
- Exact Together AI color values
- Proprietary illustrations
- Trademark graphics
- The Future font files
- Together AI copy
- Exact page compositions

## Implementation

The browser workspace implements these principles through:

- CSS custom properties matching DESIGN.md tokens exactly
- Connected 5-node workflow rail (Intake, Review, Domain, Preview, Export)
- Warm editorial canvas background
- White work surfaces with thin structural rules
- Deep ink typography with geometric hierarchy
- Status colors used only for semantic evidence status
- Compact review table layout (not card soup)
- Modest radius (4-14px), minimal shadows, borders first
- Evidence-first layout where human decision is explicitly labeled

The goal is to adopt the **system logic**, not duplicate the brand.
