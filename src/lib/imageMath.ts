import type { Photo } from './media';

/** Result of analysing one photo. */
export type PhotoAnalysis = {
  /** Variance of the Laplacian on a downscaled grayscale copy. Low = blurry. */
  sharpness: number;
  /** 64-bit difference hash as 16 hex chars. Small Hamming distance = visually similar. */
  hash: string;
};

/** Variance of the 4-neighbour Laplacian: the classic, cheap focus measure. */
export function laplacianVariance(gray: Float32Array, width: number, height: number): number {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** dHash: box-downsample to 9×8 and compare horizontal neighbours. */
export function differenceHash(gray: Float32Array, width: number, height: number): string {
  const cols = 9;
  const rows = 8;
  const cells = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const y0 = Math.floor((r * height) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * height) / rows));
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor((c * width) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * width) / cols));
      let total = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) total += gray[y * width + x];
      }
      cells[r * cols + c] = total / ((y1 - y0) * (x1 - x0));
    }
  }
  let hex = '';
  for (let r = 0; r < rows; r++) {
    let byte = 0;
    for (let c = 0; c < cols - 1; c++) {
      byte = (byte << 1) | (cells[r * cols + c] > cells[r * cols + c + 1] ? 1 : 0);
    }
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

function popcount32(v: number): number {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

export function hammingDistance(a: string, b: string): number {
  return (
    popcount32(parseInt(a.slice(0, 8), 16) ^ parseInt(b.slice(0, 8), 16)) +
    popcount32(parseInt(a.slice(8, 16), 16) ^ parseInt(b.slice(8, 16), 16))
  );
}

export type SimilarGroup = {
  /** Newest first. */
  photos: Photo[];
  /** Sharpest photo in the group: the suggested one to keep. */
  bestId: string;
};

/** Max Hamming distance (out of 64 bits) for two photos to count as similar. */
const SIMILAR_DISTANCE = 10;
/** Only compare photos taken within this window of each other: near-duplicates are usually bursts. */
const SIMILAR_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Clusters analysed photos into groups of near-duplicates. Photos must be sorted newest first.
 * Comparisons are limited to a sliding time window, which keeps this fast on big libraries.
 */
export function findSimilarGroups(
  photos: Photo[],
  results: Record<string, PhotoAnalysis | null>,
): SimilarGroup[] {
  const analysed = photos.filter((p) => results[p.id]);
  const parent = analysed.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };

  for (let i = 0; i < analysed.length; i++) {
    const hashI = results[analysed[i].id]!.hash;
    for (let j = i + 1; j < analysed.length; j++) {
      if (analysed[i].creationTime - analysed[j].creationTime > SIMILAR_WINDOW_MS) break;
      if (hammingDistance(hashI, results[analysed[j].id]!.hash) <= SIMILAR_DISTANCE) {
        parent[find(j)] = find(i);
      }
    }
  }

  const clusters = new Map<number, Photo[]>();
  analysed.forEach((photo, i) => {
    const root = find(i);
    const list = clusters.get(root);
    if (list) list.push(photo);
    else clusters.set(root, [photo]);
  });

  const groups: SimilarGroup[] = [];
  for (const list of clusters.values()) {
    if (list.length < 2) continue;
    let best = list[0];
    for (const p of list) {
      if (results[p.id]!.sharpness > results[best.id]!.sharpness) best = p;
    }
    groups.push({ photos: list, bestId: best.id });
  }
  return groups.sort((a, b) => b.photos[0].creationTime - a.photos[0].creationTime);
}

export type BlurSensitivity = 'low' | 'medium' | 'high';

/** Sharpness thresholds for the 256px analysis copy; below = flagged as blurry. */
export const BLUR_THRESHOLDS: Record<BlurSensitivity, number> = {
  low: 40,
  medium: 80,
  high: 150,
};
