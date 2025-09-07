// Simple POS sound utility. Uses Web Audio API to play short beeps.
// Honors settings stored in localStorage under 'pos_settings' (soundNotifications).

const getPosSettings = () => {
  try {
    const raw = localStorage.getItem('pos_settings');
    return raw ? JSON.parse(raw) : { soundNotifications: true };
  } catch {
    return { soundNotifications: true };
  }
};

// Play a short beep with configurable frequency and duration
const beep = (frequency = 880, durationMs = 180, type = 'sine', volume = 0.3) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(ctx.destination);
    // Smooth attack/decay to avoid clicks
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.01);
    osc.start(now);
    const end = now + Math.max(0.05, durationMs / 1000);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.stop(end);
  } catch {
    // ignore
  }
};

// Public API: playPosSound
// type: 'success' | 'error' | 'info' | 'warning' | 'neutral'
export const playPosSound = (type = 'info') => {
  const { soundNotifications } = getPosSettings();
  if (soundNotifications === false) return;
  switch (type) {
    case 'success':
      // pleasant higher tone
      beep(1046, 160, 'sine', 0.28);
      break;
    case 'error':
      // double low buzz
      beep(220, 120, 'square', 0.22);
      setTimeout(() => beep(196, 140, 'square', 0.22), 140);
      break;
    case 'warning':
      beep(784, 180, 'triangle', 0.25);
      break;
    case 'neutral':
    case 'info':
    default:
      beep(880, 140, 'sine', 0.24);
      break;
  }
};

export default playPosSound;
