import os
import io
import sys
import uuid
import shutil
import logging
import subprocess
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voice_cloning_app")

# Base directories
BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
OUTPUTS_DIR = STORAGE_DIR / "outputs"
ENV_FILE = BASE_DIR / ".env"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# Load environment variables
load_dotenv(ENV_FILE)

# ElevenLabs client initialization
from elevenlabs.client import ElevenLabs
from elevenlabs import VoiceSettings

app = FastAPI(
    title="ElevenLabs Voice Cloning & Transformation API",
    description="Backend for Voice Cloning and Speech-to-Speech Transformation with React Frontend",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pre-defined curated ElevenLabs voices
CURATED_VOICES = [
    {
        "voice_id": "pNInz6obpgDQGcFmaJgB",
        "name": "Adam",
        "category": "premade",
        "gender": "male",
        "accent": "American",
        "style": "Deep, Narrative, Warm",
        "description": "Deep, natural, narrative voice perfect for narration and authoritative speech."
    },
    {
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "name": "Rachel",
        "category": "premade",
        "gender": "female",
        "accent": "American",
        "style": "Calm, Clear, Friendly",
        "description": "Calm, young female voice with clear articulation and natural warmth."
    },
    {
        "voice_id": "ErXwobaYiN019PkySvjV",
        "name": "Antoni",
        "category": "premade",
        "gender": "male",
        "accent": "American",
        "style": "Well-rounded, Energetic",
        "description": "Great all-rounder male voice with natural inflections."
    },
    {
        "voice_id": "VR6AewLTigWG4xSOukaG",
        "name": "Arnold",
        "category": "premade",
        "gender": "male",
        "accent": "American",
        "style": "Crisp, Action, Confident",
        "description": "Crisp, confident male voice with dramatic energy."
    },
    {
        "voice_id": "EXAVITQu4vr4xnSDxMaL",
        "name": "Bella",
        "category": "premade",
        "gender": "female",
        "accent": "American",
        "style": "Soft, Expressive, Sweet",
        "description": "Sweet, expressive voice suitable for storytelling."
    },
    {
        "voice_id": "IKne3meq5aSn9XLyUdCD",
        "name": "Charlie",
        "category": "premade",
        "gender": "male",
        "accent": "Australian",
        "style": "Casual, Friendly, Laid-back",
        "description": "Casual Australian voice with a warm, conversational flow."
    },
    {
        "voice_id": "AZnzlk1XvdvUeBnXmlld",
        "name": "Domi",
        "category": "premade",
        "gender": "female",
        "accent": "American",
        "style": "Strong, Emphatic, Dynamic",
        "description": "Dynamic, strong voice with emotional delivery."
    },
    {
        "voice_id": "TxGEqnHWrfWFTfGW9XjX",
        "name": "Josh",
        "category": "premade",
        "gender": "male",
        "accent": "American",
        "style": "Deep, Conversational, Young Adult",
        "description": "Young adult resonant male voice."
    },
    {
        "voice_id": "piTKgcLEGmPE4e6mEKli",
        "name": "Nicole",
        "category": "premade",
        "gender": "female",
        "accent": "American",
        "style": "Whispery, Calm, Relaxed",
        "description": "Very relaxed, gentle whisper-like tone."
    },
    {
        "voice_id": "onwK4e9ZLuTAKqWW03F9",
        "name": "Daniel",
        "category": "premade",
        "gender": "male",
        "accent": "British",
        "style": "Authoritative, Formal, Deep",
        "description": "Sophisticated British male voice suitable for news and documentaries."
    }
]

def get_elevenlabs_client() -> Optional[ElevenLabs]:
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        return ElevenLabs(api_key=api_key)
    except Exception as e:
        logger.error(f"Error creating ElevenLabs client: {e}")
        return None

def convert_to_mp3(input_path: Path, output_path: Path) -> bool:
    """Use FFmpeg to convert input audio (e.g. webm/opus, wav) to clean mp3."""
    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", str(input_path),
            "-ar", "44100",
            "-ac", "2",
            "-b:a", "192k",
            str(output_path)
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg conversion error: {e.stderr.decode('utf-8', errors='ignore')}")
        return False
    except Exception as e:
        logger.error(f"FFmpeg execution failed: {e}")
        return False

def apply_local_dsp_effect(input_path: Path, output_path: Path, effect_type: str) -> bool:
    """Fallback local audio transformation using FFmpeg filters."""
    filter_expr = ""
    if effect_type == "deep_narration":
        # Pitch down ~4 semitones and boost low frequencies
        filter_expr = "asetrate=44100*0.78,aresample=44100,atempo=1/0.78,equalizer=f=120:width_type=o:width=1:g=4"
    elif effect_type == "chipmunk_high":
        # Pitch up ~5 semitones
        filter_expr = "asetrate=44100*1.32,aresample=44100,atempo=1/1.32"
    elif effect_type == "cyborg_robot":
        # Flanger + tremolo for robotic feel
        filter_expr = "flanger=delay=8:depth=4:regen=50:width=80:speed=2,tremolo=f=30:d=0.8"
    elif effect_type == "vintage_radio":
        # Telephone/Radio bandpass filter
        filter_expr = "highpass=f=400,lowpass=f=3200,volume=1.5,acrusher=bits=8:mode=log:aa=1"
    elif effect_type == "whisper_echo":
        filter_expr = "aecho=0.8:0.88:60:0.4"
    else:
        # Default subtle pitch change
        filter_expr = "asetrate=44100*0.85,aresample=44100,atempo=1/0.85"

    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", str(input_path),
            "-af", filter_expr,
            "-ar", "44100",
            "-ac", "2",
            str(output_path)
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception as e:
        logger.error(f"DSP effect failed: {e}")
        return False

def extract_elevenlabs_error(e: Exception) -> str:
    """Extract human-readable error message from ElevenLabs ApiError."""
    if hasattr(e, "body") and isinstance(e.body, dict):
        detail = e.body.get("detail", {})
        if isinstance(detail, dict) and "message" in detail:
            return detail["message"]
        elif isinstance(detail, str):
            return detail
    return str(e)

# Pydantic models
class KeyPayload(BaseModel):
    api_key: str

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "ElevenLabs Voice Cloning App",
        "version": "1.0.0"
    }

