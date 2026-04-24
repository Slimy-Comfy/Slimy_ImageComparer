from .slimy_image_comparer import SlimyImageComparer
import os

WEB_DIRECTORY = os.path.join(os.path.dirname(__file__), "web")

NODE_CLASS_MAPPINGS = {
    "Slimy_ImageComparer": SlimyImageComparer,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Slimy_ImageComparer": "Slimy_ImageComparer",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
