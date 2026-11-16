import { supabase } from '../api/supabaseClient';

const DICOM_MIME_TYPES = new Set(['image/dicom', 'application/dicom']);
const DEFAULT_RADIOLOGY_MAX_DIMENSION = 3072;
const DEFAULT_RADIOLOGY_MAX_BYTES = 12 * 1024 * 1024;

function isDicomFile(file: File): boolean {
  return (
    DICOM_MIME_TYPES.has(file.type) || file.name.toLowerCase().endsWith('.dcm')
  );
}

function replaceFileExtension(fileName: string, extension: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0) return `${fileName}${extension}`;
  return `${fileName.slice(0, dotIndex)}${extension}`;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image: ${file.name}`));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate optimized image blob.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Optimizes non-DICOM image files before upload to control storage growth at scale.
 * DICOM files are returned unchanged.
 */
export async function optimizeRadiologyUploadFile(
  file: File,
  options?: {
    maxDimension?: number;
    maxBytes?: number;
  },
): Promise<File> {
  if (isDicomFile(file) || !file.type.startsWith('image/')) {
    return file;
  }

  const maxDimension = options?.maxDimension ?? DEFAULT_RADIOLOGY_MAX_DIMENSION;
  const maxBytes = options?.maxBytes ?? DEFAULT_RADIOLOGY_MAX_BYTES;

  try {
    const image = await loadImageFromFile(file);
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    const longestEdge = Math.max(originalWidth, originalHeight);

    const scale = longestEdge > maxDimension ? maxDimension / longestEdge : 1;
    const targetWidth = Math.max(1, Math.round(originalWidth * scale));
    const targetHeight = Math.max(1, Math.round(originalHeight * scale));
    const shouldResize = scale < 1;
    const shouldCompress = file.size > maxBytes;

    if (!shouldResize && !shouldCompress) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      return file;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const preferredMime = file.type === 'image/png' ? 'image/jpeg' : file.type;
    const mimeType =
      preferredMime === 'image/webp' || preferredMime === 'image/jpeg'
        ? preferredMime
        : 'image/jpeg';

    let quality = 0.92;
    let blob = await canvasToBlob(canvas, mimeType, quality);

    while (blob.size > maxBytes && quality > 0.72) {
      quality -= 0.06;
      blob = await canvasToBlob(canvas, mimeType, quality);
    }

    const outputName =
      mimeType === file.type
        ? file.name
        : replaceFileExtension(file.name, '.jpg');

    if (blob.size >= file.size && !shouldResize) {
      return file;
    }

    return new File([blob], outputName, {
      type: mimeType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

/**
 * Uploads a file to Supabase Storage
 * @param file The file to upload
 * @param bucket The storage bucket name
 * @param path The path within the bucket (e.g., 'radiology/request-123/image.jpg')
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
}

/**
 * Generates a signed URL for a private file
 * @param bucket The storage bucket name
 * @param path The path within the bucket
 * @param expiresIn Expiration time in seconds (default 1 hour)
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!path) return null;

  // If it's already a full URL (http...), return it as is
  if (path.startsWith('http')) return path;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Generates a unique file path for radiology images
 * @param requestId The radiology request ID
 * @param fileName The original file name
 * @returns A structured path string
 */
export function generateRadiologyImagePath(
  requestId: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');
  return `${requestId}/${timestamp}_${cleanFileName}`;
}

/**
 * Maps items with bounded concurrency to avoid saturating slow networks.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const safeConcurrency = Math.max(1, Math.floor(concurrency));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) break;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  };

  const workerCount = Math.min(safeConcurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
