import yt_dlp
import os
import uuid
import glob

# Use a temporary directory relative to the current file
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEMP_DIR = os.path.join(BACKEND_DIR, "tmp")
os.makedirs(TEMP_DIR, exist_ok=True)

# Resolve cookies path - use COOKIES_DIR env var (Docker) or fallback to backend dir (local dev)
COOKIES_DIR = os.environ.get("COOKIES_DIR", BACKEND_DIR)
COOKIES_PATH = os.path.join(COOKIES_DIR, "cookies.txt")

# Media type mapping for common video/audio extensions
MEDIA_TYPES = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.m4a': 'audio/mp4',
    '.opus': 'audio/opus',
    '.mp3': 'audio/mpeg',
}

def download_video(url: str, format_id: str, vcodec: str = 'none', acodec: str = 'none'):
    """
    Downloads the video to a temporary file and returns the path, title, and media type.
    Always ensures video+audio are merged into a playable file.
    """
    # Generating a unique ID for the filename
    file_id = str(uuid.uuid4())
    output_template = os.path.join(TEMP_DIR, f"{file_id}.%(ext)s")
    
    has_video = vcodec != 'none'
    has_audio = acodec != 'none'

    # Build format string — always ensure audio is included for video downloads
    if has_video:
        if has_audio:
            # Progressive format (already has both) — download directly,
            # but still add bestaudio as fallback in case the stream is broken
            format_str = f"{format_id}+bestaudio/best"
        else:
            # Video-only format — merge with best audio stream
            format_str = f"{format_id}+bestaudio/best"
    else:
        # Audio-only — download directly
        format_str = f"{format_id}/bestaudio/best"

    ydl_opts = {
        'format': format_str,
        'outtmpl': output_template,
        # Do NOT force merge_output_format — let ffmpeg pick the right container.
        # Forcing 'mp4' drops audio when video is VP9+Opus (can't fit in MP4 without transcode).
        'quiet': True,
        'no_warnings': True,
        'js_runtimes': {'node': {}},
    }
    
    if os.path.exists(COOKIES_PATH):
        ydl_opts['cookiefile'] = COOKIES_PATH
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            expected_filename = ydl.prepare_filename(info)
            
            # Search for the actual output file — could be mp4, webm, mkv, etc.
            base_name, _ = os.path.splitext(expected_filename)
            candidates = glob.glob(f"{base_name}.*")
            
            # Pick the largest file (the merged output) if multiple exist
            if candidates:
                actual_path = max(candidates, key=os.path.getsize)
            elif os.path.exists(expected_filename):
                actual_path = expected_filename
            else:
                raise Exception("Downloaded file not found.")
            
            _, ext = os.path.splitext(actual_path)
            media_type = MEDIA_TYPES.get(ext.lower(), 'video/mp4')
            title = info.get('title', 'video')
            
            return actual_path, title, media_type, ext.lower()
    except Exception as e:
        raise e
