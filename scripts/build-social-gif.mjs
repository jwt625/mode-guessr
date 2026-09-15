/** Build a social-media GIF cycling through every solved waveguide geometry.
 *
 * Each frame mirrors the speedrun waveguide view: the |E|² field on a shared
 * dark canvas with a dashed core outline, a 1/4 x 1/4 index cross-section inset
 * in the top-left, and the geometry name near the top. Frames are rendered as
 * PPM here, the name is drawn with ImageMagick (ffmpeg has no drawtext/libass in
 * the Homebrew build) and ffmpeg assembles a palette-optimized looping GIF.
 *
 * Usage: node scripts/build-social-gif.mjs [output.gif] [--hybrid] [--size=1080] [--seed=1]
 */
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { colormapRGB } from '../src/lib/colors.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const FONT_PATH = '/System/Library/Fonts/Supplemental/Arial.ttf';
const BACKGROUND = [14, 14, 18];
const INDEX_MIN = 1.0;
const INDEX_MAX = 3.6;
const FPS = 2;

function parseArgs(argv) {
	const options = { output: undefined, hybrid: false, size: 1080, seed: 1, fps: FPS };
	for (const arg of argv) {
		if (arg === '--hybrid') options.hybrid = true;
		else if (arg.startsWith('--size=')) options.size = Number(arg.split('=')[1]);
		else if (arg.startsWith('--seed=')) options.seed = Number(arg.split('=')[1]);
		else if (arg.startsWith('--fps=')) options.fps = Number(arg.split('=')[1]);
		else options.output = arg;
	}
	return options;
}

function mulberry32(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function colormapLUT(name) {
	const lut = [];
	for (let i = 0; i < 256; i++) lut.push(colormapRGB(name, i / 255));
	return lut;
}

const MAGMA = colormapLUT('magma');
const VIRIDIS = colormapLUT('viridis');

function setPixel(buffer, width, x, y, [r, g, b]) {
	if (x < 0 || y < 0) return;
	const index = (y * width + x) * 3;
	if (index < 0 || index + 2 >= buffer.length) return;
	buffer[index] = r;
	buffer[index + 1] = g;
	buffer[index + 2] = b;
}

function fillRect(buffer, width, height, x0, y0, x1, y1, color) {
	for (let y = Math.round(y0); y < Math.round(y1); y++) {
		for (let x = Math.round(x0); x < Math.round(x1); x++) {
			if (x < 0 || y < 0 || x >= width || y >= height) continue;
			setPixel(buffer, width, x, y, color);
		}
	}
}

function strokeDashedRect(buffer, width, height, x0, y0, x1, y1, color, dash = 7, gap = 5, thickness = 2) {
	const edges = [
		[Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y0)],
		[Math.round(x1), Math.round(y0), Math.round(x1), Math.round(y1)],
		[Math.round(x1), Math.round(y1), Math.round(x0), Math.round(y1)],
		[Math.round(x0), Math.round(y1), Math.round(x0), Math.round(y0)]
	];
	for (const [ax, ay, bx, by] of edges) {
		const length = Math.hypot(bx - ax, by - ay);
		const steps = Math.max(1, Math.round(length));
		for (let s = 0; s <= steps; s++) {
			if (Math.floor(s / (dash + gap)) * (dash + gap) + dash < s) continue;
			const t = s / steps;
			const x = Math.round(ax + (bx - ax) * t);
			const y = Math.round(ay + (by - ay) * t);
			for (let dy = 0; dy < thickness; dy++) {
				for (let dx = 0; dx < thickness; dx++) setPixel(buffer, width, x + dx, y + dy, color);
			}
		}
	}
}

function sampleField(field, nx, ny, fx, fy) {
	if (fx < 0 || fx > nx - 1 || fy < 0 || fy > ny - 1) return 0;
	const i0 = Math.floor(fx);
	const j0 = Math.floor(fy);
	const i1 = Math.min(nx - 1, i0 + 1);
	const j1 = Math.min(ny - 1, j0 + 1);
	const tx = fx - i0;
	const ty = fy - j0;
	const v00 = field[j0 * nx + i0];
	const v10 = field[j0 * nx + i1];
	const v01 = field[j1 * nx + i0];
	const v11 = field[j1 * nx + i1];
	return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
}

/** 5x7 bitmap font, enough for the inset "n" and the nm scale label. */
const FONT = {
	'0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
	'1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
	'2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
	'3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
	'4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
	'5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
	'6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
	'7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
	'8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
	'9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
	n: ['00000', '00000', '10110', '11001', '10001', '10001', '10001'],
	m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
	u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
	' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
};

