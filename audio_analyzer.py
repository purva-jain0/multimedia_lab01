import os
import ffmpeg

def analyze(audio_path):
    """Extracts audio metadata and returns a structured dictionary."""
    if not os.path.exists(audio_path):
        return {"error": "File not found"}
    try:
        probe = ffmpeg.probe(audio_path)
    except ffmpeg.Error as e:
        return {"error": e.stderr.decode() if e.stderr else str(e)}

    format_info = probe.get('format', {})
    streams = probe.get('streams', [])
    audio_stream = next((s for s in streams if s['codec_type'] == 'audio'), {})

    file_name = os.path.basename(audio_path)
    file_size_bytes = int(format_info.get('size', os.path.getsize(audio_path)))
    container = format_info.get('format_long_name', format_info.get('format_name', 'N/A'))
    duration = float(format_info.get('duration', 0))

    codec_name = audio_stream.get('codec_name', 'N/A')
    codec_long = audio_stream.get('codec_long_name', '')
    codec_full = f"{codec_long} ({codec_name})" if codec_long else codec_name
    
    channels = audio_stream.get('channels', 'N/A')
    sample_rate = audio_stream.get('sample_rate', 'N/A')
    bitrate = audio_stream.get('bit_rate', format_info.get('bit_rate', 'N/A'))
    tags = format_info.get('tags', {})

    return {
        "type": "AUDIO",
        "file_name": file_name,
        "file_size_bytes": file_size_bytes,
        "container": container,
        "duration": duration,
        "audio": {
            "codec": codec_full,
            "channels": channels,
            "sample_rate": sample_rate,
            "bit_rate": bitrate
        },
        "metadata": tags
    }