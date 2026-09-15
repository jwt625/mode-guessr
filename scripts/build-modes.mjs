/** Build the nominal + variant waveguide-mode gallery (experimental scalar quasi-TE).
 *
 * Solves each rectangular guide at nominal and variant dimensions with the
 * validated scalar 2D solver, keeps the well-confined modes (fundamental plus
 * higher order), and writes a compact display bundle (index geometry + signed
 * mode field) for the gallery and on-the-fly overlap questions. These are NOT
 * full-vector and are not release-eligible; the bundle says so.
 *
 * Hybrid ferroelectric families (K011) are built from
 * `data/proposed/hybrid-waveguides.json` through the explicit
 * `film-over-strip` / `strip-over-film` geometry templates. Their anisotropic
 * films are solved with isotropic screening proxies only, so every hybrid entry
 * is flagged `experimental-hybrid-screening` and `releaseEligible: false`.
 */
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGrid2D, rasterizeRegions, MESH_VERSION } from '../src/physics/mesh.mjs';
import { solveScalar2D, FEM2D_VERSION } from '../src/physics/fem2d.mjs';
import { MATERIAL_DB_VERSION, refractiveIndex } from '../src/physics/materials.mjs';
import { GEOMETRY_VERSION, guideRegions } from '../src/physics/geometry.mjs';
import { canonicalJSON } from '../src/storage/cache.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const MATERIAL_IDS = { Si: 'si', SiO2: 'sio2', Si3N4: 'sin', BaTiO3: 'bto', 'LiNbO3-tensor': 'lno', air: 'air' };
// How many confined modes to publish per preset (multimode guides get more).
const MULTIMODE_ORDER = {
	'soi-wide': 3,
	'soi-rib': 2,
	'sin-thick': 3,
	'sin-medium': 2,
	'sin-over-tfln-wide': 3
};
// Real geometric variants (independently solved) so on-the-fly pairing has
// many distinct guides and mode orders to compare.
const VARIANTS = {
	'soi-strip': [
		{ id: 'soi-strip-w035', width_um: 0.35 },
		{ id: 'soi-strip-w040', width_um: 0.4 },
		{ id: 'soi-strip-w050', width_um: 0.5 },
		{ id: 'soi-strip-w055', width_um: 0.55 },
		{ id: 'soi-strip-h019', height_um: 0.19 }
	],
	'soi-wide': [
		{ id: 'soi-wide-w070', width_um: 0.7, maxModes: 3 },
		{ id: 'soi-wide-w110', width_um: 1.1, maxModes: 4 },
		{ id: 'soi-wide-w140', width_um: 1.4, maxModes: 4 }
	],
	'soi-rib': [
		{ id: 'soi-rib-w050', width_um: 0.5, slab: 0.09 },
		{ id: 'soi-rib-w080', width_um: 0.8, slab: 0.12 }
	],
	'sin-thick': [
		{ id: 'sin-thick-w120', width_um: 1.2, maxModes: 3 },
		{ id: 'sin-thick-h065', height_um: 0.65, maxModes: 3 },
		{ id: 'sin-thick-h095', height_um: 0.95, maxModes: 4 }
	],
	'sin-medium': [
		{ id: 'sin-medium-w080', width_um: 0.8 },
		{ id: 'sin-medium-w100', width_um: 1.0 },
		{ id: 'sin-medium-w140', width_um: 1.4 },
		{ id: 'sin-medium-h030', height_um: 0.3 }
	],
	'sin-thin-wide': [
		{ id: 'sin-thin-wide-w200', width_um: 2.0 },
		{ id: 'sin-thin-wide-h020', height_um: 0.2 }
	],
	'sin-taper-endpoint': [
		{ id: 'sin-taper-w030', width_um: 0.3 },
		{ id: 'sin-taper-h025', height_um: 0.25 }
	]
};
const CORE_IDS = ['soi-strip', 'soi-wide', 'soi-rib', 'sin-thick', 'sin-medium', 'sin-thin-wide', 'sin-taper-endpoint'];

function edges(center, half, nodes) {
	return Array.from({ length: nodes + 1 }, (_, i) => center - half + (2 * half * i) / nodes);
}

/**
 * Subdivide sorted boundaries so every interface is an exact node. Cells are
 * chosen by rounding the interval to a common target size rather than forcing a
 * cell count per layer: this keeps the mesh quasi-uniform, which the plain
 * Lanczos solver needs to avoid a huge negative stiffness tail. Thin layers
 * (down to the 5 nm S1 gap) therefore get a single cell; a scalar screening
 * solve cannot resolve them more finely without a shift-invert solver.
 */
