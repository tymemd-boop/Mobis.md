/* =========================================================
   Setările firmei – modifică doar aici
   ========================================================= */
window.SITE = {
  whatsapp: '37360605409',   // numărul WhatsApp, cu prefixul țării, fără + și spații
  delivery: 500,             // prețul livrării, lei
  assemblyRate: 0.15,        // asamblarea: 15% din prețul produsului (comodă, comodă TV)
  wardrobeAssemblyRate: 0.07 // asamblarea la dulap: 7% din prețul produsului
};

(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.header');
  const hero = document.querySelector('.hero');
  const split = document.querySelector('.split');
  const parallax = document.querySelectorAll('[data-parallax]');
  const progress = (v) => Math.min(1, Math.max(0, v));
  let framePending = false;

  // Efecte legate de scroll: fotografia din hero se estompează și se micșorează lumina,
  // imaginea din atelier se descompune în fâșii, fotografiile au parallax
  const updateScroll = () => {
    framePending = false;
    const vh = window.innerHeight;
    document.body.classList.toggle('is-scrolled', window.scrollY > 20);
    if (reducedMotion.matches) return;
    if (hero) {
      const bounds = hero.getBoundingClientRect();
      const headerHeight = header ? header.offsetHeight : 0;
      hero.style.setProperty('--hp', progress((headerHeight - bounds.top) / Math.max(1, bounds.height * .8)).toFixed(4));
    }
    if (split) {
      const bounds = split.getBoundingClientRect();
      split.style.setProperty('--sp', progress(-bounds.top / Math.max(1, bounds.height - vh)).toFixed(4));
    }
    parallax.forEach(el => {
      const bounds = el.getBoundingClientRect();
      el.style.setProperty('--py', progress((vh - bounds.top) / (vh + bounds.height)).toFixed(4));
    });
  };

  const scheduleScroll = () => {
    if (!framePending) {
      framePending = true;
      window.requestAnimationFrame(updateScroll);
    }
  };

  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll);
  window.addEventListener('pageshow', scheduleScroll);
  reducedMotion.addEventListener('change', scheduleScroll);
  updateScroll();

  // Elementele noi „ies în prim-plan” când apar pe ecran
  const reveals = document.querySelectorAll('[data-reveal]');
  const countUp = el => {
    const target = +el.dataset.count, suffix = el.dataset.suffix || '', prefix = el.dataset.prefix || '';
    if (reducedMotion.matches) { el.textContent = prefix + target + suffix; return; }
    const t0 = performance.now();
    const tick = now => {
      const k = progress((now - t0) / 1400);
      el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      entry.target.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(entry.target);
    }), { threshold: .14, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }

  // Cardurile de produs se înclină ușor după cursor
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        if (reducedMotion.matches) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 7 + 'deg');
        card.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -7 + 'deg');
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  }

  // Meniu mobil
  const toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.nav a').forEach(a =>
      a.addEventListener('click', () => {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }));
  }

  // Anul în subsol
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Formular de contact → mesaj pe WhatsApp (nu are nevoie de server)
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const status = form.querySelector('.form-status');
      const f = form.elements;
      const name = f.namedItem('name').value.trim();
      const phone = f.namedItem('phone').value.trim();
      const topic = f.namedItem('topic').value;
      const msg = f.namedItem('message').value.trim();
      if (!name || !phone) {
        status.textContent = 'Te rugăm să completezi numele și telefonul.';
        status.className = 'form-status is-error';
        return;
      }
      const text = `Bună ziua! Mă numesc ${name}, telefon ${phone}.\nSubiect: ${topic}` + (msg ? `\n${msg}` : '');
      window.open('https://wa.me/' + window.SITE.whatsapp + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      status.textContent = 'Mulțumim! Mesajul s-a deschis în WhatsApp – apasă „Trimite” acolo.';
      status.className = 'form-status is-ok';
      form.reset();
    });
  }
})();
