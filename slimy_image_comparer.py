from nodes import PreviewImage


class SlimyImageComparer(PreviewImage):
    """A/B画像を比較するノード。解像度表示とA/Bラベル付き。"""

    NAME = "Slimy_ImageComparer"
    CATEGORY = "Slimy"
    FUNCTION = "compare_images"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "image_A": ("IMAGE",),
                "image_B": ("IMAGE",),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    def compare_images(self, image_A=None, image_B=None,
                       filename_prefix="slimy.compare.",
                       prompt=None, extra_pnginfo=None):
        result = {"ui": {"a_images": [], "b_images": [], "a_size": [], "b_size": []}}

        if image_A is not None and len(image_A) > 0:
            result["ui"]["a_images"] = self.save_images(
                image_A, filename_prefix, prompt, extra_pnginfo)["ui"]["images"]
            h, w = image_A.shape[1], image_A.shape[2]
            result["ui"]["a_size"] = [{"w": w, "h": h}]

        if image_B is not None and len(image_B) > 0:
            result["ui"]["b_images"] = self.save_images(
                image_B, filename_prefix, prompt, extra_pnginfo)["ui"]["images"]
            h, w = image_B.shape[1], image_B.shape[2]
            result["ui"]["b_size"] = [{"w": w, "h": h}]

        return result
