const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const countdown = document.getElementById('countdown');
const smileHint = document.getElementById('smileHint');
const flash = document.getElementById('flash');
const snapBtn = document.getElementById('snapBtn');
const saveBtn = document.getElementById('saveBtn');
const retakeBtn = document.getElementById('retakeBtn');
const polaroidActions = document.getElementById('polaroidActions');
const cameraError = document.getElementById('cameraError');
const boothRoot = document.getElementById('boothRoot');
const filterPicker = document.getElementById('filterPicker');
const polaroidOut = document.getElementById('polaroidOut');
const polaroidPhoto = document.getElementById('polaroidPhoto');
const polaroidNote = document.getElementById('polaroidNote');

const COUNTDOWN = 3;

const NOTES = [
  "Thanks for stopping by ✌️",
  "Stay curious",
  "You've got great taste",
  "Smile more, design harder",
  "Made with ♥",
  "Today is a good day",
  "Keep it pixel-perfect",
  "Hi from Safarulla"
];

const FILTER_CSS = {
  none:      'none',
  bw:        'grayscale(1) contrast(1.05)',
  sepia:     'sepia(0.9) contrast(1.05)',
  faded:     'contrast(0.85) saturate(0.7) brightness(1.08)',
  vintage:   'sepia(0.35) saturate(0.8) contrast(1.1) hue-rotate(-10deg)',
  film:      'contrast(1.15) saturate(1.25) brightness(0.95)',
  '70s':     'sepia(0.25) saturate(1.4) contrast(1.1) hue-rotate(-15deg)',
  '90s':     'saturate(0.7) contrast(0.92) brightness(1.1) hue-rotate(-5deg)',
  polaroid:  'sepia(0.18) saturate(0.85) contrast(1.05) brightness(1.05)',
  dreamy:    'contrast(0.9) saturate(1.1) brightness(1.15) blur(0.4px)',
  cinematic: 'contrast(1.2) saturate(1.3) hue-rotate(-8deg) brightness(0.95)',
  digicam:   'contrast(0.92) saturate(0.8) brightness(1.05) blur(0.7px) hue-rotate(-3deg)'
};

let currentFilter = 'none';

function setFilter(name) {
  currentFilter = name;
  boothRoot.classList.forEach(c => {
    if (c.startsWith('filter-')) boothRoot.classList.remove(c);
  });
  boothRoot.classList.add('filter-' + name);
  filterPicker.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === name);
  });
}

filterPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  setFilter(btn.dataset.filter);
});

async function initCamera() {
  const retryBtn = document.getElementById('cameraRetry');
  const errText = document.getElementById('cameraErrorText');

  // Bind retry once (independent of whether init succeeds)
  if (retryBtn && !retryBtn.dataset.bound) {
    retryBtn.addEventListener('click', () => {
      // Optimistically hide the error and show the video while we re-attempt
      cameraError.hidden = true;
      video.hidden = false;
      initCamera();
    });
    retryBtn.dataset.bound = '1';
  }

  // Stop any existing stream before re-initializing
  if (video.srcObject) {
    try { video.srcObject.getTracks().forEach(t => t.stop()); } catch (_) {}
    video.srcObject = null;
  }

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('NotSupported');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play().catch(() => {});
    // Success — hide error and enable capture
    cameraError.hidden = true;
    video.hidden = false;
    snapBtn.disabled = false;
  } catch (err) {
    console.error('Camera error:', err);
    if (errText) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errText.textContent = 'Camera access blocked. Allow it in browser settings, then tap below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errText.textContent = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errText.textContent = 'Camera is in use by another app.';
      } else if (err.message === 'NotSupported') {
        errText.textContent = 'Browser does not support camera.';
      } else {
        errText.textContent = 'Could not access camera — tap to retry.';
      }
    }
    cameraError.hidden = false;
    video.hidden = true;
    snapBtn.disabled = true;
  }
}

// Watch for permission changes (Chrome, Edge, most modern browsers)
if (navigator.permissions?.query) {
  navigator.permissions.query({ name: 'camera' }).then(status => {
    // If already granted at page load, make sure no error lingers
    if (status.state === 'granted' && !cameraError.hidden) {
      cameraError.hidden = true;
    }
    status.onchange = () => {
      if (status.state === 'granted') {
        cameraError.hidden = true;
        video.hidden = false;
        if (!video.srcObject) initCamera();
      }
    };
  }).catch(() => {});
}

const waitMs = ms => new Promise(r => setTimeout(r, ms));

async function countdownTo(n) {
  for (let i = n; i > 0; i--) {
    countdown.classList.remove('pulse');
    countdown.textContent = i;
    void countdown.offsetWidth; // force animation restart
    countdown.classList.add('pulse');
    await waitMs(1000);
  }
  countdown.classList.remove('pulse');
  countdown.textContent = '';
}

