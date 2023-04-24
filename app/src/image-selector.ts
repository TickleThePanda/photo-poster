import type {
  GalleriesResponse,
  Gallery,
  ImageReference,
  Size,
} from "./gallery";

export type SelectedImage = ImageReference &
  Size & {
    blob: Blob;
    fullUrl: string;
  };

export class ImageSelector {
  constructor(private url: string) {}

  async selectRandomImage(): Promise<SelectedImage> {
    const result = await fetch(this.url);

    const galleries = ((await result.json()) as GalleriesResponse).galleries;
    const selectedImage = selectRandomImage(galleries);
    console.log(`Selected random image '${selectedImage.name}'`);
    const largestSize = getLargestSizeImage(selectedImage);
    console.log(`Selected size ${largestSize.x}x${largestSize.y}`);

    const url = this.url + largestSize.url;

    const blob = await getFileAsBlob(url);

    return Object.assign({}, selectedImage, largestSize, {
      blob,
      fullUrl: url,
    });
  }
}

function selectRandomImage(galleries: Gallery[]): ImageReference {
  const allImages = galleries.flatMap((g) => g.images);
  const imageCount = allImages.length;
  const randomIndex = Math.floor(Math.random() * imageCount);
  const selectedImage = allImages[randomIndex];
  return selectedImage;
}

function getLargestSizeImage(selectedImage: ImageReference): Size {
  const smallestSize: Size = {
    x: 0,
    y: 0,
  } as Size;
  const imageSizes = selectedImage.sizes.filter((s) => (s.type = "webp"));
  const largestSize = imageSizes.reduce(
    (p, c) => (c.x > p.x ? c : p),
    smallestSize
  );
  return largestSize;
}

async function getFileAsBlob(url: string): Promise<Blob> {
  console.log(`Downloading image ${url}`);
  const response = await fetch(url);

  console.log(`Response from server ${response.status} ${response.statusText}`);

  return await response.blob();
}
