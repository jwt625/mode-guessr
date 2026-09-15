# 011 — Hybrid BTO/TFLN waveguide specifications

Date: 2026-09-14. **Research and configuration only; geometry construction, material implementation, solving, and release validation remain for the coding agent.**

Machine-readable handoff: [hybrid-waveguides.json](../../data/proposed/hybrid-waveguides.json). This is a proposed catalog, not input to the current runtime. It follows the existing `presets.json` conventions (`category`, `model`, `wavelength_um`, `nominal`, `ranges`, `source_ids`) and adds explicit stack and evidence fields.

## Decision and coverage

Add eight hybrid families covering both vertical orders of BTO/TFLN and Si/SiN. Start with the six literature-anchored families; retain two clearly labeled exploratory designs to complete the matrix. All are straight, longitudinally invariant, passive optical cross-sections at 1.55 µm. A “slab” means an **unetched, laterally continuous ferroelectric film**, not a finite-width ridge or a thick bulk substrate.

| Proposed ID | Bottom → top, above silica substrate | Strip width × height; film; gap (µm) | Evidence |
|---|---|---|---|
| `bto-over-si` | oxide-embedded Si → oxide gap → BTO → air | .500 × .220; .150; .005 | Transferred-film experiment, S1 |
| `bto-over-sin` | oxide-embedded SiN → oxide gap → BTO → air | 1.100 × .150; .080; .020 | Proposed inversion of S2, with assumed bonding gap |
| `tfln-over-si` | oxide-embedded Si → oxide gap → LN → air | .275 × .150; .600; .040 | Hybrid phase-shifter cross-section, S3 |
| `tfln-over-sin` | oxide-embedded SiN → oxide gap → LN → air | 1.500 × .600; .300; .100 | S4 stack; width selected within reported range |
| `si-over-bto` | BTO → Si strip → air | .500 × .220; .150; 0 | Proposed Si loading of an unetched BTO film |
| `sin-over-bto` | BTO → SiN strip, oxide fill/overcladding | 1.100 × .150; .080; 0 | Deposited SiN loading experiment, S2 |
| `si-over-tfln` | LN → Si strip → air | .500 × .340; .500; 0 | S5 simulation/material-platform anchor |
| `sin-over-tfln` | LN → SiN strip → air | 1.000 × .300; .300; 0 | S6 demonstrated platform |

These are nominal educational models, not exact fabricated-device replicas. Rectangular strips, infinite lateral film extent, no electrodes, and semi-infinite silica below the stack are explicit idealizations. The configuration records per-family departures. A published geometry does not imply our material model or solver has been validated.

## Paper extraction ledger

Dimensions below were extracted from article text/captions, not estimated from an image scale bar. No complete papers or copied figures are committed.

### S1 — BTO above Si