function roundedAxis(boundaries, targetStep) {
	const out = [boundaries[0]];
	for (let i = 1; i < boundaries.length; i++) {
		const a = boundaries[i - 1];
		const b = boundaries[i];
		const thickness = b - a;
		const cells = Math.max(1, Math.round(thickness / targetStep));
		for (let k = 1; k <= cells; k++) out.push(a + (thickness * k) / cells);
	}
	return out;
}

function centeredDescriptor(preset, material, maxModes, slab) {
	const width = preset.nominal.width_um;
	const height = preset.nominal.height_um;
	const pad = Math.max(1.0, 2.5 * Math.max(width, height));
	const halfX = pad + width / 2;
	const halfY = pad + height / 2;
	const step = Math.max(Math.min(width, height) / 12, (2 * Math.max(halfX, halfY)) / 130);
	const nx = Math.max(49, Math.ceil((2 * halfX) / step) + 1);
	const ny = Math.max(41, Math.ceil((2 * halfY) / step) + 1);
	const regions = [{ x0: -width / 2, x1: width / 2, y0: -height / 2, y1: height / 2, material, priority: 2 }];
	if (slab) regions.push({ x0: -1e3, x1: 1e3, y0: -height / 2, y1: -height / 2 + slab, material, priority: 1 });
	return {
		id: preset.id,
		category: preset.category,
		materials: preset.materials,
		cladding: preset.cladding ?? 'SiO2',
		wavelengthUm: preset.wavelength_um,
		background: 'sio2',
		regions,
		xEdges: edges(0, halfX, nx - 1),
		yEdges: edges(0, halfY, ny - 1),
		coreBox: { x0: -width, x1: width, y0: -height, y1: height },
		core: { x0: -width / 2, x1: width / 2, y0: -height / 2, y1: height / 2 },
		dimensions: { widthUm: width, heightUm: height, slabUm: slab ?? null },
		modeLabel: preset.mode ?? 'fundamental',
		maxModes
	};
}

function hybridDescriptor(preset) {
	const nominal = preset.nominal;
	const model = guideRegions({
		geometryKind: preset.geometry_kind,
		widthUm: nominal.width_um,
		heightUm: nominal.height_um,
		filmUm: nominal.film_um,
		oxideGapUm: nominal.oxide_gap_um ?? 0,
		stripMaterial: MATERIAL_IDS[preset.strip_material],
		filmMaterial: MATERIAL_IDS[preset.film_material],
		cladding: preset.cladding === 'SiO2' ? 'sio2' : 'air'
	});
	const pad = Math.max(1.0, 2 * model.deviceTopUm);
	const xHalf = model.coreBox.x1 + pad;
	const yMin = -pad;
	const yMax = model.deviceTopUm + pad;
	const yBounds = [yMin, ...model.interfacesY, yMax];
	const xBounds = [-xHalf, ...model.interfacesX, xHalf];
	const targetStep = nominal.width_um > 2 ? 0.04 : 0.03;
	return {
		id: preset.id,
		category: preset.category,
		materials: preset.materials,
		cladding: preset.cladding ?? 'air',
		wavelengthUm: preset.wavelength_um,
		background: model.background,
		regions: model.regions,
		xEdges: roundedAxis(xBounds, targetStep),
		yEdges: roundedAxis(yBounds, targetStep),
		coreBox: model.coreBox,
		core: { x0: model.strip.x0, x1: model.strip.x1, y0: model.strip.y0, y1: model.strip.y1 },
		dimensions: {
			widthUm: nominal.width_um,
			heightUm: nominal.height_um,
			slabUm: null,
			filmUm: nominal.film_um,
			oxideGapUm: nominal.oxide_gap_um ?? 0,
			geometryKind: preset.geometry_kind
		},
		modeLabel: preset.mode ?? 'quasi-TE0',
		maxModes: MULTIMODE_ORDER[preset.id] ?? 1,
		hybrid: {
			geometryKind: preset.geometry_kind,
			status: 'experimental-hybrid-screening',
			screening: true,
			evidenceLevel: preset.evidence_level,
			sourceIds: preset.source_ids,
			assumptions: preset.assumptions ?? [],
			crystalOrientationStatus: preset.crystal_orientation_status ?? null,
			propagationCrystalAxis: preset.propagation_crystal_axis ?? null
		}
	};
}