@app.get("/api/status")
def get_status():
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    has_key = bool(api_key)
    is_valid = False
    user_info = None
    error_message = None

    if has_key:
        client = get_elevenlabs_client()
        if client:
            try:
                user = client.user.get()
                is_valid = True
                user_info = {
                    "subscription_tier": getattr(user.subscription, "tier", "unknown"),
                    "character_count": getattr(user.subscription, "character_count", 0),
                    "character_limit": getattr(user.subscription, "character_limit", 0),
                }
            except Exception as e:
                error_message = extract_elevenlabs_error(e)
                logger.warning(f"Failed to validate key: {error_message}")

    return {
        "has_api_key": has_key,
        "is_valid": is_valid,
        "user_info": user_info,
        "error_message": error_message,
        "masked_key": f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else ("Set" if has_key else "Not configured")
    }

@app.post("/api/set-key")
def set_api_key(payload: KeyPayload):
    key = payload.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API Key cannot be empty")

    # Test key validity
    try:
        client = ElevenLabs(api_key=key)
        client.user.get()
    except Exception as e:
        clean_err = extract_elevenlabs_error(e)
        raise HTTPException(status_code=400, detail=f"Invalid ElevenLabs API Key: {clean_err}")

    # Update runtime environment
    os.environ["ELEVENLABS_API_KEY"] = key

    # Persist to .env file
    try:
        lines = []
        if ENV_FILE.exists():
            with open(ENV_FILE, "r") as f:
                lines = f.readlines()
        
        key_found = False
        new_lines = []
        for line in lines:
            if line.startswith("ELEVENLABS_API_KEY="):
                new_lines.append(f"ELEVENLABS_API_KEY={key}\n")
                key_found = True
            else:
                new_lines.append(line)
        if not key_found:
            new_lines.append(f"ELEVENLABS_API_KEY={key}\n")

        with open(ENV_FILE, "w") as f:
            f.writelines(new_lines)
    except Exception as e:
        logger.error(f"Error persisting .env: {e}")

    return {"success": True, "message": "API key successfully configured and saved"}

