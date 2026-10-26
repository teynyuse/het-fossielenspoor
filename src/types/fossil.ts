export type Fossil = {
  id: string;
  name: string;
  period: string;
  age: string;
  shortDescription: string;
  imagePaths: string[];
  rfidUids: string[];
  ledNumber?: number;
  audioPath?: string;
  audioScript?: string;
};

export type FossilsStore = {
  fossils: Fossil[];
};