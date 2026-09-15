# 006 — Cache and deterministic example bank

Status: disk/static analytic cache and recipe bank implemented; IndexedDB and numerical solving planned. Date: 2026-09-13.

Delivered paths: `src/storage/cache.mjs`, `src/physics/gaussian.mjs`, `src/scenarios/generator.mjs`, `data/presets.json`, `data/examples.json`, `scripts/build-cache.mjs`, `static/cache/manifest.json`, `static/cache/questions/*.json`, `static/cache/numerical-recipes.json`. Run `npm run cache:build`; test with `npm test`; inspect coverage with `npm run cache:audit`.

Three layers:

1. Shipped analytic questions store exact model parameters, answer and provenance; analytic fields reconstruct from compact parameters, not PNGs. Actual ready answers are Gaussian only in this pass.
2. Numerical recipe bank stores full nominal geometry selections, requested modes and transformations, `status: pending-vector-solver`, no eta. It covers original mandatory numerical scenarios without inventing results.
3. Future IndexedDB stores validated numerical modes as binary arrays and question results referencing them. Recipe and ready caches are distinct stores/statuses.

Canonical sorted JSON + SHA-256; reject NaN/Infinity/undefined and non-JSON objects. Preserve full finite number values, no rounding to increase hits. Persist sampled parameters. Version the generator, presets, solver, materials, mesh, overlap definition and cache schema. A model key includes full geometry, actual resolved material tensor/functions version, wavelength, mode request, solver tolerances/implementation and boundary/mesh. A pair key additionally includes both field identities, transform and quadrature/overlap settings. Seeds and plot styles do not invalidate identical physics.

Cache reuse strategy: nominal anchor on A in 60% of future numerical questions; choose among validated bank variants in 25%; new continuous geometry in 15% (design choices to measure). Displacement and weak-guidance phase ramps reuse field data; moving only a core relative to a substrate is a new geometry solve. No nearest-neighbor mode reuse without an explicit interpolation error validation. Transform common-grid integration still requires convergence.

Implemented builder supports cold writes, verified warm hits, corrupt-entry repair and deterministic manifest. No wall-clock generation timestamp inside content hashes. Build writes via temporary file + rename. Existing entries are checked against expected content; generated manifest references only current entries. Old unreferenced files may remain; automatic garbage collection is deferred.

- [x] C6.1 Static seed bank, cache schema and canonical keys.
- [x] C6.2 Mandatory 20-case manifest; analytic ready vs numerical pending status.
- [x] C6.3 Balanced analytic pool with bounded attempts and explicit failure on unfilled quota.
- [ ] C6.4 IndexedDB async get/put, blob integrity, schema migration and byte-based LRU (initial 128 MiB configurable target); persistent-store denial/quota → memory + shipped bank.
- [ ] C6.5 In-flight solve deduplication and cancellation, worker queue initial target 10 / low-water 5 / max 20.
- [ ] C6.6 Numerical warm-start import validates solver/material/mesh provenance before eligibility; real-browser reload and quota tests.

Challenge IDs are reproducible content hashes, not anti-cheat. Static client answers are inspectable. A leaderboard requiring trust is separate product scope.
