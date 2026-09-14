import os
from PIL import Image
from PIL.ExifTags import TAGS

def analyze(image_path):
    """Extracts image metadata and returns a structured dictionary."""
    if not os.path.exists(image_path):
        return {"error": "File not found"}
    
    try:
        with Image.open(image_path) as img:
            file_name = os.path.basename(image_path)
            file_size_bytes = os.path.getsize(image_path)
            file_format = img.format or "Unknown"
            width, height = img.size
            
            dpi = img.info.get('dpi')
            resolution = f"{dpi[0]} x {dpi[1]} DPI" if dpi else "N/A"
            color_mode = img.mode

            exif_data = {}
            try:
                exif = img._getexif()
                if exif:
                    for tag_id, value in exif.items():
                        tag = TAGS.get(tag_id, tag_id)
                        exif_data[str(tag)] = str(value)
            except (AttributeError, KeyError, IndexError, TypeError):
                pass

            make = exif_data.get('Make', '').strip()
            model = exif_data.get('Model', '').strip()
            camera = f"{make} {model}".strip() if (make or model) else "N/A"
            date_taken = exif_data.get('DateTimeOriginal', exif_data.get('DateTime', 'N/A'))
            orientation = exif_data.get('Orientation', 'N/A')

            return {
                "type": "IMAGE",
                "file_name": file_name,
                "file_size_bytes": file_size_bytes,
                "file_format": file_format,
                "width": width,
                "height": height,
                "resolution": resolution,
                "color_mode": color_mode,
                "exif": {
                    "camera": camera,
                    "date_taken": date_taken,
                    "orientation": orientation,
                    "extra_tags": exif_data
                }
            }
    except Exception as e:
        return {"error": str(e)}