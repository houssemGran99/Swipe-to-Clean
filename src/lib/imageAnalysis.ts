import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import UPNG from 'upng-js';

import { differenceHash, laplacianVariance, type PhotoAnalysis } from './imageMath';
import { resolveUri, type Photo } from './media';

export * from './imageMath';

/** Longest side of the copy we analyse. Big enough to keep edge detail, small enough to be fast. */
const ANALYSIS_SIZE = 256;

/**
 * Downscales a photo natively, decodes the PNG in JS and computes a sharpness score and a
 * perceptual hash. Resolves to null if the photo can't be read (e.g. not downloaded from iCloud).
 */
export async function analyzePhoto(photo: Photo): Promise<PhotoAnalysis | null> {
  let tempUri: string | null = null;
  try {
    const uri = await resolveUri(photo.id);
    const landscape = photo.width >= photo.height;
    const context = ImageManipulator.manipulate(uri).resize(
      landscape ? { width: ANALYSIS_SIZE } : { height: ANALYSIS_SIZE },
    );
    const ref = await context.renderAsync();
    const result = await ref.saveAsync({ format: SaveFormat.PNG, base64: true });
    context.release();
    ref.release();
    tempUri = result.uri;
    if (!result.base64) return null;

    const png = UPNG.decode(base64ToArrayBuffer(result.base64));
    const rgba = new Uint8Array(UPNG.toRGBA8(png)[0]);
    const gray = toGrayscale(rgba, png.width, png.height);
    return {
      sharpness: laplacianVariance(gray, png.width, png.height),
      hash: differenceHash(gray, png.width, png.height),
    };
  } catch {
    return null;
  } finally {
    if (tempUri) {
      try {
        new File(tempUri).delete();
      } catch {
        // Temp file already gone; nothing to clean up.
      }
    }
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function toGrayscale(rgba: Uint8Array, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }
  return gray;
}

