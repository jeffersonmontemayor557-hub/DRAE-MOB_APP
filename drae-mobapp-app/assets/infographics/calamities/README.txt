Hero images for each hazard (shown at the top of the Infographic guidebook page).

Files are wired in src/data/disasterContent.ts via hazardHeroImage require().

Expected filenames (PNG):
  - landslide.png
  - flood.png
  - earthquake.png
  - fire.png
  - cyclone.png   (for Tropical Cyclone)

Recommended width: 800–1200 px, landscape or square, light background.

Per-tip custom pictures: set `image: require('...')` on individual items inside `disasterGuideContent` (GuideTip uses `tagalog`, `english`, and `icon`; optional `image`), same folder or another path.
