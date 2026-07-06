let audioCtx = null;
let masterGain = null;
let activeNodes = [];

const SOUNDS = [
  { id: 'beep',      label: 'Beep',      icon: '🔔', color: '#60a5fa', key: '1', play: playBeep },
  { id: 'boop',      label: 'Boop',      icon: '🔊', color: '#a78bfa', key: '2', play: playBoop },
  { id: 'laser',     label: 'Laser',     icon: '🔫', color: '#f87171', key: '3', play: playLaser },
  { id: 'siren',     label: 'Siren',     icon: '🚨', color: '#fb923c', key: '4', play: playSiren },
  { id: 'explosion', label: 'Explosion', icon: '💥', color: '#facc15', key: '5', play: playExplosion },
  { id: 'ding',      label: 'Ding',      icon: '✨', color: '#4ade80', key: '6', play: playDing },
  { id: 'buzz',      label: 'Buzz',      icon: '🐝', color: '#e879f9', key: '7', play: playBuzz },
  { id: 'whoosh',    label: 'Whoosh',    icon: '💨', color: '#67e8f9', key: '8', play: playWhoosh },
  { id: 'pop',       label: 'Pop',       icon: '🫧', color: '#fb7185', key: '9', play: playPop },
  { id: 'chime',     label: 'Chime',     icon: '🎵', color: '#818cf8', key: '0', play: playChime },
  { id: 'alert',     label: 'Alert',     icon: '⚠️', color: '#ef4444', key: 'q', play: playAlert },
  { id: 'drum',      label: 'Drum',      icon: '🥁', color: '#f97316', key: 'w', play: playDrum },
  { id: 'wind',      label: 'Wind',      icon: '🌪️', color: '#94a3b8', key: 'e', play: playWind },
  { id: 'zap',       label: 'Zap',       icon: '⚡', color: '#fbbf24', key: 'r', play: playZap },
  { id: 'camera',    label: 'Camera',    icon: '📸', color: '#2dd4bf', key: 't', play: playCamera },
  { id: 'coin',      label: 'Coin',      icon: '🪙', color: '#fcd34d', key: 'y', play: playCoin },
];

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    updateVolume();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function updateVolume() {
  const val = document.getElementById('volumeSlider').value / 100;
  if (masterGain) masterGain.gain.value = val;
  document.getElementById('volValue').textContent = val * 100 + '%';
  document.getElementById('volIcon').textContent = val === 0 ? '🔇' : val < 0.5 ? '🔉' : '🔊';
}

function stopAll() {
  activeNodes.forEach(node => {
    try { node.stop?.(); } catch (e) {}
    try { node.disconnect?.(); } catch (e) {}
  });
  activeNodes = [];
  document.querySelectorAll('.pad').forEach(p => p.classList.remove('playing'));
  document.getElementById('statusText').textContent = 'All stopped';
}

function registerNode(node) {
  activeNodes.push(node);
  node.onended = () => {
    activeNodes = activeNodes.filter(n => n !== node);
  };
}

function playSound(id) {
  initAudio();
  const sound = SOUNDS.find(s => s.id === id);
  if (!sound) return;

  const pad = document.querySelector(`[data-id="${id}"]`);
  pad.classList.add('playing');
  setTimeout(() => pad.classList.remove('playing'), 500);

  document.getElementById('statusText').textContent = `Playing: ${sound.label} [${sound.key.toUpperCase()}]`;
  sound.play();
}

// ── Sound Generators ──

function playBeep() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
  registerNode(osc);
}

function playBoop() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.25);
  registerNode(osc);
}

function playLaser() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(1500, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
  registerNode(osc);
}

function playSiren() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.3);
  osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.6);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.6);
  registerNode(osc);
}

function playExplosion() {
  const bufferSize = audioCtx.sampleRate * 0.5;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  source.connect(gain).connect(masterGain);
  source.start();
  registerNode(source);
}

function playDing() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1200;
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.8);
  registerNode(osc);
}

function playBuzz() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 120;
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
  registerNode(osc);
}

