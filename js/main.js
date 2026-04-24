// Click camera → zoom camera into its photo-booth position, fade rest out
document.querySelector('.deco-camera')?.addEventListener('click', (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
  const cam = e.currentTarget;
  const rect = cam.getBoundingClientRect();

  // Cloned overlay of the camera (preserve aspect ratio)
  const aspect = rect.width / rect.height;
  const overlay = document.createElement('img');
  overlay.src = cam.currentSrc || cam.src;
  overlay.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    z-index: 9999;
    transition: left 0.75s cubic-bezier(0.76, 0, 0.24, 1),
                top 0.75s cubic-bezier(0.76, 0, 0.24, 1),
                width 0.75s cubic-bezier(0.76, 0, 0.24, 1),
                height 0.75s cubic-bezier(0.76, 0, 0.24, 1);
    pointer-events: none;
    filter: drop-shadow(0 10px 22px rgba(0,0,0,0.1));
  `;
  document.body.appendChild(overlay);

  // Fade the rest of the home page
  const main = document.querySelector('.layout');
  const nav = document.querySelector('.nav');
  [main, nav].forEach(el => {
    if (!el) return;
    el.style.transition = 'opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.opacity = '0';
  });

  // Target = where the camera sits on the photo booth page
  // Booth layout: padding 80/40 top/bot, gap 40px, viewfinder 440/48vh, filters 160px, camera 340px
  // Camera wrap height: min(640, 72vh); booth-camera-img at top of wrap, wrap is center-aligned vertically
  const targetW = 340;
  const boothGap = 40;
  const viewfinderW = Math.min(440, window.innerHeight * 0.48);
  const filterW = 160;
  const sceneW = viewfinderW + boothGap + filterW + boothGap + targetW;
  const targetLeft = (window.innerWidth - sceneW) / 2 + viewfinderW + boothGap + filterW + boothGap;
  const wrapHeight = Math.min(640, window.innerHeight * 0.72);
  const contentHeight = window.innerHeight - 80 - 40;
  const targetTop = 80 + Math.max(0, (contentHeight - wrapHeight) / 2);

  const targetH = targetW / aspect;

  void overlay.offsetWidth;
  overlay.style.left = targetLeft + 'px';
  overlay.style.top = targetTop + 'px';
  overlay.style.width = targetW + 'px';
  overlay.style.height = targetH + 'px';

  sessionStorage.setItem('fromCameraTransition', '1');
  setTimeout(() => { window.location.href = 'camera.html'; }, 700);
});

// Skip intro animation on project pages when arriving via zoom transition
if (sessionStorage.getItem('fromZoomTransition') === '1') {
  document.documentElement.classList.add('skip-intro');
  sessionStorage.removeItem('fromZoomTransition');
}

// Full screen overlay on project pages — image fills viewport width with a close X
document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
  const img = document.querySelector('.project-single-img');
  if (!img) return;

  const overlay = document.createElement('div');
  overlay.className = 'fullscreen-overlay';
  overlay.innerHTML = `
    <div class="fullscreen-scroll">
      <img src="${img.src}" alt="" class="fullscreen-img">
    </div>
    <button type="button" class="fullscreen-close" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <path d="M2 2L12 12M12 2L2 12"/>
      </svg>
    </button>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => overlay.classList.add('show'));

  const close = () => {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 300);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.querySelector('.fullscreen-close').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
});

// Inject floating close button on mobile project pages
if (document.querySelector('.project-detail-layout')) {
  const close = document.createElement('a');
  close.href = 'index.html';
  close.className = 'project-close-mobile';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '<svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 2L12 12M12 2L2 12"/></svg>';
  document.body.appendChild(close);
}
if (sessionStorage.getItem('fromCameraTransition') === '1') {
  document.documentElement.classList.add('skip-intro-camera');
  sessionStorage.removeItem('fromCameraTransition');
}

// More dropdown accordion
const moreBtn = document.getElementById('moreBtn');
const moreDrawer = document.getElementById('moreDrawer');

