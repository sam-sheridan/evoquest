"""Turn a looping music track exported from GarageBand (WAV) into the game's compressed file.

Usage:
    python3 tools/music.py path/to/track.wav audio/name.mp3
    python3 tools/music.py path/to/track.wav audio/name.mp3 --bars 16 --tail 3 [--bpm 88]

With no options the whole file is the loop. With --bars, the loop is that many bars at --bpm (88 unless given),
and the next --tail bars (every remaining bar if --tail isn't given) are the loop's dying-away tail: they are
mixed onto the loop's start, so the tail rings on into the next time round instead of being cut off. Anything
after the tail is left out.

The output is the loop followed by its first second again. MP3 decoders add a few milliseconds of silence at
the start, by different amounts in different browsers, so the game loops between 0.5 s and 0.5 s + the loop's
length (see musicStart() in js/audio.js): both points sit inside real music whatever the decoder did. Prints the
loop length to put in js/config.js.
"""
import argparse
import subprocess

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('out')
ap.add_argument('--bars', type=float)
ap.add_argument('--tail', type=float)
ap.add_argument('--bpm', type=float, default=88)
args = ap.parse_args()

SR = 44100
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', args.src, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                     capture_output=True, check=True).stdout
a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
if args.bars:
    bar = SR * 4 * 60 / args.bpm
    n = int(round(args.bars * bar))
    end = len(a) if args.tail is None else min(len(a), n + int(round(args.tail * bar)))
    loop, tail = a[:n].copy(), a[n:end]
    loop[: len(tail)] += tail[: len(loop)]
else:
    loop = a
peak = np.abs(loop).max()
if peak > 1:
    print(f'Note: mixing the tail in peaks at {peak:.2f}, so the loop is scaled down to fit')
    loop /= peak
out = np.concatenate([loop, loop[:SR]])
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                '-c:a', 'libmp3lame', '-b:a', '192k', args.out], input=out.astype(np.float32).tobytes(), check=True)
print(f'Wrote {args.out}; loop length {len(loop) / SR:.6f} s')