function resample(grid, values, nxOut, nyOut) {
	const out = new Array(nxOut * nyOut);
	for (let j = 0; j < nyOut; j++) {
		const fy = (j / (nyOut - 1)) * (grid.ny - 1);
		const j0 = Math.min(grid.ny - 1, Math.floor(fy));
		const j1 = Math.min(grid.ny - 1, j0 + 1);
		const ty = fy - j0;
		for (let i = 0; i < nxOut; i++) {
			const fx = (i / (nxOut - 1)) * (grid.nx - 1);
			const i0 = Math.min(grid.nx - 1, Math.floor(fx));
			const i1 = Math.min(grid.nx - 1, i0 + 1);
			const tx = fx - i0;
			const v00 = values[j0 * grid.nx + i0];
			const v10 = values[j0 * grid.nx + i1];
			const v01 = values[j1 * grid.nx + i0];
			const v11 = values[j1 * grid.nx + i1];
			out[j * nxOut + i] = Number(
				((v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty).toPrecision(4)
			);
		}
	}
	return out;
}

/**
 * Intensity centroid of a solved mode on its quadrature grid. Used to place the
 * fundamental at the coordinate origin so cross-guide overlaps compare mode
 * shape rather than an arbitrary stack-origin displacement.
 */
function intensityCentroid(grid, psi) {
	const { nx, ny, weights, x, y } = grid;
	let total = 0;
	let cx = 0;
	let cy = 0;
	for (let j = 0; j < ny; j++) {
		for (let i = 0; i < nx; i++) {
			const n = j * nx + i;
			const energy = weights[n] * psi[n] * psi[n];
			total += energy;
			cx += energy * x[i];
			cy += energy * y[j];
		}
	}
	if (!(total > 0)) return { x: 0, y: 0 };
	return { x: cx / total, y: cy / total };
}

function solveGuide(descriptor) {
	const { regions, coreBox, background, wavelengthUm, maxModes, modeLabel } = descriptor;
	const grid = buildGrid2D({ xEdges: descriptor.xEdges, yEdges: descriptor.yEdges });
	const nodeEps = rasterizeRegions(grid, regions, wavelengthUm, background);
	const result = solveScalar2D({ grid, nodeEps, wavelengthUm, modeCount: 5, lanczosSteps: 300 });
	if (result.modes.length === 0) return null;
	const weights = grid.weights;
	const scored = result.modes.map((mode) => {
		const psi = mode.scalar.re;
		let total = 0;
		let core = 0;
		for (let j = 0; j < grid.ny; j++) {
			for (let i = 0; i < grid.nx; i++) {
				const n = j * grid.nx + i;
				const energy = weights[n] * psi[n] * psi[n];
				total += energy;
				if (
					grid.x[i] >= coreBox.x0 &&
					grid.x[i] <= coreBox.x1 &&
					grid.y[j] >= coreBox.y0 &&
					grid.y[j] <= coreBox.y1
				) {
					core += energy;
				}
			}
		}
		return { mode, confinement: total > 0 ? core / total : 0 };
	});
	scored.sort((a, b) => b.mode.neff - a.mode.neff);
	const qualified = scored.filter((item) => item.confinement >= 0.6 && item.mode.residual < 1e-4);
	const selected = qualified.length > 0 ? qualified.slice(0, maxModes) : [scored[0]];
	const displayX = 80;
	const displayY = 60;
	const toIndex = (id) => Number(refractiveIndex(id, wavelengthUm).toPrecision(4));
	// Place the fundamental mode's intensity centroid at (0, 0). The highest
	// index region is the expected mode location; using the solved centroid is
	// the robust version of that heuristic and keeps inverted stacks paired.
	const centroid = intensityCentroid(grid, selected[0].mode.scalar.re);
	const shift = { x: -centroid.x, y: -centroid.y };
	const shiftRegion = (region) => ({
		x0: region.x0 + shift.x,
		x1: region.x1 + shift.x,
		y0: region.y0 + shift.y,
		y1: region.y1 + shift.y,
		index: region.index,
		material: region.material
	});
	const indexRegions = regions.map((region) =>
		shiftRegion({
			x0: region.x0,
			x1: region.x1,
			y0: region.y0,
			y1: region.y1,
			index: toIndex(region.material),
			material: region.material
		})
	);
	const modes = selected.map((item, order) => ({
		modeLabel: order === 0 ? modeLabel : `higher-order ${order}`,
		neff: Number(item.mode.neff.toPrecision(5)),
		confinement: Number(item.confinement.toPrecision(4)),
		residual: Number(item.mode.residual.toExponential(2)),
		field: resample(grid, item.mode.scalar.re, displayX, displayY),
		axes: {
			x0: grid.x[0] + shift.x,
			x1: grid.x[grid.nx - 1] + shift.x,
			y0: grid.y[0] + shift.y,
			y1: grid.y[grid.ny - 1] + shift.y,
			nx: displayX,
			ny: displayY
		},
		backgroundIndex: toIndex(background),
		indexRegions
	}));
	return { modes, shift };
}

function pushDescriptor(entries, descriptor) {
	const solved = solveGuide(descriptor);
	if (!solved) return;
	const { shift } = solved;
	solved.modes.forEach((mode, order) => {
		entries.push({
			id: order === 0 ? descriptor.id : `${descriptor.id}-m${order}`,
			name: order === 0 ? descriptor.id : `${descriptor.id} (mode ${order})`,
			order,
			category: descriptor.category,
			modeLabel: mode.modeLabel,
			materialLabel: descriptor.materials.join(' / '),
			cladding: descriptor.cladding,
			wavelengthUm: descriptor.wavelengthUm,
			status: descriptor.hybrid ? 'experimental-hybrid-screening' : 'experimental-scalar-quasi-te',
			neff: mode.neff,
			confinement: mode.confinement,
			residual: mode.residual,
			dimensions: descriptor.dimensions,
			core: {
				x0: descriptor.core.x0 + shift.x,
				x1: descriptor.core.x1 + shift.x,
				y0: descriptor.core.y0 + shift.y,
				y1: descriptor.core.y1 + shift.y
			},
			axes: mode.axes,
			backgroundIndex: mode.backgroundIndex,
			indexRegions: mode.indexRegions,
			field: mode.field,
			...(descriptor.hybrid
				? {
						geometryKind: descriptor.hybrid.geometryKind,
						releaseEligible: false,
						screeningProxy: true,
						evidenceLevel: descriptor.hybrid.evidenceLevel,
						sourceIds: descriptor.hybrid.sourceIds,
						assumptions: descriptor.hybrid.assumptions,
						crystalOrientationStatus: descriptor.hybrid.crystalOrientationStatus,
						propagationCrystalAxis: descriptor.hybrid.propagationCrystalAxis
					}
				: {})
		});
	});
}

export async function buildModeGallery(output = join(root, 'static/cache/modes'), { ids } = {}) {
	const catalog = JSON.parse(await readFile(join(root, 'data/presets.json'), 'utf8'));
	const proposals = JSON.parse(await readFile(join(root, 'data/proposed/hybrid-waveguides.json'), 'utf8'));
	const wanted = ids ?? [...CORE_IDS, ...proposals.presets.map((preset) => preset.id)];
	const entries = [];

	for (const preset of catalog.presets) {
		if (!wanted.includes(preset.id)) continue;
		const descriptor = centeredDescriptor(preset, MATERIAL_IDS[preset.materials[0]], MULTIMODE_ORDER[preset.id] ?? 1, preset.nominal.slab_um ?? null);
		pushDescriptor(entries, descriptor);
		for (const variant of VARIANTS[preset.id] ?? []) {
			const merged = {
				...preset,
				nominal: {
					...preset.nominal,
					width_um: variant.width_um ?? preset.nominal.width_um,
					height_um: variant.height_um ?? preset.nominal.height_um,
					slab_um: variant.slab_um ?? preset.nominal.slab_um
				}
			};
			const rebuilt = centeredDescriptor(merged, MATERIAL_IDS[preset.materials[0]], variant.maxModes ?? 1, variant.slab_um ?? preset.nominal.slab_um ?? null);
			pushDescriptor(entries, { ...rebuilt, id: variant.id });
		}
	}

	for (const preset of proposals.presets) {
		if (!wanted.includes(preset.id)) continue;
		pushDescriptor(entries, hybridDescriptor(preset));
		for (const variant of preset.variants ?? []) {
			const overrides = variant.nominal_overrides ?? {};
			// A crystal-axis-only variant is a tensor comparison. The scalar
			// screening solver cannot represent it, so it is left as spec work.
			if (Object.keys(overrides).length === 0) continue;
			const merged = {
				...preset,
				id: variant.id,
				nominal: { ...preset.nominal, ...overrides }
			};
			const descriptor = hybridDescriptor(merged);
			descriptor.maxModes = variant.additional_requested_modes?.length ?? MULTIMODE_ORDER[variant.id] ?? 1;
			pushDescriptor(entries, descriptor);
		}
	}

	const bundle = {
		schemaVersion: 'mode-gallery-1',
		provenance: {
			solverVersion: FEM2D_VERSION,
			materialDBVersion: MATERIAL_DB_VERSION,
			meshVersion: MESH_VERSION,
			geometryVersion: GEOMETRY_VERSION,
			source: 'data/presets.json + data/proposed/hybrid-waveguides.json'
		},
		note: 'Scalar quasi-TE finite-element modes at nominal and variant dimensions, fundamental plus confined higher-order modes. Experimental, not full-vector; SiN index is a process placeholder. Hybrid ferroelectric entries use isotropic screening proxies (BTO n=2.38, LN n=2.211) and are not tensor-validated. Do not read as released neff.',
		entries
	};
	await mkdir(output, { recursive: true });
	const text = canonicalJSON(bundle) + '\n';
	const temporary = `${join(output, 'manifest.json')}.${process.pid}.tmp`;
	await writeFile(temporary, text);
	await rename(temporary, join(output, 'manifest.json'));
	return { entries: entries.length, output, bytes: text.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	console.log(JSON.stringify(await buildModeGallery(process.argv[2] ? process.argv[2] : undefined), null, 2));
}