function drawGlyph(buffer, width, height, glyph, x0, y0, scale, color) {
	for (let row = 0; row < glyph.length; row++) {
		for (let col = 0; col < glyph[row].length; col++) {
			if (glyph[row][col] !== '1') continue;
			fillRect(buffer, width, height, x0 + col * scale, y0 + row * scale, x0 + (col + 1) * scale, y0 + (row + 1) * scale, color);
		}
	}
}

function drawText(buffer, width, height, text, x, y, scale, color) {
	let cursor = x;
	for (const char of text.toLowerCase()) {
		drawGlyph(buffer, width, height, FONT[char] ?? FONT[' '], cursor, y, scale, color);
		cursor += 6 * scale;
	}
	return cursor - x - scale;
}

function textWidth(text, scale) {
	return (6 * text.length - 1) * scale;
}

/** Nearest 1/2/5 x 10^n physical length for a clean scale bar. */
function niceLengthUm(value) {
	const pow = Math.pow(10, Math.floor(Math.log10(value)));
	const candidates = [1, 2, 5, 10].map((multiplier) => multiplier * pow);
	let best = candidates[0];
	for (const candidate of candidates) {
		if (Math.abs(Math.log10(candidate / value)) < Math.abs(Math.log10(best / value))) best = candidate;
	}
	return best;
}

function drawScaleBar(buffer, width, height, ox, oy, drawW, drawH, umPerPx) {
	const barUm = niceLengthUm(0.18 * drawW * umPerPx);
	const barPx = Math.max(8, barUm / umPerPx);
	const label = `${Math.round(barUm * 1000)} nm`;
	const scale = Math.max(2, Math.round(width / 420));
	const rightEdge = Math.round(ox + drawW - width * 0.025);
	const barY = Math.round(oy + drawH - height * 0.026);
	const thickness = Math.max(2, scale);
	const tick = Math.round(height * 0.013);
	const color = [235, 235, 235];
	fillRect(buffer, width, height, rightEdge - barPx, barY, rightEdge, barY + thickness, color);
	fillRect(buffer, width, height, rightEdge - barPx, barY - tick, rightEdge - barPx + thickness, barY + thickness, color);
	fillRect(buffer, width, height, rightEdge - thickness, barY - tick, rightEdge, barY + thickness, color);
	const labelX = Math.round(rightEdge - barPx / 2 - textWidth(label, scale) / 2);
	const labelY = barY - tick - Math.round(height * 0.012) - 7 * scale;
	drawText(buffer, width, height, label, labelX, labelY, scale, color);
}

function renderFrame(entry, width) {
	const height = width;
	const buffer = new Uint8Array(width * height * 3);
	fillRect(buffer, width, height, 0, 0, width, height, BACKGROUND);

	const { x0, x1, y0, y1, nx, ny } = entry.axes;
	const field = entry.field;
	let maxIntensity = 0;
	for (const value of field) maxIntensity = Math.max(maxIntensity, value * value);
	maxIntensity = maxIntensity || 1;

	// Fit the field extent below the title band, preserving physical aspect.
	const box = { x: width * 0.035, y: width * 0.09, w: width * 0.93, h: width * 0.88 };
	const scale = Math.min(box.w / (x1 - x0), box.h / (y1 - y0));
	const drawW = (x1 - x0) * scale;
	const drawH = (y1 - y0) * scale;
	const ox = box.x + (box.w - drawW) / 2;
	const oy = box.y + (box.h - drawH) / 2;

	for (let py = 0; py < Math.round(drawH); py++) {
		const y = y1 - ((py + 0.5) / drawH) * (y1 - y0);
		const fy = ((y - y0) / (y1 - y0)) * (ny - 1);
		for (let px = 0; px < Math.round(drawW); px++) {
			const x = x0 + ((px + 0.5) / drawW) * (x1 - x0);
			const fx = ((x - x0) / (x1 - x0)) * (nx - 1);
			const value = sampleField(field, nx, ny, fx, fy);
			const t = Math.max(0, Math.min(1, (value * value) / maxIntensity));
			setPixel(buffer, width, Math.round(ox) + px, Math.round(oy) + py, MAGMA[Math.round(t * 255)]);
		}
	}

	strokeDashedRect(buffer, width, height, ox, oy, ox + drawW, oy + drawH, [55, 60, 70], 1e9, 0, 1);
	strokeDashedRect(
		buffer,
		width,
		height,
		ox + (entry.core.x0 - x0) / (x1 - x0) * drawW,
		oy + (y1 - entry.core.y1) / (y1 - y0) * drawH,
		ox + (entry.core.x1 - x0) / (x1 - x0) * drawW,
		oy + (y1 - entry.core.y0) / (y1 - y0) * drawH,
		[255, 255, 255],
		5,
		4,
		1
	);

	// Index cross-section inset, top-left of the drawn field.
	const iw = drawW * 0.25;
	const ih = drawH * 0.25;
	const ix = ox + 4;
	const iy = oy + 4;
	const toIx = (x) => ix + ((x - x0) / (x1 - x0)) * iw;
	const toIy = (y) => iy + ((y1 - y) / (y1 - y0)) * ih;
	for (let py = 0; py < Math.round(ih); py++) {
		const y = y1 - ((py + 0.5) / ih) * (y1 - y0);
		for (let px = 0; px < Math.round(iw); px++) {
			const x = x0 + ((px + 0.5) / iw) * (x1 - x0);
			let index = entry.backgroundIndex;
			for (const region of entry.indexRegions) {
				if (x >= region.x0 && x <= region.x1 && y >= region.y0 && y <= region.y1) index = region.index;
			}
			const t = Math.max(0, Math.min(1, (index - INDEX_MIN) / (INDEX_MAX - INDEX_MIN)));
			setPixel(buffer, width, Math.round(ix) + px, Math.round(iy) + py, VIRIDIS[Math.round(t * 255)]);
		}
	}
	strokeDashedRect(
		buffer,
		width,
		height,
		toIx(entry.core.x0),
		toIy(entry.core.y1),
		toIx(entry.core.x1),
		toIy(entry.core.y0),
		[255, 255, 255],
		4,
		3,
		1
	);
	strokeDashedRect(buffer, width, height, ix, iy, ix + iw, iy + ih, [255, 255, 255], 1e9, 0, 1);
	drawGlyph(buffer, width, height, FONT.n, Math.round(ix) + 4, Math.round(iy) + 4, 2, [235, 235, 235]);

	drawScaleBar(buffer, width, height, ox, oy, drawW, drawH, (x1 - x0) / drawW);

	return { buffer, height };
}

