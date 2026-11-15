"""
Audio & Video Transcriber Engine for MultiMedia Studio
Supports:
1. Local Audio & Video files (MP4, MKV, MOV, MP3, WAV, M4A, FLAC, WEBM) via Whisper AI.
2. YouTube Video Links (fast subtitle extraction or fallback AI speech-to-text).
3. Export to TXT, SRT (Subtitles), VTT, and JSON.
"""

import sys
import os
import re
import json
import argparse
import tempfile
import urllib.request
import shutil

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def format_timestamp_srt(seconds: float) -> str:
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    msecs = int((seconds - int(seconds)) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{msecs:03d}"

def format_timestamp_vtt(seconds: float) -> str:
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    msecs = int((seconds - int(seconds)) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{msecs:03d}"

def format_timestamp_display(seconds: float) -> str:
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"

def parse_subtitle_content(content: str):
    segments = []
    clean_text = content.strip()
    
    # 1. YouTube JSON3 format
    if clean_text.startswith('{'):
        try:
            data = json.loads(clean_text)
            events = data.get('events', [])
            for ev in events:
                start = ev.get('tStartMs', 0) / 1000.0
                dur = ev.get('dDurationMs', 0) / 1000.0
                end = start + dur
                segs = ev.get('segs', [])
                text = ''.join(s.get('utf8', '') for s in segs).strip()
                if text and text != '\n':
                    # Clean multiple newlines
                    text = ' '.join(text.split())
                    segments.append({
                        "start": round(start, 2),
                        "end": round(end, 2),
                        "text": text
                    })
            if segments:
                return segments
        except Exception:
            pass

    # 2. VTT or SRT timestamp patterns
    time_pattern = re.compile(r'(\d{2}:\d{2}:\d{2}[\.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[\.,]\d{3})')
    
    def parse_time(ts):
        parts = ts.replace(',', '.').split(':')
        if len(parts) == 3:
            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
        return 0.0

    lines = clean_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        match = time_pattern.search(line)
        if match:
            start_sec = parse_time(match.group(1))
            end_sec = parse_time(match.group(2))
            i += 1
            text_lines = []
            while i < len(lines) and lines[i].strip() and not time_pattern.search(lines[i]):
                clean = re.sub(r'<[^>]+>', '', lines[i].strip())
                if clean:
                    text_lines.append(clean)
                i += 1
            text = ' '.join(text_lines).strip()
            if text:
                segments.append({
                    "start": round(start_sec, 2),
                    "end": round(end_sec, 2),
                    "text": text
                })
        else:
            i += 1
    return segments

def transcribe_youtube_subtitles(url: str, lang_pref: str):
    import yt_dlp
    
    print("PROGRESS:15:Mencari subtitle/keterangan resmi YouTube...", flush=True)
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'quiet': True,
        'no_warnings': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        title = info.get('title', 'YouTube Video')
        duration = info.get('duration', 0)
        
        subs = info.get('subtitles') or {}
        auto_subs = info.get('automatic_captions') or {}
        
        # Determine language priority
        chosen_sub_url = None
        chosen_lang = "id"
        
        candidates = ['id', 'id-orig', 'en', 'en-orig'] if lang_pref == 'auto' else [lang_pref]
        
        # 1. Check manual official subtitles first
        for lang in candidates:
            if lang in subs:
                for fmt in subs[lang]:
                    if fmt.get('ext') in ['vtt', 'srv1', 'json3']:
                        chosen_sub_url = fmt.get('url')
                        chosen_lang = lang
                        break
            if chosen_sub_url:
                break
                
        # 2. Check automatic captions
        if not chosen_sub_url:
            for lang in candidates:
                if lang in auto_subs:
                    for fmt in auto_subs[lang]:
                        if fmt.get('ext') in ['vtt', 'srv1', 'json3']:
                            chosen_sub_url = fmt.get('url')
                            chosen_lang = lang
                            break
                if chosen_sub_url:
                    break
                    
        # 3. Any available first subtitle
        if not chosen_sub_url and subs:
            first_lang = next(iter(subs.keys()))
            chosen_sub_url = subs[first_lang][0].get('url')
            chosen_lang = first_lang
        elif not chosen_sub_url and auto_subs:
            first_lang = next(iter(auto_subs.keys()))
            chosen_sub_url = auto_subs[first_lang][0].get('url')
            chosen_lang = first_lang
            
        if chosen_sub_url:
            print(f"PROGRESS:40:Mengunduh teks keterangan ({chosen_lang})...", flush=True)
            req = urllib.request.Request(chosen_sub_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                content = response.read().decode('utf-8', errors='ignore')
                segments = parse_subtitle_content(content)
                if segments:
                    return {
                        "title": title,
                        "duration": duration,
                        "language": chosen_lang,
                        "segments": segments,
                        "source": "youtube_captions"
                    }
    return None

def download_youtube_audio(url: str, temp_dir: str):
    import yt_dlp
    print("PROGRESS:25:Mengunduh audio video YouTube...", flush=True)
    out_template = os.path.join(temp_dir, 'yt_audio.%(ext)s')
    ffmpeg_bin = shutil.which('ffmpeg')
    ydl_opts = {
        'format': 'ba/b',
        'outtmpl': out_template,
        'quiet': True,
        'no_warnings': True,
    }
    if ffmpeg_bin:
        ydl_opts['ffmpeg_location'] = os.path.dirname(ffmpeg_bin)

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get('title', 'YouTube Video')
        duration = info.get('duration', 0)
        
        # Locate downloaded audio file
        downloaded_files = [
            os.path.join(temp_dir, f) for f in os.listdir(temp_dir)
            if os.path.isfile(os.path.join(temp_dir, f)) and not f.endswith('.part')
        ]
        if not downloaded_files:
            raise RuntimeError("Gagal mengunduh file audio dari YouTube.")
            
        audio_file = downloaded_files[0]
        return audio_file, title, duration

def run_whisper_transcription(audio_path: str, model_size: str = 'base', language: str = 'auto'):
    from faster_whisper import WhisperModel
    print(f"PROGRESS:35:Memuat model AI Whisper ({model_size})...", flush=True)
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    
    print("PROGRESS:50:Mentranskripsikan audio menjadi teks dengan AI...", flush=True)
    lang_param = None if language == 'auto' or not language else language
    segments_gen, info = model.transcribe(
        audio_path,
        language=lang_param,
        beam_size=5,
        vad_filter=False, # Process all speech including songs, sermons & quiet speech
    )
    
    detected_lang = info.language
    duration = info.duration or 0.0
    
    segments = []
    print("PROGRESS:65:Menyusun kalimat dan cap waktu...", flush=True)
    for seg in segments_gen:
        text = seg.text.strip()
        if text:
            segments.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": text
            })
            # Real-time progress output
            if duration > 0:
                pct = min(95.0, 50.0 + (seg.end / duration) * 45.0)
                print(f"PROGRESS:{pct:.1f}:Mentranskripsikan [{format_timestamp_display(seg.end)} / {format_timestamp_display(duration)}]...", flush=True)
                
    return {
        "language": detected_lang,
        "duration": duration,
        "segments": segments,
        "source": f"whisper_{model_size}"
    }

def save_exports(result: dict, output_dir: str, base_filename: str):
    os.makedirs(output_dir, exist_ok=True)
    clean_stem = re.sub(r'[\\/*?:"<>|]', '_', base_filename).strip()
    
    segments = result.get('segments', [])
    full_text = '\n\n'.join(s['text'] for s in segments)
    result['full_text'] = full_text
    
    # 1. Plain Text (.txt)
    txt_path = os.path.join(output_dir, f"{clean_stem}.txt")
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(f"# Transkrip: {result.get('title', clean_stem)}\n")
        f.write(f"# Bahasa: {result.get('language', 'auto').upper()} | Durasi: {format_timestamp_display(result.get('duration', 0))}\n\n")
        f.write(full_text)
        
    # 2. Subtitle (.srt)
    srt_path = os.path.join(output_dir, f"{clean_stem}.srt")
    with open(srt_path, 'w', encoding='utf-8') as f:
        for idx, seg in enumerate(segments, 1):
            f.write(f"{idx}\n")
            f.write(f"{format_timestamp_srt(seg['start'])} --> {format_timestamp_srt(seg['end'])}\n")
            f.write(f"{seg['text']}\n\n")
            
    # 3. WebVTT (.vtt)
    vtt_path = os.path.join(output_dir, f"{clean_stem}.vtt")
    with open(vtt_path, 'w', encoding='utf-8') as f:
        f.write("WEBVTT\n\n")
        for seg in segments:
            f.write(f"{format_timestamp_vtt(seg['start'])} --> {format_timestamp_vtt(seg['end'])}\n")
            f.write(f"{seg['text']}\n\n")
            
    # 4. JSON (.json)
    json_path = os.path.join(output_dir, f"{clean_stem}.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    return {
        "txt": txt_path,
        "srt": srt_path,
        "vtt": vtt_path,
        "json": json_path
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input video/audio file path or YouTube URL")
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small"], help="Whisper model size")
    parser.add_argument("--language", default="auto", help="Language code ('auto', 'id', 'en', etc.)")
    parser.add_argument("--output-dir", required=False, default=None, help="Output directory to save transcript files")
    parser.add_argument("--task-id", default="", help="Task ID from client")
    parser.add_argument("--force-ai", action="store_true", help="Force Whisper AI transcription even if YouTube subtitles exist")
    
    args = parser.parse_args()
    
    input_str = args.input.strip()
    is_youtube = input_str.startswith("http://") or input_str.startswith("https://") or "youtube.com" in input_str or "youtu.be" in input_str
    
    result = None
    title = os.path.splitext(os.path.basename(input_str))[0]
    
    try:
        if is_youtube:
            # 1. Try YouTube Subtitles first (unless --force-ai is set)
            if not args.force_ai:
                try:
                    result = transcribe_youtube_subtitles(input_str, args.language)
                except Exception as e:
                    print(f"Warning subtitle fetch: {e}", file=sys.stderr)
                    
            # 2. If subtitles not found or force-ai, download audio and run Whisper
            if not result:
                with tempfile.TemporaryDirectory() as temp_dir:
                    audio_file, yt_title, yt_duration = download_youtube_audio(input_str, temp_dir)
                    title = yt_title
                    whisper_res = run_whisper_transcription(audio_file, args.model, args.language)
                    result = {
                        "title": yt_title,
                        "duration": yt_duration or whisper_res.get('duration', 0),
                        "language": whisper_res.get('language', args.language),
                        "segments": whisper_res.get('segments', []),
                        "source": whisper_res.get('source')
                    }
        else:
            # Local video or audio file
            if not os.path.exists(input_str):
                print(f"ERROR: File '{input_str}' tidak ditemukan.", file=sys.stderr)
                sys.exit(1)
                
            whisper_res = run_whisper_transcription(input_str, args.model, args.language)
            result = {
                "title": title,
                "duration": whisper_res.get('duration', 0),
                "language": whisper_res.get('language', args.language),
                "segments": whisper_res.get('segments', []),
                "source": whisper_res.get('source')
            }
            
        if not result or not result.get('segments'):
            print("ERROR: Tidak ada ucapan atau kata yang terdeteksi dalam video ini.", file=sys.stderr)
            sys.exit(1)
            
        result['task_id'] = args.task_id
        result['full_text'] = '\n\n'.join(s['text'] for s in result['segments'])
        
        # Only save files if an output-dir is explicitly specified
        if args.output_dir and args.output_dir.strip():
            print("PROGRESS:96:Menyimpan dokumen transkrip...", flush=True)
            files = save_exports(result, args.output_dir.strip(), result.get('title') or title)
            result['exported_files'] = files
        else:
            result['exported_files'] = None
        
        print("PROGRESS:100:Transkripsi Selesai!", flush=True)
        print(f"JSON_RESULT:{json.dumps(result, ensure_ascii=False)}", flush=True)
        
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
