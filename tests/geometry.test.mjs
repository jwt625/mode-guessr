import test from 'node:test';
import assert from 'node:assert/strict';
import { guideRegions, alignedEdges, guideMeshPlan, smallestFeatureUm } from '../src/physics/geometry.mjs';
import { buildGrid2D, rasterizeRegions } from '../src/physics/mesh.mjs';
import { relativePermittivity } from '../src/physics/materials.mjs';

const EPS = 1.55;
const epsOf = (id) => relativePermittivity(id, EPS);

function epsAt(model, x, y) {
	const xs = [...new Set([-1, -0.5, -0.25, 0, 0.25, 0.5, 1, x])].sort((a, b) => a - b);
	const ys = [...new Set([-0.5, 0, 0.01, 0.05, 0.075, 0.11, 0.15, 0.2, 0.22, 0.26, 0.3, 0.375, 0.45, 0.6, y])].sort(
		(a, b) => a - b
	);
	const grid = buildGrid2D({ xEdges: xs, yEdges: ys });
	const nodeEps = rasterizeRegions(grid, model.regions, EPS, model.background);
	const ix = grid.x.indexOf(x);
	const iy = grid.y.indexOf(y);
	assert.ok(ix >= 0 && iy >= 0, `sample (${x},${y}) not on the grid`);
	return nodeEps[iy * grid.nx + ix];
}

test('film-over-strip resolves strip, silica gap, continuous film and cap', () => {
	const model = guideRegions({
		geometryKind: 'film-over-strip',
		widthUm: 0.5,
		heightUm: 0.22,
		filmUm: 0.15,
		oxideGapUm: 0.005,
		stripMaterial: 'si',
		filmMaterial: 'bto',
		cladding: 'air'
	});
	assert.equal(model.background, 'sio2');
	assert.equal(model.strip.y0, 0);
	assert.equal(model.strip.y1, 0.22);
	assert.equal(model.film.y0, 0.225);
	assert.equal(model.film.y1, 0.375);
	assert.ok(Math.abs(model.gap.y1 - model.gap.y0 - 0.005) < 1e-12);

	// Strip is centered on the origin and lives inside silica.
	assert.ok(Math.abs(epsAt(model, 0, 0.11) - epsOf('si')) < 1e-9);
	assert.ok(Math.abs(epsAt(model, -0.5, 0.11) - epsOf('sio2')) < 1e-9);
	// The gap is silica, not air or film.
	assert.ok(Math.abs(epsAt(model, 0, 0.2225) - epsOf('sio2')) < 1e-9);
	// The film is laterally continuous: same value above and beyond the strip.
	assert.ok(Math.abs(epsAt(model, 0, 0.3) - epsOf('bto')) < 1e-9);
	assert.ok(Math.abs(epsAt(model, -0.75, 0.3) - epsOf('bto')) < 1e-9);
	// Cap and substrate.
	assert.ok(Math.abs(epsAt(model, 0, 0.45) - epsOf('air')) < 1e-9);
	assert.ok(Math.abs(epsAt(model, 0, -0.25) - epsOf('sio2')) < 1e-9);
});

function hasNear(values, target, tolerance = 1e-9) {
	return [...values].some((value) => Math.abs(value - target) < tolerance);
}

test('strip-over-film resolves continuous film, strip and cladding fill', () => {
	const model = guideRegions({
		geometryKind: 'strip-over-film',
		widthUm: 0.5,
		heightUm: 0.34,
		filmUm: 0.5,
		oxideGapUm: 0,
		stripMaterial: 'si',
		filmMaterial: 'lno',
		cladding: 'air'
	});
	assert.equal(model.gap, null);
	assert.ok(Math.abs(model.strip.y0 - 0.5) < 1e-12);
	assert.ok(Math.abs(model.strip.y1 - 0.84) < 1e-12);
	assert.ok(Math.abs(model.film.y1 - 0.5) < 1e-12);

	assert.ok(Math.abs(epsAt(model, 0, 0.25) - epsOf('lno')) < 1e-9);
	assert.ok(Math.abs(epsAt(model, -0.75, 0.25) - epsOf('lno')) < 1e-9, 'film is laterally continuous');
	assert.ok(Math.abs(epsAt(model, 0, 0.7) - epsOf('si')) < 1e-9);
	assert.ok(Math.abs(epsAt(model, -0.5, 0.7) - epsOf('air')) < 1e-9, 'cladding fills beside the strip');
	assert.ok(Math.abs(epsAt(model, 0, -0.25) - epsOf('sio2')) < 1e-9);
});

test('strip-over-film keeps an explicit silica spacer when the gap is nonzero', () => {
	const model = guideRegions({
		geometryKind: 'strip-over-film',
		widthUm: 1.1,
		heightUm: 0.15,
		filmUm: 0.08,
		oxideGapUm: 0.02,
		stripMaterial: 'sin',
		filmMaterial: 'bto',
		cladding: 'sio2'
	});
	assert.ok(model.gap);
	assert.equal(model.gap.y0, 0.08);
	assert.equal(model.gap.y1, 0.1);
	assert.equal(model.strip.y0, 0.1);
	assert.ok(Math.abs(epsAt(model, 0, 0.09) - epsOf('sio2')) < 1e-9);
	assert.ok(Math.abs(epsAt(model, 0, 0.12) - epsOf('sin')) < 1e-9);
});

test('alignedEdges makes every interface an exact node and refines thin layers', () => {
	const edges = alignedEdges([-1, 0, 0.005, 0.155, 1], 0.001);
	assert.ok(hasNear(edges, 0));
	assert.ok(hasNear(edges, 0.005));
	assert.ok(hasNear(edges, 0.155));
	const gapCells = edges.filter((value) => value > 0 && value < 0.005).length + 1;
	assert.ok(gapCells >= 4, `expected >=4 cells across the 5 nm gap, got ${gapCells}`);
});

test('guideMeshPlan pads the domain and exposes the device stack', () => {
	const model = guideRegions({
		geometryKind: 'film-over-strip',
		widthUm: 0.275,
		heightUm: 0.15,
		filmUm: 0.6,
		oxideGapUm: 0.04,
		stripMaterial: 'si',
		filmMaterial: 'lno',
		cladding: 'air'
	});
	const plan = guideMeshPlan(model, { padUm: 1.5, maxStepUm: 0.05 });
	assert.ok(hasNear(plan.xEdges, -0.1375));
	assert.ok(hasNear(plan.xEdges, 0.1375));
	assert.ok(hasNear(plan.yEdges, 0.15));
	assert.ok(hasNear(plan.yEdges, 0.19));
	assert.ok(hasNear(plan.yEdges, 0.79));
	assert.ok(plan.yEdges[0] < -1.4);
	assert.ok(plan.yEdges[plan.yEdges.length - 1] > 2.2);
	assert.ok(Math.abs(smallestFeatureUm(model) - 0.04) < 1e-12);
});

test('guideRegions rejects unknown kinds and non-positive dimensions', () => {
	assert.throws(() => guideRegions({ geometryKind: 'rib', widthUm: 1, heightUm: 1, filmUm: 1, stripMaterial: 'si', filmMaterial: 'bto' }), /geometryKind/);
	assert.throws(() => guideRegions({ geometryKind: 'film-over-strip', widthUm: 0, heightUm: 1, filmUm: 1, stripMaterial: 'si', filmMaterial: 'bto' }), /widthUm/);
});