async function writePpm(path, buffer, width, height) {
	const header = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii');
	await writeFile(path, Buffer.concat([header, Buffer.from(buffer)]));
}

function subtitleFor(entry, labels) {
	if (labels.has(entry.id)) return labels.get(entry.id);
	const size = `${entry.dimensions.widthUm} × ${entry.dimensions.heightUm} µm`;
	return `${entry.modeLabel} · ${entry.materialLabel} · ${size}`;
}

export async function buildSocialGif(output, options = {}) {
	const { hybrid = false, size = 1080, seed = 1, fps = FPS } = options;
	const manifest = JSON.parse(await readFile(join(root, 'static/cache/modes/manifest.json'), 'utf8'));
	const proposals = JSON.parse(await readFile(join(root, 'data/proposed/hybrid-waveguides.json'), 'utf8'));
	const labels = new Map();
	for (const preset of proposals.presets) {
		labels.set(preset.id, preset.label);
		for (const variant of preset.variants ?? []) labels.set(variant.id, `${preset.label} · ${variant.basis}`);
	}

	let entries = manifest.entries.filter((entry) => entry.order === 0);
	if (hybrid) entries = entries.filter((entry) => entry.screeningProxy);
	const random = mulberry32(seed);
	for (let i = entries.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[entries[i], entries[j]] = [entries[j], entries[i]];
	}

	const framesDir = await mkdtemp(join(tmpdir(), 'mode-gif-'));
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		const { buffer, height } = renderFrame(entry, size);
		const ppm = join(framesDir, `frame_${String(i).padStart(3, '0')}.ppm`);
		await writePpm(ppm, buffer, size, height);
		execFileSync('magick', [
			ppm,
			'-gravity', 'North',
			'-font', FONT_PATH,
			'-pointsize', String(Math.round(size * 0.022)),
			'-fill', '#9fb3c8',
			'-annotate', `+0+${Math.round(size * 0.026)}`,
			subtitleFor(entry, labels),
			join(framesDir, `frame_${String(i).padStart(3, '0')}.png`)
		]);
	}

	const outputPath = output ?? join(root, 'media/waveguide-cycling.gif');
	await mkdir(dirname(outputPath), { recursive: true });
	execFileSync('ffmpeg', [
		'-y',
		'-framerate', String(fps),
		'-i', join(framesDir, 'frame_%03d.png'),
		'-vf', 'split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a',
		'-loop', '0',
		outputPath
	]);
	await rm(framesDir, { recursive: true, force: true });
	return { output: outputPath, frames: entries.length, fps, order: entries.map((entry) => entry.id) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const options = parseArgs(process.argv.slice(2));
	const result = await buildSocialGif(options.output, options);
	console.log(JSON.stringify(result, null, 2));
}
