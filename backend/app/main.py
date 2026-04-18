from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp
import os

app = FastAPI(title="Youtube Downloader API")

# Resolve cookies path - use COOKIES_DIR env var (Docker) or fallback to backend dir (local dev)
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COOKIES_DIR = os.environ.get("COOKIES_DIR", BACKEND_DIR)
COOKIES_PATH = os.path.join(COOKIES_DIR, "cookies.txt")

# Setup CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class URLRequest(BaseModel):
    url: str

@app.get("/")
def read_root():
    return {"status": "ok"}

@app.post("/metadata")
def get_metadata(request: URLRequest):
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'format': 'best',
        'js_runtimes': {'node': {}},
    }
    
    if os.path.exists(COOKIES_PATH):
        ydl_opts['cookiefile'] = COOKIES_PATH
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # We use extract_info with download=False just to get metadata
            info = ydl.extract_info(request.url, download=False)
            
            # Extract relevant formats — filter out storyboards and unusable formats
            formats = []
            for f in info.get('formats', []):
                # Skip storyboards (image-only thumbnails)
                if f.get('vcodec') == 'none' and f.get('acodec') == 'none':
                    continue
                # Skip formats with no extension info
                if not f.get('ext'):
                    continue
                # Skip very low quality video-only formats (storyboards in disguise)
                resolution = f.get('resolution', '')
                if f.get('vcodec') != 'none' and resolution in ('48x27', '80x45', '160x90', '320x180'):
                    continue
                formats.append({
                    'format_id': f.get('format_id'),
                    'ext': f.get('ext'),
                    'resolution': f.get('resolution', 'audio-only'),
                    'filesize': f.get('filesize'),
                    'filesize_approx': f.get('filesize_approx'),
                    'vcodec': f.get('vcodec'),
                    'acodec': f.get('acodec'),
                    'format_note': f.get('format_note'),
                    'tbr': f.get('tbr'),
                })
            
            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "duration": info.get('duration'),
                "formats": formats
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class DownloadRequest(BaseModel):
    url: str
    format_id: str
    vcodec: str = 'none'
    acodec: str = 'none'

from fastapi.responses import FileResponse
from fastapi import BackgroundTasks
from app.services.downloader import download_video

def remove_file(path: str):
    try:
        os.remove(path)
    except Exception:
        pass

@app.post("/cookies")
async def upload_cookies(file: UploadFile = File(...)):
    """
    Upload a cookies.txt file exported from your browser.
    Use a browser extension like 'Get cookies.txt LOCALLY' to export
    YouTube cookies in Netscape format.
    """
    if not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Please upload a .txt file")
    
    try:
        contents = await file.read()
        with open(COOKIES_PATH, "wb") as f:
            f.write(contents)
        return {"message": "Cookies uploaded successfully. YouTube downloads should now work."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save cookies: {str(e)}")

@app.delete("/cookies")
async def delete_cookies():
    """Remove the uploaded cookies file."""
    if os.path.exists(COOKIES_PATH):
        os.remove(COOKIES_PATH)
        return {"message": "Cookies removed successfully."}
    return {"message": "No cookies file found."}

@app.get("/cookies/status")
async def cookies_status():
    """Check if a cookies file exists."""
    return {"cookies_loaded": os.path.exists(COOKIES_PATH)}

@app.post("/download")
def start_download(request: DownloadRequest, background_tasks: BackgroundTasks):
    try:
        file_path, title, media_type, ext = download_video(request.url, request.format_id, request.vcodec, request.acodec)
        
        # Clean up the file after streaming it to the user
        background_tasks.add_task(remove_file, file_path)
        
        return FileResponse(
            path=file_path, 
            filename=f"{title}{ext}", 
            media_type=media_type
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