function triggerFlash() {
  flash.classList.add('active');
  setTimeout(() => flash.classList.remove('active'), 250);
}

// Synthetic shutter sound — two short filtered noise bursts
let audioCtx;
function playShutter() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const makeClick = (when, freq = 1400, dur = 0.07, vol = 0.35) => {
      const bufferSize = Math.floor(audioCtx.sampleRate * dur);
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
      }
      const src = audioCtx.createBufferSource();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      src.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 4;
      gain.gain.value = vol;
      src.connect(filter).connect(gain).connect(audioCtx.destination);
      src.start(audioCtx.currentTime + when);
    };
    makeClick(0, 1600, 0.06, 0.4);
    makeClick(0.12, 900, 0.09, 0.32);
  } catch (_) {}
}

function captureToDataURL() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const size = Math.min(vw, vh);
  const sx = (vw - size) / 2;
  const sy = (vh - size) / 2;
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  ctx.save();
  // Apply the chosen filter to the captured image
  ctx.filter = FILTER_CSS[currentFilter] || 'none';
  // Mirror horizontally to match what the user sees
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
  ctx.restore();
  return canvas.toDataURL('image/jpeg', 0.92);
}

async function capture() {
  snapBtn.disabled = true;

  // Smile reminder stays visible for the whole countdown
  smileHint.classList.add('show');
  await countdownTo(COUNTDOWN);
  smileHint.classList.remove('show');

  triggerFlash();
  // Camera bulb flash
  const cameraFlash = document.getElementById('cameraFlash');
  cameraFlash.classList.remove('fire');
  void cameraFlash.offsetWidth;
  cameraFlash.classList.add('fire');
  playShutter();
  const data = captureToDataURL();

  polaroidPhoto.style.backgroundImage = `url('${data}')`;
  polaroidNote.textContent = ''; // start blank, user types their own

  // Reset any previous state
  polaroidOut.classList.remove('printed');

  // Camera shakes for the flash + print moment
  const cameraImg = document.querySelector('.booth-camera-img');
  cameraImg.classList.add('printing');
  setTimeout(() => cameraImg.classList.remove('printing'), 1000);

  // Polaroid fades/drops into view, then develops
  setTimeout(() => {
    polaroidOut.classList.add('printed');
    // Show actions once the polaroid has settled
    setTimeout(() => polaroidActions.classList.add('show'), 900);
  }, 250);

  snapBtn.hidden = true;
  incrementCount();
}

async function savePolaroid() {
  // Compose polaroid with photo + note on canvas
  const size = 600;
  const padding = 30;
  const noteH = 120;
  const width = size + padding * 2;
  const height = size + padding + noteH;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const img = await loadImage(polaroidPhoto.style.backgroundImage.slice(5, -2));
  ctx.drawImage(img, padding, padding, size, size);

  ctx.fillStyle = '#333';
  ctx.font = '500 32px Caveat, cursive';
  ctx.textAlign = 'center';
  ctx.fillText(polaroidNote.textContent, width / 2, size + padding + 60);

  const link = document.createElement('a');
  link.download = `safarulla-polaroid-${Date.now()}.jpg`;
  link.href = c.toDataURL('image/jpeg', 0.92);
  link.click();
}

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function retake() {
  polaroidOut.classList.remove('printing', 'printed');
  polaroidActions.classList.remove('show');
  polaroidPhoto.style.backgroundImage = '';
  polaroidNote.textContent = '';
  snapBtn.hidden = false;
  snapBtn.disabled = false;
}

snapBtn.addEventListener('click', capture);
saveBtn.addEventListener('click', savePolaroid);
retakeBtn.addEventListener('click', retake);

initCamera();

// Shared capture counter — free CORS-enabled counter
const COUNTER_NS = 'safarulla-portfolio';
const COUNTER_KEY = 'captures-v2';
const counterEl = document.getElementById('captureCounter');

function renderCount(n) {
  if (typeof n !== 'number' || isNaN(n)) n = 0;
  counterEl.innerHTML = `<span class="count-num">${n.toLocaleString()}</span> ${n === 1 ? 'polaroid' : 'polaroids'} printed`;
  counterEl.classList.add('loaded');
}

async function loadCount() {
  try {
    const res = await fetch(`https://abacus.jasoncameron.dev/get/${COUNTER_NS}/${COUNTER_KEY}`);
    const data = await res.json();
    if (data && typeof data.value === 'number') {
      renderCount(data.value);
    } else {
      // Key not yet created — show 0
      renderCount(0);
    }
  } catch (_) {
    renderCount(0);
  }
}

async function incrementCount() {
  try {
    const res = await fetch(`https://abacus.jasoncameron.dev/hit/${COUNTER_NS}/${COUNTER_KEY}`);
    const data = await res.json();
    if (data && typeof data.value === 'number') renderCount(data.value);
  } catch (_) { /* silent */ }
}

loadCount();
