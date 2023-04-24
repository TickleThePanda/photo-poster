import { SelectedImage } from "../image-selector";

export interface PostLocation {
  readonly type: string;
  canPost(image: SelectedImage): Promise<boolean>;
  post(image: SelectedImage): Promise<void>;
}
