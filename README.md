# Mode Overlap

A browser game and training tool for building intuition about **photonic mode matching and mismatch loss**. Given two normalized optical modes at a common waist plane, estimate how much they overlap (η) and what mode-mismatch loss that implies.

Built with [SvelteKit](https://svelte.dev/) and TypeScript, shipped as a static site. The physics core is dependency-free ES modules so it can run in the browser, in a Node test runner, and in build scripts.

## Features

- **Gallery** — browse mode pairs with physical axes, geometry overlays and overlap integrands.
- **Speedrun** — 20 questions: estimate overlap, mismatch loss and the dominant effect, with a transparent score and reveal panel.
- **Practice** — unlimited questions from a chosen category with local statistics.
- **Flash presentation** — every A/B question is shown as a single toggling/flashing panel by default (shared extent and color scale, adjustable rate, manual toggle, Space). Side-by-side is optional, never the default.
- **Deterministic content** — questions come from a seeded generator plus a shipped analytic example bank, so runs are reproducible.

## Quick start

Requires **Node >= 20**.

```sh
npm install
npm run dev        # SvelteKit dev server
```

Other commands:

```sh
npm test           # node --test over physics, cache, scoring, session, mode store
npm run check      # svelte-check
npm run build      # static site into build/

npm run cache:build   # rebuild the analytic question cache
npm run cache:audit   # audit the shipped cache bank
npm run cache:modes   # build the nominal waveguide-mode gallery (experimental scalar)
```

## Project structure

```
data/                 presets.json (18 nominal fiber/guide/SSC/hybrid presets), examples.json (20 mandatory examples)
src/physics/          materials, meshes, Gaussian overlap, 1D slab FDE, 2D scalar FEM, projection
src/scenarios/        deterministic sampling and balanced alignment bank
src/solver/           dedup/cancel/telemetry solve queue and provenance gate
src/storage/          canonical content keys and IndexedDB mode store (memory fallback)
src/lib/              scoring, session, explanation core, adaptive profile, Svelte components
src/routes/           SvelteKit routes: gallery, speedrun, practice
static/cache/         manifest.json (146 ready analytic examples + 14 pending recipes) and question cache
scripts/              cache build/audit and mode gallery builders
tests/                node --test suites
DevLog/               product brief, physics knowledge base, game design and coding logs
```

## Physics and validation

All lengths are µm unless explicitly named otherwise. Fiber MFD is the intensity 1/e² diameter in the Gaussian model.

- Ready answers are **scalar paraxial Gaussian overlaps** at a common waist plane. Mode-mismatch loss is `−10·log₁₀(η)`; exact zero overlap is encoded as `lossDB: null` with `lossIsInfinite: true`. This is not a claim of exact interface insertion loss.
- The **1D slab full-vector FDE** (TE/TM) is validated against closed-form dispersion. Common-grid flux overlap and the `solveModes` dispatcher build on it.
- The **2D scalar FEM** backend is validated in the slab limit only and is **not release-eligible**; the 2D full-vector backend and its external benchmark are still pending.
- Waveguide questions built at runtime are **experimental scalar quasi-TE**, not full-vector, and are labelled as such. Full-vector and anisotropic scenarios stay disabled until C3 supplies validated fields; the vector `Sz` control is explicitly disabled.
- Materials are sourced isotropic indices with hard validity windows.

`data/presets.json` holds nominal configurations with bounded candidate RNG and sources. See the [preset/RNG knowledge base](DevLog/knowledge-base/005-presets-and-randomization.md) for evidence, educational ranges and validity limits.

## Cache

`static/cache/manifest.json` describes 146 ready analytic examples and references 14 pending numerical recipes. Rebuilds reuse verified identical entries and repair corrupt entries. To build into a separate directory:

```sh
node scripts/build-cache.mjs /tmp/mode-overlap-cache
```

Default paths resolve from the script location; `cache:audit` checks the project's shipped bank.

## Documentation

Start with the [DevLog execution index](DevLog/README.md). Key records:

- [Original product brief](DevLog/000-initial-discussion.md)
- [Physics contract](DevLog/knowledge-base/002-physics-and-validation.md)
- [Presets and randomization](DevLog/knowledge-base/005-presets-and-randomization.md)
- [Vector solver and validation](DevLog/coding/007-vector-solver-and-validation.md)
- [Foundation results](DevLog/coding/009-foundation-results.md)
