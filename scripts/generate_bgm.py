import os
import wave
import struct
import numpy as np

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(ROOT_DIR, "public", "audio", "romantic-bgm.wav")

SAMPLE_RATE = 22050
LOOP_SECONDS = 28.0
TAIL_SECONDS = 3.5  # Reverb/decay wrap-around window for seamless looping
TOTAL_SECONDS = LOOP_SECONDS + TAIL_SECONDS

# Frequencies in Hz (F Major romantic ballad palette)
NOTE_FREQ = {
    "F2": 87.31,
    "G2": 98.00,
    "A2": 110.00,
    "Bb2": 116.54,
    "C3": 130.81,
    "D3": 146.83,
    "E3": 164.81,
    "F3": 174.61,
    "G3": 196.00,
    "A3": 220.00,
    "Bb3": 233.08,
    "C4": 261.63,
    "D4": 293.66,
    "E4": 329.63,
    "F4": 349.23,
    "G4": 392.00,
    "A4": 440.00,
    "Bb4": 466.16,
    "C5": 523.25,
    "D5": 587.33,
    "E5": 659.25,
    "F5": 698.46,
}


def synth_felt_piano_note(freq: float, dur: float, vel: float) -> np.ndarray:
    n = int(dur * SAMPLE_RATE)
    t = np.arange(n, dtype=np.float64) / SAMPLE_RATE

    # Felt piano envelope: soft mallet attack (14ms), warm natural sustain decay
    attack = np.minimum(1.0, t / 0.014)
    decay = np.exp(-t * (1.25 + freq / 720.0))
    env = attack * decay

    # Gentle harmonic series with rapid upper roll-off for intimate felt character
    # Slight chorused detuning (+0.15Hz / -0.15Hz) for warm acoustic body
    sig = (
        1.00 * np.sin(2.0 * np.pi * freq * t) * np.exp(-t * 0.25)
        + 0.34 * np.sin(2.0 * np.pi * freq * 2.0 * t + 0.1) * np.exp(-t * 1.1)
        + 0.11 * np.sin(2.0 * np.pi * freq * 3.0 * t + 0.2) * np.exp(-t * 2.4)
        + 0.04 * np.sin(2.0 * np.pi * freq * 4.0 * t) * np.exp(-t * 4.0)
        + 0.18 * np.sin(2.0 * np.pi * (freq * 1.0012) * t) * np.exp(-t * 0.6)
    )
    # Soft hammer felt thump at onset
    thump = 0.045 * np.sin(2.0 * np.pi * (freq * 0.5) * t) * np.exp(-t * 36.0)
    return (sig * env + thump) * vel


def synth_warm_pad(freqs: list[float], dur: float, vel: float) -> np.ndarray:
    n = int(dur * SAMPLE_RATE)
    t = np.arange(n, dtype=np.float64) / SAMPLE_RATE
    fade_in = np.minimum(1.0, t / 0.9)
    fade_out = np.minimum(1.0, (dur - t) / 1.1)
    env = fade_in * fade_out

    acc = np.zeros(n, dtype=np.float64)
    for f in freqs:
        acc += 0.65 * np.sin(2.0 * np.pi * f * t)
        acc += 0.22 * np.sin(2.0 * np.pi * (f * 1.002) * t + 0.4)
        acc += 0.12 * np.sin(2.0 * np.pi * (f * 2.0) * t)
    return (acc / max(1, len(freqs))) * env * vel


def apply_studio_reverb(buf: np.ndarray) -> np.ndarray:
    taps = [
        (0.037, 0.26),
        (0.061, 0.21),
        (0.089, 0.17),
        (0.131, 0.14),
        (0.179, 0.10),
        (0.241, 0.075),
        (0.313, 0.055),
        (0.419, 0.035),
    ]
    wet = buf.copy()
    n = len(buf)
    for delay_sec, gain in taps:
        d = int(delay_sec * SAMPLE_RATE)
        if d < n:
            wet[d:] += buf[:-d] * gain
    # Gentle low-pass smoothing on wet tail for warm velvet acoustics
    kernel = np.array([0.2, 0.6, 0.2], dtype=np.float64)
    wet_lp = np.convolve(wet, kernel, mode="same")
    return 0.72 * buf + 0.28 * wet_lp