function playWhoosh() {
  const bufferSize = audioCtx.sampleRate * 0.4;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * 0.5;
  }
  const source = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(500, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(3000, audioCtx.currentTime + 0.2);
  filter.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  source.connect(filter).connect(gain).connect(masterGain);
  source.start();
  registerNode(source);
}

function playPop() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
  registerNode(osc);
}

function playChime() {
  const freqs = [523, 659, 784];
  freqs.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + i * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 0.5);
    osc.connect(gain).connect(masterGain);
    osc.start(audioCtx.currentTime + i * 0.12);
    osc.stop(audioCtx.currentTime + i * 0.12 + 0.5);
    registerNode(osc);
  });
}

function playAlert() {
  [0, 0.15, 0.3].forEach(offset => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + offset + 0.1);
    osc.connect(gain).connect(masterGain);
    osc.start(audioCtx.currentTime + offset);
    osc.stop(audioCtx.currentTime + offset + 0.1);
    registerNode(osc);
  });
}

function playDrum() {
  const bufferSize = audioCtx.sampleRate * 0.15;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 8);
  }
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  source.connect(gain).connect(masterGain);
  source.start();
  registerNode(source);
}

function playWind() {
  const bufferSize = audioCtx.sampleRate * 1;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3 * Math.sin(Math.PI * i / bufferSize);
  }
  const source = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  source.connect(filter).connect(gain).connect(masterGain);
  source.start();
  registerNode(source);
}

function playZap() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(2000, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
  registerNode(osc);
}

function playCamera() {
  [0, 0.08].forEach(offset => {
    const bufferSize = audioCtx.sampleRate * 0.05;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
    }
    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime + offset);
    source.connect(gain).connect(masterGain);
    source.start(audioCtx.currentTime + offset);
    registerNode(source);
  });
}

function playCoin() {
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.value = 988;
  osc2.frequency.value = 1319;
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(masterGain);
  osc1.start();
  osc2.start();
  osc1.stop(audioCtx.currentTime + 0.4);
  osc2.stop(audioCtx.currentTime + 0.4);
  registerNode(osc1);
  registerNode(osc2);
}

// ── Init ──

function buildGrid() {
  const grid = document.getElementById('padGrid');
  grid.innerHTML = SOUNDS.map(s => `
    <div class="pad" data-id="${s.id}" style="--pad-color:${s.color};--pad-bg:${s.color}11" onclick="playSound('${s.id}')">
      <span class="pad-key">${s.key.toUpperCase()}</span>
      <span class="pad-icon">${s.icon}</span>
      <span class="pad-label">${s.label}</span>
    </div>
  `).join('');
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  const sound = SOUNDS.find(s => s.key === e.key.toLowerCase());
  if (sound) playSound(sound.id);
  if (e.key === ' ') { e.preventDefault(); stopAll(); }
});

document.getElementById('volumeSlider').addEventListener('input', updateVolume);
document.getElementById('volIcon').addEventListener('click', () => {
  const slider = document.getElementById('volumeSlider');
  slider.value = slider.value > 0 ? 0 : 70;
  updateVolume();
});

// ── Demo Beat Sequencer ──

let demoRunning = false;
let demoTimers = [];

const BEAT = 0.22;

