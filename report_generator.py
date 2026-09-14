import json
import os

def format_file_size(size_bytes):
    """Converts bytes into KB, MB, or GB."""
    if size_bytes < 1024:
        return f"{size_bytes} Bytes"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

def format_duration(seconds):
    """Formats seconds into HH:MM:SS."""
    try:
        seconds = float(seconds)
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:05.2f}"
        else:
            return f"{minutes:02d}:{secs:05.2f}"
    except (TypeError, ValueError):
        return "N/A"

def generate_console_report(data):
    """Generates the formatted console text layout based on file type."""
    if "error" in data:
        print(f"Error: {data['error']}")
        return

    dtype = data.get("type")
    size_str = format_file_size(data.get("file_size_bytes", 0))

    if dtype == "IMAGE":
        print("================================")
        print("IMAGE METADATA REPORT")
        print("================================")
        print(f"File Name       : {data['file_name']}")
        print(f"File Size       : {size_str}")
        print(f"File Format     : {data['file_format']}")
        print(f"Width           : {data['width']} px")
        print(f"Height          : {data['height']} px")
        print(f"Resolution      : {data['resolution']}")
        print(f"Color Mode      : {data['color_mode']}")
        print()
        print("EXIF Metadata")
        print("-------------------------------")
        exif = data.get("exif", {})
        print(f"Camera          : {exif.get('camera', 'N/A')}")
        print(f"Date Taken      : {exif.get('date_taken', 'N/A')}")
        print(f"Orientation     : {exif.get('orientation', 'N/A')}")

    elif dtype == "AUDIO":
        print("================================")
        print("AUDIO METADATA REPORT")
        print("================================")
        print(f"File Name       : {data['file_name']}")
        print(f"File Size       : {size_str}")
        print(f"Container       : {data['container']}")
        print(f"Duration        : {format_duration(data['duration'])}")
        print()
        print("AUDIO")
        print("--------------------------------")
        audio = data.get("audio", {})
        print(f"Codec           : {audio.get('codec', 'N/A')}")
        print(f"Channels        : {audio.get('channels', 'N/A')}")
        print(f"Sampling Rate   : {audio.get('sample_rate', 'N/A')} Hz")
        print(f"Bit Rate        : {audio.get('bit_rate', 'N/A')}")
        print()
        print("METADATA")
        print("--------------------------------")
        meta = data.get("metadata", {})
        if meta:
            for k, v in meta.items():
                print(f"{k:<15} : {v}")
        else:
            print("No extra metadata tags found.")

    elif dtype == "VIDEO":
        print("================================")
        print("VIDEO METADATA REPORT")
        print("================================")
        print(f"File Name       : {data['file_name']}")
        print(f"File Size       : {size_str}")
        print(f"Container       : {data['container']}")
        print(f"Duration        : {format_duration(data['duration'])}")
        print()
        print("VIDEO")
        print("--------------------------------")
        video = data.get("video", {})
        print(f"Resolution      : {video.get('resolution', 'N/A')}")
        print(f"Frame Rate      : {video.get('frame_rate', 'N/A')}")
        print(f"Bit Rate        : {video.get('bit_rate', 'N/A')}")
        print(f"Codec           : {video.get('codec', 'N/A')}")
        print()
        print("AUDIO")
        print("--------------------------------")
        audio = data.get("audio", {})
        print(f"Codec           : {audio.get('codec', 'N/A')}")
        print(f"Channels        : {audio.get('channels', 'N/A')}")
        print(f"Sampling Rate   : {audio.get('sample_rate', 'N/A')} Hz")
        print(f"Bit Rate        : {audio.get('bit_rate', 'N/A')}")
        print()
        print("METADATA")
        print("--------------------------------")
        meta = data.get("metadata", {})
        if meta:
            for k, v in meta.items():
                print(f"{k:<15} : {v}")
        else:
            print("No extra metadata tags found.")

def save_json_report(data, output_dir="reports", filename="report.json"):
    """Saves the consolidated report dictionary into a JSON file."""
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, filename)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
    print(f"\n[+] Consolidated JSON report saved to: {output_path}")