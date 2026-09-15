/** Hybrid ferroelectric waveguide geometry templates (K011).
 *
 * Two straight, longitudinally invariant cross-sections from
 * `DevLog/knowledge-base/011-hybrid-ferroelectric-waveguides.md`:
 *
 *   film-over-strip:  silica | strip | silica gap | continuous film | cladding
 *   strip-over-film:  silica | continuous film | silica spacer | strip | cladding
 *
 * Solver frame is right-handed `x` lateral, `y` upward, `z` propagation. `y=0`
 * is the silica / lowest-device-layer interface and the strip is centered at
 * `x=0`. Every film/strip interface has single material ownership and the film
 * is laterally continuous ("infinite") through the domain boundary.
 *
 * This module only builds geometry. It never chooses optical constants and it
 * is not a solver by itself.
 */
import { getMaterial } from './materials.mjs';

export const GEOMETRY_VERSION = 'guide-geometry-1';

const FULL = 1e6;

function requirePositive(value, name) {
	if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be finite and positive`);
	return value;
}

/**
 * Build the region model for one hybrid geometry kind.
 *
 * @param {object} config
 * @param {'film-over-strip'|'strip-over-film'} config.geometryKind
 * @param {number} config.widthUm strip width
 * @param {number} config.heightUm strip height
 * @param {number} config.filmUm continuous ferroelectric film thickness
 * @param {number} [config.oxideGapUm] continuous silica gap (film-over-strip) or spacer (strip-over-film)
 * @param {string} config.stripMaterial
 * @param {string} config.filmMaterial
 * @param {string} [config.cladding]
 */
export function guideRegions(config) {
	const {
		geometryKind,
		widthUm,
		heightUm,
		filmUm,
		oxideGapUm = 0,
		stripMaterial,
		filmMaterial,
		cladding = 'air'
	} = config;
	if (!['film-over-strip', 'strip-over-film'].includes(geometryKind)) {
		throw new RangeError(`Unknown geometryKind: ${geometryKind}`);
	}
	requirePositive(widthUm, 'widthUm');
	requirePositive(heightUm, 'heightUm');
	requirePositive(filmUm, 'filmUm');
	if (!Number.isFinite(oxideGapUm) || oxideGapUm < 0) throw new RangeError('oxideGapUm must be >= 0');
	getMaterial(stripMaterial);
	getMaterial(filmMaterial);
	getMaterial(cladding);

	const stripX0 = -widthUm / 2;
	const stripX1 = widthUm / 2;
	const g = oxideGapUm;
	const h = heightUm;
	const t = filmUm;

	if (geometryKind === 'film-over-strip') {
		const filmBottom = h + g;
		const filmTop = h + g + t;
		// Silica background fills y<0 and the strip surroundings/gap. The film
		// and cap are explicit so ownership is visible to a preview.
		const regions = [
			{ x0: stripX0, x1: stripX1, y0: 0, y1: h, material: stripMaterial, priority: 3, role: 'strip' },
			{ x0: -FULL, x1: FULL, y0: filmBottom, y1: filmTop, material: filmMaterial, priority: 2, role: 'film' },
			{ x0: -FULL, x1: FULL, y0: filmTop, y1: FULL, material: cladding, priority: 1, role: 'cladding' }
		];
		return finishModel({
			config,
			regions,
			strip: { x0: stripX0, x1: stripX1, y0: 0, y1: h, material: stripMaterial },
			film: { x0: -FULL, x1: FULL, y0: filmBottom, y1: filmTop, material: filmMaterial },
			gap: g > 0 ? { y0: h, y1: filmBottom, material: 'sio2' } : null,
			interfacesY: [0, h, filmBottom, filmTop],
			deviceTopUm: filmTop
		});
	}

	// strip-over-film
	const filmTop = t;
	const stripBottom = t + g;
	const stripTop = t + g + h;
	const regions = [
		{ x0: -FULL, x1: FULL, y0: 0, y1: filmTop, material: filmMaterial, priority: 2, role: 'film' },
		{ x0: -FULL, x1: FULL, y0: stripBottom, y1: stripTop, material: cladding, priority: 1, role: 'cladding' },
		{ x0: stripX0, x1: stripX1, y0: stripBottom, y1: stripTop, material: stripMaterial, priority: 3, role: 'strip' }
	];
	return finishModel({
		config,
		regions,
		strip: { x0: stripX0, x1: stripX1, y0: stripBottom, y1: stripTop, material: stripMaterial },
		film: { x0: -FULL, x1: FULL, y0: 0, y1: filmTop, material: filmMaterial },
		gap: g > 0 ? { y0: filmTop, y1: stripBottom, material: 'sio2' } : null,
		interfacesY: [0, filmTop, stripBottom, stripTop],
		deviceTopUm: stripTop
	});
}

function uniqueSorted(values) {
	const out = [];
	for (const value of values) {
		if (out.length === 0 || Math.abs(out[out.length - 1] - value) > 1e-12) out.push(value);
	}
	return out;
}

function finishModel({ config, regions, strip, film, gap, interfacesY, deviceTopUm }) {
	const { widthUm, filmUm, oxideGapUm = 0 } = config;
	// Confinement/scoring window: around the strip laterally and across the whole
	// device stack vertically, so film + gap + strip energy is counted together.
	const marginX = Math.max(filmUm, 0.5);
	const xHalf = widthUm / 2 + marginX;
	const coreBox = { x0: -xHalf, x1: xHalf, y0: 0, y1: deviceTopUm };
	return {
		geometryVersion: GEOMETRY_VERSION,
		geometryKind: config.geometryKind,
		units: 'um',
		background: 'sio2',
		substrateModel: 'semi-infinite-SiO2',
		stripMaterial: strip.material,
		filmMaterial: film.material,
		cladding: config.cladding ?? 'air',
		regions,
		strip,
		film,
		gap,
		interfacesX: [strip.x0, strip.x1],
		interfacesY: uniqueSorted(interfacesY),
		deviceTopUm,
		coreBox,
		// Vertical span of the whole device stack above the silica origin.
		stackHeightUm: deviceTopUm,
		oxideGapUm
	};
}

/**
 * Subdivide a sorted list of boundaries so every boundary is an exact node.
 * `maxStepUm` is a starting heuristic, not a correctness certificate.
 */
export function alignedEdges(boundaries, maxStepUm) {
	if (!Array.isArray(boundaries) || boundaries.length < 2) throw new RangeError('need >= 2 boundaries');
	if (!Number.isFinite(maxStepUm) || maxStepUm <= 0) throw new RangeError('maxStepUm must be positive');
	for (let i = 1; i < boundaries.length; i++) {
		if (!(boundaries[i] > boundaries[i - 1])) throw new RangeError('boundaries must be strictly increasing');
	}
	const out = [boundaries[0]];
	for (let i = 1; i < boundaries.length; i++) {
		const a = boundaries[i - 1];
		const b = boundaries[i];
		const steps = Math.max(1, Math.ceil((b - a) / maxStepUm - 1e-9));
		for (let k = 1; k <= steps; k++) out.push(a + ((b - a) * k) / steps);
	}
	return out;
}

/**
 * Build interface-aligned solver edges for one guide model. Padding is added
 * outside the device stack so weakly localized modes have room to decay.
 */
export function guideMeshPlan(model, { padUm, maxStepUm } = {}) {
	const pad = padUm ?? Math.max(1.0, 2 * model.deviceTopUm);
	const xHalf = model.coreBox.x1 + pad;
	const yMin = -pad;
	const yMax = model.deviceTopUm + pad;
	const xEdges = alignedEdges([-xHalf, ...model.interfacesX, xHalf], maxStepUm ?? pad / 12);
	const yEdges = alignedEdges([yMin, ...model.interfacesY, yMax], maxStepUm ?? pad / 12);
	return { xEdges, yEdges, coreBox: model.coreBox };
}

/** Smallest gap / solid layer controls the starting mesh step. */
export function smallestFeatureUm(model) {
	const features = [model.strip.y1 - model.strip.y0, model.film.y1 - model.film.y0];
	if (model.gap) features.push(model.gap.y1 - model.gap.y0);
	return Math.min(...features.filter((value) => value > 0));
}
