import os
import ffmpeg

def analyze(video_path):
    """Extracts video metadata and returns a structured dictionary."""
    if not os.path.exists(video_path):
        return {"error": "File not found"}
    try:
        probe = ffmpeg.probe(video_path)
    except ffmpeg.Error as e:
        return {"error": e.stderr.decode() if e.stderr else str(e)}

    format_info = probe.get('format', {})
    streams = probe.get('streams', [])
    video_stream = next((s for s in streams if s['codec_type'] == 'video'), {})
    audio_stream = next((s for s in streams if s['codec_type'] == 'audio'), {})

    file_name = os.path.basename(video_path)
    file_size_bytes = int(format_info.get('size', os.path.getsize(video_path)))
    container = format_info.get('format_long_name', format_info.get('format_name', 'N/A'))
    duration = float(format_info.get('duration', 0))

    # Video stream metrics
    v_resolution = f"{video_stream.get('width', 'N/A')}x{video_stream.get('height', 'N/A')}" if video_stream else "N/A"
    v_framerate = video_stream.get('r_frame_rate', 'N/A') if video_stream else "N/A"
    v_bitrate = video_stream.get('bit_rate', 'N/A') if video_stream else "N/A"
    v_codec_name = video_stream.get('codec_name', 'N/A') if video_stream else "N/A"
    v_codec_long = video_stream.get('codec_long_name', '') if video_stream else ""
    v_codec = f"{v_codec_long} ({v_codec_name})" if v_codec_long else v_codec_name

    # Audio stream metrics
    a_codec_name = audio_stream.get('codec_name', 'N/A') if audio_stream else "N/A"
    a_codec_long = audio_stream.get('codec_long_name', '') if audio_stream else ""
    a_codec = f"{a_codec_long} ({a_codec_name})" if a_codec_long else a_codec_name
    a_channels = audio_stream.get('channels', 'N/A') if audio_stream else "N/A"
    a_sample_rate = audio_stream.get('sample_rate', 'N/A') if audio_stream else "N/A"
    a_bitrate = audio_stream.get('bit_rate', 'N/A') if audio_stream else "N/A"

    tags = format_info.get('tags', {})

    return {
        "type": "VIDEO",
        "file_name": file_name,
        "file_size_bytes": file_size_bytes,
        "container": container,
        "duration": duration,
        "video": {
            "resolution": v_resolution,
            "frame_rate": v_framerate,
            "bit_rate": v_bitrate,
            "codec": v_codec
        },
        "audio": {
            "codec": a_codec,
            "channels": a_channels,
            "sample_rate": a_sample_rate,
            "bit_rate": a_bitrate
        },
        "metadata": tags
    }