[Tao et al., *Towards high quality transferred barium titanate ferroelectric hybrid integrated modulator on silicon*, Light: Advanced Manufacturing (2024), DOI 10.37188/lam.2024.031](https://www.light-am.com/en/article/doi/10.37188/lam.2024.031).

Read Results/Fig. 1 and Methods. Reported: 500 × 220 nm Si, approximately 5 nm residual silica above Si after CMP, 150 nm transferred BTO, and approximately 2 µm oxide beneath the guide. The article uses BTO index 2.38 around 1550 nm and reports (100)-oriented transferred films. This supports `bto-over-si`; it does not establish BTO deposited conformally around the Si strip. Our air cap and laterally infinite film are idealizations. The same dimensions in `si-over-bto` are a proposed inversion, not a demonstrated device from this source.

### S2 — SiN above BTO

[Eltes et al., *Ultra-Low-Power Tuning in Hybrid Barium Titanate–Silicon Nitride Electro-optic Devices on Silicon*, ACS Photonics 6, 2677–2684 (2019)](https://doi.org/10.1021/acsphotonics.9b00558); [full article PDF](https://arxiv.org/pdf/1912.11081).

Read PDF pp. 2–3, Fig. 1, Device Fabrication, and Optical Mode Simulations. Reported: 80 nm BTO, PECVD SiN strip 150 nm tall and 1.1 µm wide, and silica cladding. Device-layer Si is removed before depositing SiN. Reported simulated BTO power fraction is 18%; this is a comparison target only after matching materials and stack. The optical-index table is in Supporting Information Table S1, not extracted here. No residual STO layer is specified in our simplified geometry. `bto-over-sin` inverts this order and adds a selected 20 nm oxide gap; it is exploratory.

### S3 — LN above Si

[Valdez et al., *110 GHz, 110 mW hybrid silicon-lithium niobate Mach-Zehnder modulator*, Scientific Reports 12 (2022), DOI 10.1038/s41598-022-23403-6](https://www.nature.com/articles/s41598-022-23403-6).

Read Theory and design/Fig. 1 and Hybrid Si/LN chip fabrication. Reported: 150 nm Si thickness; widths 275 nm in the phase shifter and 650 nm in the transition section; 600 nm x-cut LN; 3 µm SOI BOX. Residual CMP oxide is less than 50 nm, with approximately 40 nm noted for fabricated structures. Narrow-section simulations report 84% LN and 2% Si participation. The nominal and wide variant represent separate uniform sections; their endpoint overlap is not a prediction of the connecting taper’s transmission. Air above exposed LN and omission of electrodes are model choices.

### S4 — LN above SiN

[Churaev et al., *A heterogeneously integrated lithium niobate-on-silicon nitride photonic platform*, Nature Communications 14 (2023), DOI 10.1038/s41467-023-39047-7](https://www.nature.com/articles/s41467-023-39047-7).

Read Fig. 1, fabrication discussion, and Methods → Waveguide geometry. Reported: 300 nm x-cut LN, approximately 100 nm silica interlayer, SiN thicknesses 600 and 950 nm, and widths spanning 1–2 µm. Choose 1.5 µm width; it is not an extracted unique nominal. The 950 nm variant supplies a second thickness regime. Semi-infinite bottom silica, rectangular SiN, an air cap, and Y propagation define our idealized straight-section model. This family is better anchored than the existing assumed `sin-ln-stack`.

### S5 — Si above LN

[Chen et al., *Wafer-Scale Fabrication of Silicon Film on Lithium Niobate on Insulator (LNOI)*, Crystals 12, 1477 (2022)](https://doi.org/10.3390/cryst12101477); [article PDF mirror](https://pdfs.semanticscholar.org/2312/53560005ade160668d9ff6e59d1845735c3b.pdf).

Read §2/Figs. 2–3 and §3. The unetched-film strip analysis uses x-cut LN, Y propagation, 500 nm LN, and chooses 340 nm Si; 500 nm width lies within the stated design interval. Fabrication demonstrates a transferred crystalline-Si material platform, not measured performance of our proposed guide. The separate vertical coupler uses etched LN and must not be substituted for this unetched-film cross-section. The paper’s 1550 nm indices are LN ordinary 2.211, extraordinary 2.137, Si 3.476, and silica 1.458. Our zero interlayer and semi-infinite silica simplify the physical interface/BOX.

### S6 — SiN above LN

[Han et al., *Breaking dense integration limits: inverse-designed lithium niobate multimode photonic circuits*, Nature Communications 17, 1162 (2026), DOI 10.1038/s41467-025-67927-7](https://www.nature.com/articles/s41467-025-67927-7).

Read Waveguide platform, Mode (de)multiplexer, and Fabrication processes. Reported: air/SiN/unetched x-cut LN/oxide/Si; 300 nm each of SiN and LN; 4.7 µm BOX; 1 µm input and 4.3 µm multimode widths. SiN is reactively sputtered. The mode-multiplexer discussion specifies crystal-Z propagation. Use that orientation for the nominal, with a separately labeled Y-propagating comparison. The 4.3 µm variant requests TE0/TE1/TE2. This is a uniform-port mode specification, not implementation of the inverse-designed circuits.

## Geometry contract for the implementer

Use right-handed solver coordinates: `x` lateral, `y` upward, `z` propagation; all lengths µm. Define `y=0` at the silica/lowest-device-layer interface and center the strip at `x=0`. Let `w=width_um`, `h=height_um`, `t=film_um`, `g=oxide_gap_um`. Both templates have total device-stack height `h+g+t`.

**`film-over-strip`:**

- Silica fills `y<0` and the strip surroundings up to `y=h+g`.
- Si or SiN rectangle occupies `|x|<w/2`, `0<y<h`.
- Continuous silica gap occupies `h<y<h+g`, including directly above the strip.
- Unetched BTO/LN occupies all lateral positions at `h+g<y<h+g+t`.
- `cladding` fills above the film. The film is flat; no wrapping around strip sidewalls.

**`strip-over-film`:**

- Silica fills `y<0`.
- Unetched BTO/LN occupies all lateral positions at `0<y<t`.
- If `g>0`, a continuous silica spacer occupies `t<y<t+g`; if zero, omit it.
- Strip occupies `|x|<w/2`, `t+g<y<t+g+h`.
- `cladding` fills beside and above the strip, above the film/spacer surface.

All film/strip interfaces have non-overlapping material ownership. Strips are fully etched rectangles; `sidewall_deg_from_horizontal=90`. No residual Si/SiN slab. Ferroelectric `etch_um=0` always. A lateral film edge would define a different family and cannot be introduced by tying film width to strip width or mesh padding. Extend the film into the absorbing boundary region.

The `substrate_model` is `semi-infinite-SiO2`; do not silently add a silicon handle. Finite BOX/handle sensitivity is a later, separately hashed model. Actual BOX values in the ledger are contextual evidence, not dimensions in this default geometry. Reversing a stack while retaining the same substrate and cap is not generally a mirror symmetry. Even with silica everywhere, the strip surroundings can differ between the two templates.

## Materials and crystal axes

Use a full optical relative-permittivity tensor, rotated into the solver frame. Do not use low-frequency dielectric constants or Pockels coefficients as optical permittivity. No electric bias, domain switching, RF electrodes, absorption-fit claims, or nonlinear solving is part of these presets.

| Material profile | Initial numerical specification at 1.55 µm | Status |
|---|---|---|
| `si-reference` | Existing sourced crystalline-Si dispersion | Reuse current material; do not alias amorphous Si to it |
| `sio2-reference` | Existing Malitson silica dispersion | Reuse current material; not identical to all paper constants |
| `sin-process-provisional` | Scalar n=2.00 | Existing placeholder; PECVD, LPCVD, sputtered films need distinct measured/primary-source profiles for paper matching |
| `ln-uniaxial-1550` | `(n_o,n_e)=(2.211,2.137)` from S5; zero imaginary part | Fixed-wavelength educational tensor; not a broadband Sellmeier model or measured film fit |
| `bto-isotropic-screening-1550` | n=2.38 from S1; zero imaginary part | Explicit provisional isotropic optical proxy, no release eligibility |

LN crystal principal tensor is `diag(n_o²,n_o²,n_e²)` in `(X,Y,Z)`. For x-cut, Y propagation, take solver `(x,y,z)=(Z,X,Y)`, giving `diag(n_e²,n_o²,n_o²)`. For x-cut, Z propagation, take `(x,y,z)=(-Y,X,Z)`, giving `diag(n_o²,n_o²,n_e²)`. The sign preserves a right-handed frame. Arbitrary in-plane angles require rotation including off-diagonal terms; do not merely swap scalar TE/TM indices.

BTO geometry can first be screened with the named proxy. Tensor acceptance remains explicit work: obtain wavelength-appropriate ordinary/extraordinary indices, phase/strain/temperature and domain-state assumptions, and a crystal-to-solver rotation for each reference device. S1's (100) designation alone does not fix an in-plane optical domain distribution. Do not invent a universal tensor or silently interpret n=2.38 as both measured principal indices. Record `crystal_orientation_status=unresolved-for-tensor` in the BTO presets. Missing optical tensor evidence must remain visible in results, but need not prevent clearly labeled experimental proxy solves.

## Candidate ranges and useful comparisons

The JSON ranges are **chosen educational design envelopes, not fabrication tolerances or published yield distributions**. Paper width/thickness variants are discrete overrides. Apply each override to its parent nominal; do not sample it through the parent's range. Begin with nominal solves, then one-parameter sweeps; a Cartesian product is unnecessary. Keep wavelength, cladding, crystal orientation and material profile fixed during a geometry sweep.

Recommended comparison recipes for later implementation:

1. `tfln-over-si`: nominal versus 650 nm width — strong redistribution between layers.
2. `tfln-over-sin`: 600 versus 950 nm SiN — thickness-driven redistribution.
3. `sin-over-tfln`: Z versus Y propagation, identical dimensions — isolate tensor orientation.
4. `sin-over-tfln`: 1 versus 4.3 µm width — fundamental versus higher-order mode identities.
5. Each nominal versus its film-thickness endpoints — confinement and lateral localization.
6. Film-over-strip gap sweeps — resolve oxide-slot fields and decoupling; especially the 5 nm S1 gap.
7. Inverted stacks — use the same chosen materials and dimensions, explicitly record cap changes, and preserve the substrate-based vertical origin. A separately labeled centroid-aligned comparison may isolate shape from displacement.

No MFD, effective index, overlap, or mode count is assigned as a guessed answer. A width named “single mode” in a paper is not a guarantee for the modified stack or material model.

## Solver and release acceptance criteria

These are requirements for future implementation, not checks performed in this research pass.

- Material/geometry preview must resolve every layer and display the air/oxide surroundings. Confirm each interface before solving; a uniform 20 nm mesh cannot represent a 5 nm gap.
- Use interface-aligned refinement. Start with at least four cells across a nonzero gap and eight across each thin solid layer; demonstrate refinement convergence rather than treating those counts as sufficient. Use nonuniform meshing if needed.
- Compute candidate modes of both polarizations, then identify quasi-TE0/quasi-TM0 using vector fields, transverse polarization fraction, lateral order and overlap tracking. Request at least six candidates initially; expand the search until the desired localized branches are found or absence is established. No fixed candidate count proves completeness.
- Solve the **exterior multilayer slab** (strip absent) with the same tensor, cap and vertical stack. Compare against its radiation channels, including other polarizations and oblique lateral propagation where applicable. `neff > n_silica` alone is not sufficient to identify a laterally guided mode. Near a slab continuum or a cross-polarization leakage channel, use outgoing boundaries/PML and complex propagation constants, or classify the result as unresolved/leaky.
- Enlarge lateral and vertical padding independently and refine the mesh. Proposed minimum gates: `|Δneff|<1e-4`, normalized field overlap >.999 between successive solutions on a common domain, <1% change in transverse second-moment widths, and outer physical-boundary electric-energy fraction <1e-4 (outermost 10% strips of the non-PML box, excluding PML). These are engineering acceptance thresholds, not paper-derived values. Weakly localized modes must also stabilize their central power fraction; a box-normalized slab mode must fail.
- Require positive forward power, documented normalization, Maxwell/eigenpair residual, and orthogonality checks using the existing physics contract. Release requires an independent tensor-capable solver benchmark for each new material/orientation/template combination; scalar agreement alone is insufficient.
- Export full E/H fields, complex `neff` where supported, polarization/order label, per-material longitudinal Poynting-power fractions, centroid and second moments, slab-channel diagnostics, mesh/domain convergence, and complete material/orientation provenance. Electric-energy fraction and power fraction must have different labels. Published EO overlap is neither of these automatically.
- The paper participation numbers are sanity checks only after matching their precise stack, material values, and normalization. Do not fit geometry until a quoted number matches. No taper efficiency, propagation-loss reproduction, modulator bandwidth or Vπ follows from a passive cross-section solve.

## Integration handoff

The existing dispatcher supports slab and experimental scalar-2D solves; LN is currently disabled as anisotropic and BTO is absent. The experimental full-vector module is not a release backend. These limitations are already tracked in [007](../coding/007-vector-solver-and-validation.md).

1. Implement the two geometry templates and explicit material-profile/axis handling.
2. Promote selected entries from `data/proposed/hybrid-waveguides.json` into the runtime catalog only when the loader, solver and generator understand them. All proposed records remain `pending-geometry-and-vector-validation`, `releaseEligible=false`.
3. Preserve the historical `sin-ln-stack` ID and its assumed parameters for cached provenance. Prefer `tfln-over-sin` for new paper-anchored content; never silently reinterpret old cached geometry.
4. Extend the preset-to-region builder: it currently assumes a small set of single-core guides. Map common `width_um`, `height_um`, `film_um`, `oxide_gap_um` explicitly; do not infer the strip from `materials[0]` or reuse the old `ln_film_um` mapping accidentally.
5. Hash stack order, tensor rotation, material model, cap, gap, film extent, and substrate model in addition to dimensions. Variants need unique IDs and provenance.
6. Once validated, add mode-card labels and geometry overlays, then pair recipes using the existing gallery/practice/speedrun presentation contract. Spec-only records must not enter scored pools.

Completion of this document means the geometry/config handoff is defined. It does not mark any numerical family solved or released.
