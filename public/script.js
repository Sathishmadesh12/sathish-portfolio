// Menu overlay
const body = document.body;
const menuBtn = document.getElementById('menuBtn');
const menuPanel = document.getElementById('menuPanel');

function setMenu(open){
   body.classList.toggle('menu-open', open);
   menuBtn.setAttribute('aria-expanded', open);
   menuPanel.setAttribute('aria-hidden', !open);
   menuBtn.textContent = open ? 'Close' : 'Menu';
}
menuBtn.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
menuPanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// Nav turns dark when it sits over a light section
const nav = document.getElementById('nav');
const themed = document.querySelectorAll('[data-theme]');
function updateNav(){
   let theme = 'dark';
   themed.forEach(sec => {
      const r = sec.getBoundingClientRect();
      if (r.top <= 36 && r.bottom >= 36) theme = sec.dataset.theme;
   });
   nav.classList.toggle('on-light', theme === 'light');
   nav.classList.toggle('scrolled', window.scrollY > 24);
}
window.addEventListener('scroll', updateNav, { passive: true });
window.addEventListener('resize', updateNav);
updateNav();

// Contact form
const form = document.getElementById('contactForm');
const statusEl = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

function setStatus(msg, type){
   statusEl.textContent = msg;
   statusEl.className = 'form-status' + (type ? ' ' + type : '');
}

form.addEventListener('submit', async (e) => {
   e.preventDefault();
   const data = Object.fromEntries(new FormData(form).entries());
   form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

   const bad = [];
   if (!data.name || data.name.trim().length < 2) bad.push('name');
   if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email || '')) bad.push('email');
   if (!data.message || data.message.trim().length < 10) bad.push('message');
   if (bad.length){
      bad.forEach(n => form.elements[n].classList.add('invalid'));
      form.elements[bad[0]].focus();
      setStatus(bad[0] === 'message' ? 'Please write a message of at least 10 characters.' : 'Please check your ' + bad[0] + '.', 'err');
      return;
   }

   submitBtn.disabled = true;
   submitBtn.querySelector('span').textContent = 'Sending…';
   setStatus('', '');
   try {
      const res = await fetch('/api/contact', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok){
         form.reset();
         setStatus('Message sent. I\'ll get back to you soon.', 'ok');
      } else {
         setStatus(json.error || 'Something went wrong. Please try again.', 'err');
      }
   } catch (err){
      setStatus('Could not reach the server. Please email me directly.', 'err');
   } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'Send message';
   }
});

