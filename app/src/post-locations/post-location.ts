import { SelectedImage } from "../image-selector";

export interface PostLocation {
  post(image: SelectedImage): Promise<void>;
}