@app.get("/api/voices")
def get_voices():
    """Retrieve available voices from ElevenLabs account or fallback curated list."""
    client = get_elevenlabs_client()
    remote_voices = []

    if client:
        try:
            voices_res = client.voices.get_all()
            for v in voices_res.voices:
                # Determine gender / accent / labels
                labels = getattr(v, "labels", {}) or {}
                gender = labels.get("gender", "unknown")
                accent = labels.get("accent", "unknown")
                description = getattr(v, "description", "") or f"{gender} voice with {accent} accent"

                remote_voices.append({
                    "voice_id": v.voice_id,
                    "name": v.name,
                    "category": getattr(v, "category", "custom"),
                    "gender": gender,
                    "accent": accent,
                    "style": labels.get("description", labels.get("tone", "")),
                    "description": description,
                    "preview_url": getattr(v, "preview_url", None),
                    "is_cloned": getattr(v, "category", "") in ["cloned", "generated"]
                })
        except Exception as e:
            logger.warning(f"Could not fetch voices from ElevenLabs: {e}")

    # If remote voices were retrieved, return them along with indicator
    if remote_voices:
        return {
            "source": "elevenlabs_live",
            "voices": remote_voices
        }

    # Otherwise return curated presets
    return {
        "source": "curated_presets",
        "voices": CURATED_VOICES
    }

