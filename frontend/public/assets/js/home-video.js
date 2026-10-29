(() => {
  'use strict';
  const section = document.querySelector('[data-home-video]');
  if (!section) return;
  const video = section.querySelector('video');
  const button = section.querySelector('[data-video-toggle]');
  const label = button.querySelector('span');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 960px)');
  let wantsPlayback = !reduced.matches && !navigator.connection?.saveData;
  let inView = true;
  let ready = document.readyState === 'complete';
  let failed = false;
  video.muted = true;
  video.defaultMuted = true;
  button.hidden = false;
  const updateButton = () => {
    const text = video.paused ? 'Reproducir video' : 'Pausar video';
    label.textContent = text;
    button.dataset.playing = String(!video.paused);
    button.setAttribute('aria-label', text);
  };
  const ensureSource = () => {
    if (video.getAttribute('src')) return;
    const size = mobile.matches ? 'mobile' : 'desktop';
    video.poster = video.dataset[size + 'Poster'];
    video.src = video.dataset[size + 'Src'];
    video.load();
  };
  async function syncPlayback() {
    if (!ready || !inView || document.hidden || !wantsPlayback || failed) {
      video.pause();
      return;
    }
    ensureSource();
    try {
      await video.play();
      if (!inView || document.hidden || !wantsPlayback) video.pause();
    } catch (error) {
      if (error.name === 'NotAllowedError') wantsPlayback = false;
      updateButton();
    }
  }
  video.addEventListener('playing', () => { section.classList.add('has-video-frame'); updateButton(); });
  video.addEventListener('pause', updateButton);
  video.addEventListener('error', () => {
    if (!video.error) return;
    failed = true;
    video.pause();
    section.classList.remove('has-video-frame');
    button.hidden = true;
  });
  button.addEventListener('click', () => {
    if (!video.paused) {
      wantsPlayback = false;
      video.pause();
    } else {
      wantsPlayback = true;
      ready = true;
      void syncPlayback();
    }
  });
  document.addEventListener('visibilitychange', () => { void syncPlayback(); });
  reduced.addEventListener('change', () => {
    if (reduced.matches) wantsPlayback = false;
    void syncPlayback();
  });
  mobile.addEventListener('change', () => {
    if (!video.getAttribute('src')) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
    failed = false;
    button.hidden = false;
    section.classList.remove('has-video-frame');
    updateButton();
    void syncPlayback();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      void syncPlayback();
    }, { threshold: 0.1 });
    observer.observe(section);
  }
  const start = () => {
    ready = true;
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => { void syncPlayback(); }, { timeout: 1000 });
    else window.setTimeout(() => { void syncPlayback(); }, 0);
  };
  if (ready) start();
  else window.addEventListener('load', start, { once: true });
  updateButton();
})();
