import type { Fossil } from "../types/fossil";
import type { ImageItem } from "../types/admin";

export function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extensionFromPath(path: string) {
  const cleanPath = path.split("?")[0];
  const extension = cleanPath.split(".").pop()?.toLowerCase();

  return extension && extension.length <= 5 ? extension : "jpg";
}

export function extensionFromFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && extension.length <= 5) {
    return extension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export function sequenceFromPath(path: string, fallback: number) {
  const filename = path.split("/").pop() ?? "";
  const match = filename.match(/_(\d+)\.[a-z0-9]+$/i);

  if (!match) {
    return fallback;
  }

  return Number(match[1]);
}

export function createSavedImages(imagePaths: string[]) {
  return imagePaths.slice(0, 3).map((path, index) => ({
    id: `saved-${path}-${index}`,
    kind: "saved" as const,
    previewUrl: path,
    originalPath: path,
    extension: extensionFromPath(path),
    sequence: sequenceFromPath(path, index + 1),
  }));
}

export function getNextSequence(images: ImageItem[]) {
  const usedSequences = new Set(images.map((image) => image.sequence));

  for (let number = 1; number <= 3; number++) {
    if (!usedSequences.has(number)) {
      return number;
    }
  }

  return images.length + 1;
}

export function createNewImage(file: File, sequence: number): ImageItem {
  return {
    id: `new-${createId()}`,
    kind: "new",
    previewUrl: URL.createObjectURL(file),
    extension: extensionFromFile(file),
    sequence,
    file,
  };
}

export function imageFilename(fossil: Fossil, image: ImageItem) {
  const fossilName = slugify(fossil.name) || slugify(fossil.id) || "fossiel";

  return `${fossilName}_${image.sequence}.${image.extension}`;
}

export function imageUploadPath(fossil: Fossil, image: ImageItem) {
  return `/uploads/images/${imageFilename(fossil, image)}`;
}

export function audioExtensionFromFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && extension.length <= 5) {
    return extension;
  }

  if (file.type.includes("wav")) {
    return "wav";
  }

  if (file.type.includes("mp4") || file.type.includes("m4a")) {
    return "m4a";
  }

  return "mp3";
}

export function audioUploadPath(fossil: Fossil, file: File) {
  const fossilName = slugify(fossil.name) || slugify(fossil.id) || "fossiel";

  return `/uploads/audio/${fossilName}.${audioExtensionFromFile(file)}`;
}