// ---------------------------------------------------------
// Hero weather
// ---------------------------------------------------------
(function(){
   const hero = document.getElementById('home');
   const cv = document.getElementById('heroFx');
   const flash = document.getElementById('heroFlash');
   const wx = document.getElementById('wx');
   const wxBtn = document.getElementById('wxBtn');
   const wxIcon = document.getElementById('wxIcon');
   const wxName = document.getElementById('wxName');
   const items = wx.querySelectorAll('[data-wx]');
   const ctx = cv.getContext('2d');
   const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const ICONS = { clear:'fa-moon', sun:'fa-sun', rain:'fa-cloud-rain', storm:'fa-cloud-bolt', snow:'fa-snowflake', fog:'fa-smog' };
   const NAMES = { clear:'Clear', sun:'Sunny', rain:'Rain', storm:'Storm', snow:'Snow', fog:'Fog' };

   let mode = 'clear', W = 0, H = 0, dpr = 1, parts = [], raf = 0, visible = true, nextFlash = 0;

   function resize(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
   }

   function build(){
      const small = W < 700;
      parts = [];
      let n = 0;
      if (mode === 'rain') n = small ? 90 : 190;
      if (mode === 'storm') n = small ? 150 : 320;
      if (mode === 'snow') n = small ? 70 : 140;
      if (mode === 'fog') n = small ? 5 : 8;
      for (let i = 0; i < n; i++) parts.push(spawn(true));
      nextFlash = performance.now() + 2500;
   }

   function spawn(anywhere){
      const r = Math.random();
      if (mode === 'rain' || mode === 'storm'){
         const storm = mode === 'storm';
         return { x:Math.random() * (W + 200) - 100, y:anywhere ? Math.random() * H : -30,
                  len:12 + r * 18, v:(storm ? 20 : 13) + r * 9, a:0.18 + r * 0.35, wind:storm ? 5 : 2 };
      }
      if (mode === 'snow'){
         return { x:Math.random() * W, y:anywhere ? Math.random() * H : -10, rad:1 + r * 2.8,
                  v:0.5 + r * 1.4, ph:Math.random() * 6.28, a:0.35 + r * 0.55 };
      }
      return { x:Math.random() * W, y:H * (0.2 + Math.random() * 0.7), rad:W * (0.22 + r * 0.25),
               v:(r < 0.5 ? -1 : 1) * (0.12 + r * 0.25), a:0.07 + r * 0.08 };
   }

   function frame(t){
      ctx.clearRect(0, 0, W, H);
      if (mode === 'sun'){
         const g = ctx.createRadialGradient(W * 0.8, H * 0.12, 0, W * 0.8, H * 0.12, Math.max(W, H) * 0.75);
         const pulse = 0.5 + Math.sin(t / 1800) * 0.06;
         g.addColorStop(0, 'rgba(255,214,120,' + (pulse + 0.2) + ')');
         g.addColorStop(0.35, 'rgba(255,160,70,0.22)');
         g.addColorStop(1, 'rgba(255,120,40,0)');
         ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      else if (mode === 'rain' || mode === 'storm'){
         ctx.lineWidth = 1.1; ctx.lineCap = 'round';
         for (const p of parts){
            ctx.strokeStyle = 'rgba(95,155,215,' + (p.a + 0.12) + ')';
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.wind * 0.9, p.y + p.len); ctx.stroke();
            p.y += p.v; p.x -= p.wind;
            if (p.y > H){ Object.assign(p, spawn(false)); }
         }
         if (mode === 'storm' && t > nextFlash){
            flash.classList.add('on');
            setTimeout(() => flash.classList.remove('on'), 90);
            if (Math.random() < 0.5) setTimeout(() => { flash.classList.add('on'); setTimeout(() => flash.classList.remove('on'), 70); }, 170);
            nextFlash = t + 2500 + Math.random() * 5000;
         }
      }
      else if (mode === 'snow'){
         ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(100,135,170,0.75)'; ctx.lineWidth = 0.8;
         for (const p of parts){
            ctx.globalAlpha = Math.min(1, p.a + 0.15);
            ctx.beginPath(); ctx.arc(p.x + Math.sin(t / 1200 + p.ph) * 14, p.y, p.rad, 0, 6.283); ctx.fill(); ctx.stroke();
            p.y += p.v;
            if (p.y > H + 10){ Object.assign(p, spawn(false)); }
         }
         ctx.globalAlpha = 1;
      }
      else if (mode === 'fog'){
         for (const p of parts){
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rad);
            g.addColorStop(0, 'rgba(165,185,200,' + (p.a + 0.04) + ')');
            g.addColorStop(1, 'rgba(165,185,200,0)');
            ctx.fillStyle = g; ctx.fillRect(p.x - p.rad, p.y - p.rad, p.rad * 2, p.rad * 2);
            p.x += p.v;
            if (p.x < -p.rad) p.x = W + p.rad;
            if (p.x > W + p.rad) p.x = -p.rad;
         }
      }
      raf = (visible && !document.hidden && mode !== 'clear' && !reduce) ? requestAnimationFrame(frame) : 0;
   }

   function start(){
      cancelAnimationFrame(raf); raf = 0;
      if (mode === 'clear'){ ctx.clearRect(0, 0, W, H); return; }
      if (reduce){ build(); frame(performance.now()); return; }   // single static frame
      raf = requestAnimationFrame(frame);
   }

   function setWeather(next, scroll){
      mode = NAMES[next] ? next : 'clear';
      hero.dataset.weather = mode; document.body.dataset.weather = mode;
      wxIcon.className = 'fa-solid ' + ICONS[mode];
      wxName.textContent = NAMES[mode];
      items.forEach(b => b.setAttribute('aria-checked', b.dataset.wx === mode));
      try { localStorage.setItem('wx', mode); } catch (e) {}
      build(); start();
   }

   wxBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = !wx.classList.contains('open');
      wx.classList.toggle('open', open);
      wxBtn.setAttribute('aria-expanded', open);
   });
   items.forEach(b => b.addEventListener('click', () => {
      setWeather(b.dataset.wx, true);
      wx.classList.remove('open'); wxBtn.setAttribute('aria-expanded', 'false'); wxBtn.focus();
   }));
   document.addEventListener('click', e => { if (!wx.contains(e.target)){ wx.classList.remove('open'); wxBtn.setAttribute('aria-expanded', 'false'); } });
   document.addEventListener('keydown', e => { if (e.key === 'Escape'){ wx.classList.remove('open'); wxBtn.setAttribute('aria-expanded', 'false'); } });

   // pause when hero is off-screen or tab hidden
      document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) start(); });
   let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); start(); }, 150); });

   let saved = 'clear';
   try { saved = localStorage.getItem('wx') || 'clear'; } catch (e) {}
   resize();
   setWeather(saved, false);
})();
