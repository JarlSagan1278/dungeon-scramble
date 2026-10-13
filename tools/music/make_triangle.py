# NES-style triangle sample for GarageBand's Sampler (Oct 13, Jeremy couldn't find a "video game bass" sound).
# The NES triangle channel steps through 32 levels per cycle (4-bit: 15..0..15), which is what gives it its
# soft-but-buzzy hollow tone. Writes 44.1 kHz 16-bit mono WAVs at C3 (130.81 Hz) and C2, 4 s each.
import math, os, struct, wave
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'music', 'samples')
SR = 44100
LEVELS = list(range(15, -1, -1)) + list(range(0, 16))  # 32 steps: 15 -> 0 -> 15
def write(name, freq, secs=4.0, gain=0.8):
    n = int(SR * secs); data = bytearray()
    for i in range(n):
        phase = (i * freq / SR) % 1.0
        v = (LEVELS[int(phase * 32)] / 7.5) - 1.0            # -1..1, stepped
        env = min(1.0, i / (0.004 * SR)) * min(1.0, (n - i) / (0.03 * SR))  # 4 ms in, 30 ms out (no clicks)
        data += struct.pack('<h', int(max(-1, min(1, v * gain * env)) * 32767))
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(data))
os.makedirs(OUT, exist_ok=True)
write('nes_triangle_C3.wav', 130.8128)
write('nes_triangle_C2.wav', 65.4064)
# The preview page's bass ("NES-style triangle" in docs/music/preview.html) is a plain Web Audio triangle oscillator:
# smooth, no 4-bit stepping. Same sound here, band-limited (odd harmonics 1/n^2 up to 18 kHz) so it doesn't alias.
def write_smooth(name, freq, secs=4.0, gain=0.42/0.42*0.8):
    n = int(SR * secs); data = bytearray(); H = [k for k in range(1, 400, 2) if k*freq < 18000]
    norm = 8/math.pi**2
    for i in range(n):
        t = i / SR
        v = norm * sum(((-1)**((k-1)//2)) * math.sin(2*math.pi*k*freq*t) / (k*k) for k in H)
        env = min(1.0, i / (0.004 * SR)) * min(1.0, (n - i) / (0.02 * SR))
        data += struct.pack('<h', int(max(-1, min(1, v * gain * env)) * 32767))
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(data))
write_smooth('preview_triangle_C3.wav', 130.8128)
write_smooth('preview_triangle_C2.wav', 65.4064)
print('ok')
