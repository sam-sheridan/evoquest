"""Turn a looping music track exported from GarageBand (WAV) into the game's compressed file.

Usage:
    python3 tools/music.py path/to/track.wav audio/name.mp3

The output is the whole loop followed by its first second again. MP3 decoders add a few milliseconds of
silence at the start, by different amounts in different browsers, so the game loops between 0.5 s and
0.5 s + the loop's length (see music() in js/audio.js): both points sit inside real music whatever the
decoder did. Prints the loop length to put in js/config.js.
"""
import subprocess
import sys

src, out = sys.argv[1], sys.argv[2]
info = subprocess.run(
    ['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=duration_ts,sample_rate',
     '-of', 'default=nw=1', src], capture_output=True, text=True, check=True).stdout
vals = dict(line.split('=') for line in info.split())
loop = int(vals['duration_ts']) / int(vals['sample_rate'])
subprocess.run(
    ['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter_complex',
     '[0:a]asplit[a][b];[b]atrim=end=1,asetpts=PTS-STARTPTS[c];[a][c]concat=n=2:v=0:a=1',
     '-c:a', 'libmp3lame', '-b:a', '192k', out], check=True)
print(f'Wrote {out}; loop length {loop:.6f} s')
