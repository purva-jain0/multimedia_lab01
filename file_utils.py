import os

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.tiff', '.webp', '.bmp'}
AUDIO_EXTENSIONS = {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'}
VIDEO_EXTENSIONS = {'.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv'}

def validate_file(file_path):
    """Checks if the file exists and is accessible."""
    if not os.path.exists(file_path):
        return False, "File does not exist."
    if not os.path.isfile(file_path):
        return False, "Path is not a valid file."
    return True, "Valid"

def get_file_extension(file_path):
    """Returns lowercased file extension."""
    return os.path.splitext(file_path)[1].lower()

def identify_file_type(file_path):
    """Identifies whether the file is an IMAGE, AUDIO, or VIDEO."""
    ext = get_file_extension(file_path)
    if ext in IMAGE_EXTENSIONS:
        return "IMAGE"
    elif ext in AUDIO_EXTENSIONS:
        return "AUDIO"
    elif ext in VIDEO_EXTENSIONS:
        return "VIDEO"
    else:
        return "UNKNOWN"