export type GalleriesResponse = {
  name: string;
  galleries: Gallery[];
};

export type Gallery = {
  name: string;
  ref: string;
  description: string;
  images: ImageReference[];
};

export type ImageReference = {
  name: string;
  alt: string;
  meta: string;
  originalImageUrl: string;
  sizes: Size[];
  aspectRatio: {
    x: string;
    y: string;
  };
};

export type Size = {
  x: number;
  y: number;
  type: string;
  url: string;
};
