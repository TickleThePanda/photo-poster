import { SelectedImage } from "../image-selector";

export interface PostLocation {
  canPost(image: SelectedImage): Promise<boolean>;
  post(image: SelectedImage): Promise<void>;
}