const leftPanel = document.getElementById('leftPanel');
const rightPanel = document.getElementById('rightPanel');
const bio = document.getElementById('bio');

moreBtn?.addEventListener('click', () => {
  const isOpen = moreDrawer.classList.toggle('open');
  moreBtn.classList.toggle('open', isOpen);
  moreBtn.querySelector('.more-label').textContent = isOpen ? 'Close' : 'More';
  bio?.classList.toggle('expanded', isOpen);
  leftPanel?.classList.toggle('expanded', isOpen);
  rightPanel?.classList.toggle('expanded', isOpen);
});

// Project hover → preview swap
const items = document.querySelectorAll('.project-item:not(.coming-soon)');
const cards = document.querySelectorAll('.project-card');
const previews = document.querySelectorAll('.preview');

items.forEach(item => {
  const card = item.querySelector('.project-card');

  item.addEventListener('mouseenter', () => {
    const key = item.dataset.project;
    cards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    previews.forEach(p => p.classList.remove('active'));
    const target = document.querySelector(`.preview[data-preview="${key}"]`);
    if (target) target.classList.add('active');
  });
});

// Mark page as loaded after entrance animations finish → enables hover effects
setTimeout(() => document.body.classList.add('loaded'), 1500);

// Word-by-word mask reveal on expanded bio
function splitIntoWords(el) {
  if (!el || el.dataset.split) return;
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words
    .map((w, i) => `<span class="word-wrap" style="--i:${i}"><span class="word">${w}</span></span>`)
    .join(' ');
  el.dataset.split = '1';
}

document.querySelectorAll('.tagline-extra, .expanded-contact .contact-label, .expanded-contact .contact-info span')
  .forEach(splitIntoWords);

// Thumbnail zoom transition on project click:
// - Only the thumbnail image scales to its project-page position
// - Everything else on home fades out
// - Project page fades in with the thumbnail already in place
document.querySelectorAll('.project-item:not(.coming-soon) a.project-card').forEach(card => {
  card.addEventListener('click', (e) => {
    const href = card.getAttribute('href');
    if (!href || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const activeImg = document.querySelector('.preview.active img');
    if (!activeImg || !activeImg.complete) return;
    e.preventDefault();

    const rect = activeImg.getBoundingClientRect();

    // Thumbnail zoom overlay (no bezel/frame, just the image)
    const overlay = document.createElement('div');
    overlay.className = 'zoom-overlay';
    overlay.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: url('${activeImg.currentSrc || activeImg.src}') center/cover no-repeat;
      z-index: 9999;
      transition: left 0.75s cubic-bezier(0.76, 0, 0.24, 1),
                  top 0.75s cubic-bezier(0.76, 0, 0.24, 1),
                  width 0.75s cubic-bezier(0.76, 0, 0.24, 1),
                  height 0.75s cubic-bezier(0.76, 0, 0.24, 1);
      pointer-events: none;
    `;
    document.body.appendChild(overlay);

    // Fade everything else on home page away
    const main = document.querySelector('.layout');
    const nav = document.querySelector('.nav');
    [main, nav].forEach(el => {
      if (!el) return;
      el.style.transition = 'opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.opacity = '0';
    });

    // Target = where the image sits on the project page (centered in content area,
    // with -80px translateX applied to the content block)
    const sidebarW = 560;
    const sidePad = 60;
    const maxImgW = 1000;
    const contentShift = -80;
    const contentW = window.innerWidth - sidebarW - sidePad * 2;
    const targetWidth = Math.min(contentW, maxImgW);
    const targetLeft = sidebarW + sidePad + (contentW - targetWidth) / 2 + contentShift;
    const targetHeight = targetWidth * (915 / 1608);
    const targetTop = window.innerHeight * 0.20;

    void overlay.offsetWidth;
    overlay.style.left = targetLeft + 'px';
    overlay.style.top = targetTop + 'px';
    overlay.style.width = targetWidth + 'px';
    overlay.style.height = targetHeight + 'px';

    sessionStorage.setItem('fromZoomTransition', '1');
    setTimeout(() => { window.location.href = href; }, 750);
  });
});