// 4/4 time, ~110 BPM, 8-bar loop
// Structure: Kick=drum, Snare=pop, HiHat=pop(quiet), Bass=boop/buzz, Melody=beep/ding/chime/coin
const BEAT_PATTERN = [
  // ── Bar 1: Intro ──
  { t: 0,     s: 'drum' },
  { t: 0.5,   s: 'pop' },
  { t: 1,     s: 'drum' },
  { t: 1.5,   s: 'pop' },
  { t: 2,     s: 'drum' },
  { t: 2.5,   s: 'pop' },
  { t: 3,     s: 'drum' },
  { t: 3.5,   s: 'pop' },
  { t: 3.75,  s: 'ding' },

  // ── Bar 2: Groove kicks in ──
  { t: 4,     s: 'drum' },
  { t: 4,     s: 'boop' },
  { t: 4.25,  s: 'pop' },
  { t: 4.5,   s: 'drum' },
  { t: 4.75,  s: 'pop' },
  { t: 5,     s: 'drum' },
  { t: 5,     s: 'beep' },
  { t: 5.25,  s: 'pop' },
  { t: 5.5,   s: 'drum' },
  { t: 5.5,   s: 'boop' },
  { t: 5.75,  s: 'pop' },
  { t: 6,     s: 'drum' },
  { t: 6,     s: 'buzz' },
  { t: 6.25,  s: 'pop' },
  { t: 6.5,   s: 'drum' },
  { t: 6.75,  s: 'pop' },
  { t: 7,     s: 'drum' },
  { t: 7,     s: 'coin' },
  { t: 7.25,  s: 'pop' },
  { t: 7.5,   s: 'drum' },
  { t: 7.75,  s: 'pop' },

  // ── Bar 3: Melody ──
  { t: 8,     s: 'drum' },
  { t: 8,     s: 'beep' },
  { t: 8.25,  s: 'pop' },
  { t: 8.5,   s: 'drum' },
  { t: 8.75,  s: 'pop' },
  { t: 9,     s: 'drum' },
  { t: 9,     s: 'ding' },
  { t: 9.25,  s: 'pop' },
  { t: 9.5,   s: 'drum' },
  { t: 9.5,   s: 'boop' },
  { t: 9.75,  s: 'pop' },
  { t: 10,    s: 'drum' },
  { t: 10,    s: 'beep' },
  { t: 10.25, s: 'pop' },
  { t: 10.5,  s: 'drum' },
  { t: 10.75, s: 'pop' },
  { t: 11,    s: 'drum' },
  { t: 11,    s: 'coin' },
  { t: 11.25, s: 'pop' },
  { t: 11.5,  s: 'drum' },
  { t: 11.75, s: 'pop' },

  // ── Bar 4: Chorus ──
  { t: 12,    s: 'drum' },
  { t: 12,    s: 'chime' },
  { t: 12.25, s: 'pop' },
  { t: 12.5,  s: 'drum' },
  { t: 12.5,  s: 'boop' },
  { t: 12.75, s: 'pop' },
  { t: 13,    s: 'drum' },
  { t: 13,    s: 'beep' },
  { t: 13.25, s: 'pop' },
  { t: 13.5,  s: 'drum' },
  { t: 13.5,  s: 'ding' },
  { t: 13.75, s: 'pop' },
  { t: 14,    s: 'drum' },
  { t: 14,    s: 'coin' },
  { t: 14.25, s: 'pop' },
  { t: 14.5,  s: 'drum' },
  { t: 14.75, s: 'pop' },
  { t: 15,    s: 'drum' },
  { t: 15,    s: 'chime' },
  { t: 15.25, s: 'pop' },
  { t: 15.5,  s: 'drum' },
  { t: 15.75, s: 'pop' },
  { t: 15.75, s: 'wind' },

  // ── Bar 5: Verse 2 ──
  { t: 16,    s: 'drum' },
  { t: 16,    s: 'boop' },
  { t: 16.25, s: 'pop' },
  { t: 16.5,  s: 'drum' },
  { t: 16.75, s: 'pop' },
  { t: 17,    s: 'drum' },
  { t: 17,    s: 'beep' },
  { t: 17.25, s: 'pop' },
  { t: 17.5,  s: 'drum' },
  { t: 17.5,  s: 'buzz' },
  { t: 17.75, s: 'pop' },
  { t: 18,    s: 'drum' },
  { t: 18,    s: 'ding' },
  { t: 18.25, s: 'pop' },
  { t: 18.5,  s: 'drum' },
  { t: 18.75, s: 'pop' },
  { t: 19,    s: 'drum' },
  { t: 19,    s: 'coin' },
  { t: 19.25, s: 'pop' },
  { t: 19.5,  s: 'drum' },
  { t: 19.75, s: 'pop' },

  // ── Bar 6: Build ──
  { t: 20,    s: 'drum' },
  { t: 20,    s: 'beep' },
  { t: 20.25, s: 'pop' },
  { t: 20.5,  s: 'drum' },
  { t: 20.5,  s: 'boop' },
  { t: 20.75, s: 'pop' },
  { t: 21,    s: 'drum' },
  { t: 21,    s: 'ding' },
  { t: 21.25, s: 'pop' },
  { t: 21.5,  s: 'drum' },
  { t: 21.5,  s: 'beep' },
  { t: 21.75, s: 'pop' },
  { t: 22,    s: 'drum' },
  { t: 22,    s: 'coin' },
  { t: 22.25, s: 'pop' },
  { t: 22.5,  s: 'drum' },
  { t: 22.75, s: 'pop' },
  { t: 23,    s: 'drum' },
  { t: 23,    s: 'chime' },
  { t: 23.25, s: 'pop' },
  { t: 23.5,  s: 'drum' },
  { t: 23.75, s: 'pop' },

  // ── Bar 7: Drop ──
  { t: 24,    s: 'drum' },
  { t: 24,    s: 'explosion' },
  { t: 24.25, s: 'pop' },
  { t: 24.5,  s: 'drum' },
  { t: 24.5,  s: 'chime' },
  { t: 24.75, s: 'pop' },
  { t: 25,    s: 'drum' },
  { t: 25,    s: 'beep' },
  { t: 25.25, s: 'pop' },
  { t: 25.5,  s: 'drum' },
  { t: 25.5,  s: 'ding' },
  { t: 25.75, s: 'pop' },
  { t: 26,    s: 'drum' },
  { t: 26,    s: 'coin' },
  { t: 26.25, s: 'pop' },
  { t: 26.5,  s: 'drum' },
  { t: 26.5,  s: 'boop' },
  { t: 26.75, s: 'pop' },
  { t: 27,    s: 'drum' },
  { t: 27,    s: 'chime' },
  { t: 27.25, s: 'pop' },
  { t: 27.5,  s: 'drum' },
  { t: 27.75, s: 'pop' },

  // ── Bar 8: Outro ──
  { t: 28,    s: 'drum' },
  { t: 28,    s: 'beep' },
  { t: 28.25, s: 'pop' },
  { t: 28.5,  s: 'drum' },
  { t: 28.75, s: 'pop' },
  { t: 29,    s: 'drum' },
  { t: 29,    s: 'ding' },
  { t: 29.25, s: 'pop' },
  { t: 29.5,  s: 'drum' },
  { t: 29.75, s: 'pop' },
  { t: 30,    s: 'drum' },
  { t: 30,    s: 'coin' },
  { t: 30.5,  s: 'drum' },
  { t: 31,    s: 'chime' },
  { t: 31,    s: 'ding' },
  { t: 31.5,  s: 'wind' },
];

function toggleDemo() {
  if (demoRunning) {
    stopDemo();
  } else {
    startDemo();
  }
}

function startDemo() {
  initAudio();
  demoRunning = true;
  const btn = document.getElementById('demoBtn');
  btn.textContent = '⏹ Stop Demo';
  btn.classList.add('playing');
  document.getElementById('statusText').textContent = 'Demo playing...';

  const loopDuration = 32 * BEAT;

  function scheduleLoop() {
    if (!demoRunning) return;

    BEAT_PATTERN.forEach(note => {
      const timer = setTimeout(() => {
        if (!demoRunning) return;
        playSound(note.s);
      }, note.t * BEAT * 1000);
      demoTimers.push(timer);
    });

    const loopTimer = setTimeout(() => {
      if (demoRunning) scheduleLoop();
    }, loopDuration * 1000);
    demoTimers.push(loopTimer);
  }

  scheduleLoop();
}

function stopDemo() {
  demoRunning = false;
  demoTimers.forEach(clearTimeout);
  demoTimers = [];
  stopAll();
  const btn = document.getElementById('demoBtn');
  btn.textContent = '\u25B6 Demo';
  btn.classList.remove('playing');
  document.getElementById('statusText').textContent = 'Demo stopped';
}

buildGrid();
