export type ImageItem = {
  id: string;
  kind: "saved" | "new";
  previewUrl: string;
  extension: string;
  sequence: number;
  originalPath?: string;
  file?: File;
};

export type PendingMedia = {
  images?: ImageItem[];
  audioFile?: File;
  audioPreviewUrl?: string;
};

export type CurrentScan = {
  uid: string;
  time: number;
};