# TSC shelter map

- Read README.md and inspect git status before edits; do not overwrite concurrent work.
- Ukrainian UI and documentation. Pilot only TSC 3246.
- Never invent missing route links, direction, categories, approval dates or shelter access.
- `research/traces.json` is the current digitization source. One-off trace helper scripts are historical, not reproducible builders.
- `verified: false` features must never be rendered as confirmed routes or used by the proximity filter.
- Keep entrance verification distinct from official object coordinates.
- Any route changes require original-scheme comparison and regenerated QA overlays; preserve repeated coordinates for repeat passes.
- `npm test`, `npm run build`; `npm run test:e2e` for UI changes.
- Keep OSM attribution, scale, data date and uncertainty visible when controls are hidden. Do not remount or resize the map when hiding controls.