@app.post("/api/transform-voice")
async def transform_voice(
    audio: UploadFile = File(...),
    voice_id: str = Form(...),
    voice_name: Optional[str] = Form("Selected Voice"),
    mode: Optional[str] = Form("elevenlabs"),
    local_effect: Optional[str] = Form("deep_narration"),
    stability: Optional[float] = Form(0.5),
    similarity_boost: Optional[float] = Form(0.75),
    model_id: Optional[str] = Form("eleven_multilingual_sts_v2")
):
    """
    Transforms user's voice into the target voice using ElevenLabs Speech-to-Speech (STS),
    or applies high-quality local DSP effects if requested or key not configured.
    """
    req_id = str(uuid.uuid4())[:8]
    original_ext = Path(audio.filename or "recording.webm").suffix or ".webm"
    raw_input_path = UPLOADS_DIR / f"{req_id}_raw{original_ext}"
    input_mp3_path = UPLOADS_DIR / f"{req_id}_input.mp3"
    output_mp3_path = OUTPUTS_DIR / f"{req_id}_output.mp3"

    try:
        # Save raw uploaded audio
        with open(raw_input_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        # Convert to standardized 44.1kHz MP3
        if not convert_to_mp3(raw_input_path, input_mp3_path):
            raise HTTPException(status_code=400, detail="Failed to process input audio with FFmpeg. Make sure microphone recorded sound.")

        # Check audio file size
        if input_mp3_path.stat().st_size < 1024:
            raise HTTPException(status_code=400, detail="Recording is too short or empty. Please hold spacebar and speak clearly.")

        client = get_elevenlabs_client()

        # If user explicitly requested local DSP or no ElevenLabs key is present
        if mode == "local_dsp" or (not client and mode != "force_elevenlabs"):
            logger.info(f"Using local DSP effect: {local_effect}")
            success = apply_local_dsp_effect(input_mp3_path, output_mp3_path, local_effect)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to apply local voice effect.")
            
            return {
                "success": True,
                "mode_used": "local_dsp",
                "effect_name": local_effect,
                "voice_name": f"{voice_name} (Local Effect)",
                "input_audio_url": f"/api/audio/{input_mp3_path.name}",
                "output_audio_url": f"/api/audio/{output_mp3_path.name}",
                "message": "Transformed using Local Voice Effect (Provide ElevenLabs API key for AI voice cloning)."
            }

        # Otherwise execute ElevenLabs Speech-to-Speech
        if not client:
            raise HTTPException(
                status_code=400, 
                detail="ElevenLabs API key is not configured. Please enter your API key in Settings or choose Local Effect mode."
            )

        logger.info(f"Calling ElevenLabs STS for voice_id: {voice_id}, model: {model_id}")
        
        try:
            with open(input_mp3_path, "rb") as audio_file:
                voice_settings_obj = VoiceSettings(
                    stability=stability or 0.5,
                    similarity_boost=similarity_boost or 0.75,
                )
                
                audio_stream = client.speech_to_speech.convert(
                    voice_id=voice_id,
                    audio=audio_file,
                    model_id=model_id or "eleven_multilingual_sts_v2",
                    output_format="mp3_44100_128",
                    voice_settings=voice_settings_obj.model_dump_json() if hasattr(voice_settings_obj, "model_dump_json") else None
                )

                with open(output_mp3_path, "wb") as f_out:
                    for chunk in audio_stream:
                        f_out.write(chunk)

            if not output_mp3_path.exists() or output_mp3_path.stat().st_size == 0:
                raise Exception("ElevenLabs returned empty audio stream.")

            return {
                "success": True,
                "mode_used": "elevenlabs",
                "voice_id": voice_id,
                "voice_name": voice_name,
                "input_audio_url": f"/api/audio/{input_mp3_path.name}",
                "output_audio_url": f"/api/audio/{output_mp3_path.name}",
                "message": f"Successfully transformed voice to {voice_name} using ElevenLabs AI!"
            }

        except Exception as api_err:
            logger.error(f"ElevenLabs STS API error: {api_err}")
            err_msg = str(api_err)
            
            # If the user's tier doesn't support STS or quota exhausted, provide automatic fallback option
            if "speech_to_speech" in err_msg.lower() or "tier" in err_msg.lower() or "quota" in err_msg.lower() or "401" in err_msg:
                # Apply fallback DSP so user still hears transformed voice
                apply_local_dsp_effect(input_mp3_path, output_mp3_path, "deep_narration")
                return {
                    "success": True,
                    "mode_used": "local_fallback",
                    "voice_name": f"{voice_name} (Local Fallback)",
                    "input_audio_url": f"/api/audio/{input_mp3_path.name}",
                    "output_audio_url": f"/api/audio/{output_mp3_path.name}",
                    "warning": f"ElevenLabs STS notice: {err_msg}. A high-quality local pitch/filter effect was applied as fallback."
                }
            raise HTTPException(status_code=500, detail=f"ElevenLabs Speech-to-Speech failed: {err_msg}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in transform_voice: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/clone-voice")
async def clone_voice(
    name: str = Form(...),
    description: Optional[str] = Form(""),
    audio: UploadFile = File(...)
):
    """
    Creates an Instant Voice Clone (IVC) in ElevenLabs using the user's recorded or uploaded audio sample.
    """
    client = get_elevenlabs_client()
    if not client:
        raise HTTPException(status_code=400, detail="ElevenLabs API key is required to clone voices.")

    sample_id = str(uuid.uuid4())[:8]
    ext = Path(audio.filename or "sample.webm").suffix or ".webm"
    raw_path = UPLOADS_DIR / f"clone_sample_{sample_id}{ext}"
    mp3_path = UPLOADS_DIR / f"clone_sample_{sample_id}.mp3"

    try:
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        if not convert_to_mp3(raw_path, mp3_path):
            raise HTTPException(status_code=400, detail="Failed to convert voice sample audio.")

        # Read audio bytes for ElevenLabs IVC
        with open(mp3_path, "rb") as f_sample:
            cloned_voice = client.voices.ivc.create(
                name=name.strip(),
                description=description.strip() or "Cloned via Voice Cloning Web App",
                files=[f_sample.read()]
            )

        return {
            "success": True,
            "voice_id": cloned_voice.voice_id,
            "name": name,
            "message": f"Successfully created cloned voice '{name}'! It is now available in your voice list."
        }
    except Exception as e:
        logger.error(f"Voice cloning error: {e}")
        raise HTTPException(status_code=500, detail=f"Voice cloning failed: {str(e)}")

@app.get("/api/audio/{filename}")
def get_audio(filename: str):
    """Serve recorded and generated audio files."""
    # Look in outputs first, then uploads
    out_file = OUTPUTS_DIR / filename
    if out_file.exists():
        return FileResponse(out_file, media_type="audio/mpeg", filename=filename)
    
    in_file = UPLOADS_DIR / filename
    if in_file.exists():
        return FileResponse(in_file, media_type="audio/mpeg", filename=filename)

    raise HTTPException(status_code=404, detail="Audio file not found")

# Serve built React frontend if dist exists
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    from fastapi.staticfiles import StaticFiles
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    def serve_frontend_catchall(full_path: str):
        target = FRONTEND_DIST / full_path
        if full_path and target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(FRONTEND_DIST / "index.html")

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=True)
