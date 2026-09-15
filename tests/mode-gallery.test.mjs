import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildModeGallery } from '../scripts/build-modes.mjs';
import { overlapStored } from '../src/lib/waveguide.ts';

function centroidY(entry) {
	const { nx, ny, x0, y0, y1 } = entry.axes;
	let total = 0;
	let sum = 0;
	for (let j = 0; j < ny; j++) {
		const y = y0 + ((y1 - y0) * j) / (ny - 1);
		for (let i = 0; i < nx; i++) {
			const energy = entry.field[j * nx + i] ** 2;
			total += energy;
			sum += energy * y;
		}
	}
	return total > 0 ? sum / total : NaN;
}

function toGrid(entry) {
	const n = entry.axes.nx;
	const m = entry.axes.ny;
	const x = new Float64Array(n);
	const y = new Float64Array(m);
	for (let i = 0; i < n; i++) x[i] = entry.axes.x0 + ((entry.axes.x1 - entry.axes.x0) * i) / (n - 1);
	for (let j = 0; j < m; j++) y[j] = entry.axes.y0 + ((entry.axes.y1 - entry.axes.y0) * j) / (m - 1);
	return { x, y, field: Float64Array.from(entry.field), nx: n, ny: m };
}

test('hybrid mode galleries center the fundamental at the origin so inverted stacks overlap', async () => {
	const output = await mkdtemp(join(tmpdir(), 'mode-gallery-'));
	await buildModeGallery(output, { ids: ['tfln-over-si', 'si-over-tfln'] });
	const manifest = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'));
	const fundamental = (id) => manifest.entries.find((entry) => entry.id === id);
	const filmOverStrip = fundamental('tfln-over-si');
	const stripOverFilm = fundamental('si-over-tfln');
	assert.ok(filmOverStrip && stripOverFilm, 'both families should solve');

	// The expected fundamental mode location must sit at y = 0.
	assert.ok(Math.abs(centroidY(filmOverStrip)) < 0.02, `tfln-over-si centroid ${centroidY(filmOverStrip)}`);
	assert.ok(Math.abs(centroidY(stripOverFilm)) < 0.02, `si-over-tfln centroid ${centroidY(stripOverFilm)}`);

	// Inverted stacks have mirror-like stacks; after centering their overlap is
	// driven by mode shape, not by an arbitrary stack-origin offset.
	const eta = overlapStored(toGrid(filmOverStrip), toGrid(stripOverFilm));
	assert.ok(eta > 0.5, `inverted-stack overlap should be shape-limited, got ${eta}`);
});