def main() -> None:
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    n_total = int(TOTAL_SECONDS * SAMPLE_RATE)
    n_loop = int(LOOP_SECONDS * SAMPLE_RATE)
    mix = np.zeros(n_total, dtype=np.float64)

    # 8 bars x 3.5s = 28.0s exact (~68.57 BPM, 0.875s per beat)
    beat = 0.875
    bar = beat * 4.0  # 3.5s

    # Progression: Fmaj7 -> Dm9 -> Bbmaj7 -> C6/9 -> Am7 -> Dm9 -> Gm7 -> C9sus4
    bars = [
        # (pad_chord, arpeggio_notes, melody_events[(beat_offset, note, dur, vel)])
        (
            ["F2", "C3", "A3", "E4"],
            ["F2", "C3", "A3", "E4", "C4", "A3"],
            [(0.0, "A4", 2.4, 0.52), (2.5, "C5", 1.8, 0.48), (3.25, "E5", 1.5, 0.45)],
        ),
        (
            ["D3", "A3", "E4", "F4"],
            ["D3", "A3", "E4", "F4", "C4", "A3"],
            [(0.0, "D5", 2.2, 0.50), (2.0, "C5", 1.6, 0.46), (3.0, "A4", 1.8, 0.44)],
        ),
        (
            ["Bb2", "F3", "A3", "D4"],
            ["Bb2", "F3", "A3", "D4", "C4", "F3"],
            [(0.0, "F4", 2.3, 0.48), (1.75, "G4", 1.5, 0.46), (2.75, "A4", 2.0, 0.50)],
        ),
        (
            ["C3", "G3", "A3", "D4"],
            ["C3", "G3", "D4", "E4", "A3", "G3"],
            [(0.0, "G4", 2.4, 0.48), (2.5, "E4", 1.8, 0.44)],
        ),
        (
            ["A2", "E3", "G3", "C4"],
            ["A2", "E3", "C4", "E4", "G4", "C4"],
            [(0.0, "C5", 2.2, 0.52), (2.0, "E5", 1.8, 0.48), (3.25, "D5", 1.4, 0.45)],
        ),
        (
            ["D3", "A3", "E4", "F4"],
            ["D3", "A3", "F4", "E4", "C4", "A3"],
            [(0.0, "A4", 2.4, 0.49), (2.25, "F4", 1.8, 0.45)],
        ),
        (
            ["G2", "D3", "F3", "Bb3"],
            ["G2", "D3", "Bb3", "D4", "F4", "D4"],
            [(0.0, "Bb4", 2.2, 0.50), (2.0, "A4", 1.6, 0.46), (3.0, "G4", 1.8, 0.44)],
        ),
        (
            ["C3", "G3", "Bb3", "D4"],
            ["C3", "G3", "D4", "G4", "F4", "E4"],
            [(0.0, "G4", 2.3, 0.46), (2.5, "E4", 2.2, 0.42)],
        ),
    ]

    def place(start_sec: float, audio: np.ndarray) -> None:
        idx = int(start_sec * SAMPLE_RATE)
        end = min(n_total, idx + len(audio))
        if end > idx:
            mix[idx:end] += audio[: end - idx]

    for b_idx, (pad_notes, arp_notes, melody) in enumerate(bars):
        t0 = b_idx * bar
        # Warm soft cello/pad undercurrent
        pad_freqs = [NOTE_FREQ[n] for n in pad_notes]
        place(t0, synth_warm_pad(pad_freqs, bar + 0.6, 0.18))

        # Flowing felt-piano arpeggio
        arp_step = bar / len(arp_notes)
        for a_idx, note_name in enumerate(arp_notes):
            # Subtle expressive rubato & velocity breath
            vel = 0.30 if a_idx == 0 else (0.22 + 0.03 * np.sin(a_idx))
            place(
                t0 + a_idx * arp_step,
                synth_felt_piano_note(NOTE_FREQ[note_name], 2.9, vel),
            )

        # Expressive right-hand melody
        for m_beat, note_name, m_dur, m_vel in melody:
            place(
                t0 + m_beat * beat,
                synth_felt_piano_note(NOTE_FREQ[note_name], m_dur, m_vel),
            )

    reverbed = apply_studio_reverb(mix)

    # Overlap-add tail past LOOP_SECONDS back into start for seamless loop
    loop_buf = reverbed[:n_loop].copy()
    tail_len = min(n_total - n_loop, n_loop)
    if tail_len > 0:
        loop_buf[:tail_len] += reverbed[n_loop : n_loop + tail_len]

    # Gentle boundary crossfade (30ms) so sample 0 and sample -1 match seamlessly
    xfade = int(0.03 * SAMPLE_RATE)
    w = np.linspace(0.0, 1.0, xfade)
    loop_buf[:xfade] = loop_buf[:xfade] * w + loop_buf[-xfade:] * (1.0 - w)

    # Normalize cleanly to -5 dBFS peak (~0.56)
    peak = np.max(np.abs(loop_buf))
    if peak > 0:
        loop_buf = loop_buf * (0.56 / peak)

    pcm = np.clip(loop_buf * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(OUT_PATH, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())

    print(
        f"Generated seamless {LOOP_SECONDS}s romantic felt-piano WAV at {OUT_PATH} "
        f"({os.path.getsize(OUT_PATH) / 1024:.1f} KB)"
    )


if __name__ == "__main__":
    main()
