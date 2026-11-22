/* =========================================================
   LUXE PLUS — second animation set (loads after luxe.js)
   ========================================================= */
(function(){
   const root = document.documentElement;
   if (!root.classList.contains('lux')) return;

   const $  = (s, el = document) => el.querySelector(s);
   const $$ = (s, el = document) => [...el.querySelectorAll(s)];
   const desktop = matchMedia('(hover: hover) and (pointer: fine)').matches;
   const isPhone = () => innerWidth <= 700;
   const rand = (a, b) => a + Math.random() * (b - a);
   const PASTEL = ['#bfe3f7', '#e9c3dc', '#e2a8cf', '#c9b6f0', '#8fd3e6', '#1b1530'];
   const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
   const onVisible = (el, fn, opts = { threshold:.3 }) => {
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting){ fn(en.target); io.unobserve(en.target); } }), opts);
      io.observe(el);
   };

   /* ---------- 1: text scramble / decode ---------- */
   const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/<>';
   function scramble(el, dur = 900){
      if (el.dataset.scr) return; el.dataset.scr = 1;
      const final = el.dataset.text || (el.dataset.text = el.textContent);
      const len = final.length; let t0 = null;
      const step = ts => {
         t0 ??= ts;
         const p = Math.min((ts - t0) / dur, 1);
         let out = '';
         for (let i = 0; i < len; i++){
            const c = final[i];
            out += (c === ' ' || i / len < p) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
         }
         el.textContent = out;
         if (p < 1) requestAnimationFrame(step); else { el.textContent = final; delete el.dataset.scr; }
      };
      requestAnimationFrame(step);
   }
   // hero eyebrow decodes as the intro starts
   const heroEyebrow = $('.hero .eyebrow');
   const whenGo = fn => {
      if (root.classList.contains('lux-go')) return fn();
      const mo = new MutationObserver(() => { if (root.classList.contains('lux-go')){ mo.disconnect(); fn(); } });
      mo.observe(root, { attributes:true, attributeFilter:['class'] });
   };
   if (heroEyebrow) whenGo(() => setTimeout(() => scramble(heroEyebrow, 1300), 150));
   $$('.job-date, .head-note, .card-label, .menu-k').forEach(el => onVisible(el, e => setTimeout(() => scramble(e, 800), 250), { threshold:1 }));
   const brand = $('.brand');
   if (brand && desktop) brand.addEventListener('mouseenter', () => scramble(brand, 600));
   // menu links decode when the menu opens
   const menuBtn = $('#menuBtn');
   if (menuBtn) menuBtn.addEventListener('click', () => setTimeout(() => {
      if (document.body.classList.contains('menu-open')) $$('.menu-panel nav a').forEach((a, i) => setTimeout(() => scramble(a, 500), 120 + i * 50));
   }, 0));

   /* ---------- 2: living gradient on the last hero words ---------- */
   const heroWords = $$('.hero h1 .lw');
   heroWords.slice(-3).forEach(w => w.classList.add('lux-grad'));

   /* ---------- 3: sparkles follow the mouse (desktop) or your finger (phone) ---------- */
   const hero = $('.hero');
   if (hero){
      let last = 0, live = 0;
      const cap = desktop ? 40 : 22, gap = desktop ? 32 : 45;
      const spark = (cx, cy) => {
         const now = performance.now();
         if (now - last < gap || live > cap) return; last = now;
         const s = document.createElement('span'); s.className = 'lux-spark';
         const size = rand(5, 14); s.style.width = s.style.height = size + 'px';
         document.body.append(s); live++;
         const x = cx - size / 2, y = cy - size / 2;
         s.animate([
            { transform:`translate3d(${x}px,${y}px,0) scale(1)`, opacity:1 },
            { transform:`translate3d(${x + rand(-30, 30)}px,${y + rand(20, 60)}px,0) scale(0)`, opacity:0 }
         ], { duration:rand(700, 1100), easing:'cubic-bezier(.16,1,.3,1)' }).onfinish = () => { s.remove(); live--; };
      };
      if (desktop) hero.addEventListener('mousemove', e => spark(e.clientX, e.clientY));
      else {
         hero.addEventListener('touchstart', e => { const t = e.touches[0]; last = 0; spark(t.clientX, t.clientY); }, { passive:true });
         hero.addEventListener('touchmove', e => { const t = e.touches[0]; spark(t.clientX, t.clientY); }, { passive:true });
      }
   }

   /* ---------- 4: scroll-filled paragraphs ---------- */
   const fills = $$('.work-body > p, .about-copy > p:not(.eyebrow)');
   fills.forEach(p => {
      const walk = node => [...node.childNodes].forEach(n => {
         if (n.nodeType === 3){
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(part => {
               if (!part) return;
               if (/^\s+$/.test(part)){ frag.append(part); return; }
               const s = document.createElement('span'); s.className = 'fw'; s.textContent = part; frag.append(s);
            });
            n.replaceWith(frag);
         } else if (n.nodeType === 1) walk(n);
      });
      walk(p); p.classList.add('lux-fill'); p._w = $$('.fw', p); p._n = 0;
   });
   let fillTick = false;
   function updateFills(){
      fillTick = false;
      const vh = innerHeight;
      fills.forEach(p => {
         const r = p.getBoundingClientRect();
         if (r.bottom < -50 || r.top > vh + 50) return;
         const prog = Math.min(1, Math.max(0, (vh * .88 - r.top) / (r.height + vh * .3)));
         const n = Math.round(prog * p._w.length);
         if (n === p._n) return;
         // only the words between the old and new position change (cheap on phones)
         const lo = Math.min(n, p._n), hi = Math.max(n, p._n), on = n > p._n;
         for (let i = lo; i < hi; i++) p._w[i].classList.toggle('on', on);
         p._n = n;
      });
   }
   addEventListener('scroll', () => { if (!fillTick){ fillTick = true; requestAnimationFrame(updateFills); } }, { passive:true });
   addEventListener('resize', updateFills); updateFills();

   /* ---------- 5: constellation behind Skills ---------- */
   const skills = $('#skills');
   if (skills && !desktop) phoneNet(skills);
   if (skills && desktop){
      const cv = document.createElement('canvas'); cv.className = 'lux-net'; cv.setAttribute('aria-hidden', 'true');
      skills.prepend(cv);
      const ctx = cv.getContext('2d');
      let W, H, dpr, pts = [], raf = 0, visible = false, mouse = { x:-9999, y:-9999 };
      function size(){
         W = skills.offsetWidth; H = skills.offsetHeight; dpr = Math.min(devicePixelRatio || 1, 1.5);
         cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
         const n = Math.round(Math.min(isPhone() ? 38 : 90, W * H / (isPhone() ? 16000 : 15000)));
         pts = Array.from({ length:n }, () => ({ x:rand(0, W), y:rand(0, H), vx:rand(-.25, .25), vy:rand(-.25, .25), r:rand(.8, 2) }));
      }
      const LINK = () => isPhone() ? 95 : 135;
      function draw(){
         ctx.clearRect(0, 0, W, H);
         const L = LINK();
         for (const p of pts){
            // gentle pull toward the pointer
            const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
            if (d < 200 && d > 1){ p.vx += dx / d * .012; p.vy += dy / d * .012; }
            p.vx *= .99; p.vy *= .99;
            p.vx += rand(-.01, .01); p.vy += rand(-.01, .01);
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;
         }
         for (let i = 0; i < pts.length; i++){
            const a = pts[i];
            for (let j = i + 1; j < pts.length; j++){
               const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
               if (d < L){ ctx.strokeStyle = `rgba(191,227,247,${(1 - d / L) * .22})`; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
            }
            const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
            if (dm < 180){ ctx.strokeStyle = `rgba(233,195,220,${(1 - dm / 180) * .5})`; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
            ctx.fillStyle = dm < 180 ? 'rgba(233,195,220,.95)' : 'rgba(255,255,255,.55)';
            ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
         }
         raf = visible && !document.hidden ? requestAnimationFrame(draw) : 0;
      }
      const setPointer = (cx, cy) => { const r = skills.getBoundingClientRect(); mouse.x = cx - r.left; mouse.y = cy - r.top; };
      skills.addEventListener('mousemove', e => setPointer(e.clientX, e.clientY));
      skills.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });
      skills.addEventListener('touchmove', e => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive:true });
      skills.addEventListener('touchstart', e => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive:true });
      skills.addEventListener('touchend', () => setTimeout(() => { mouse.x = mouse.y = -9999; }, 600));
      new IntersectionObserver(([en]) => {
         visible = en.isIntersecting; cv.classList.toggle('on', visible);
         if (visible && !raf){ if (!W) size(); raf = requestAnimationFrame(draw); }
      }, { threshold:0 }).observe(skills);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(draw); });
      let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 200); });
      if ('ResizeObserver' in window) new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(size, 200); }).observe(skills);
   }

   /* phones: same network look, but the canvas is only screen-sized (not the whole tall section),
      runs at ~30fps, and stops when Skills is off screen */
   function phoneNet(sec){
      const cv = document.createElement('canvas'); cv.className = 'lux-net lux-net-fixed'; cv.setAttribute('aria-hidden', 'true');
      sec.prepend(cv);
      const ctx = cv.getContext('2d');
      let W, H, pts = [], raf = 0, visible = false, last = 0, touch = { x:-9999, y:-9999 };
      const size = () => {
         W = innerWidth; H = innerHeight; cv.width = W; cv.height = H;
         pts = Array.from({ length:26 }, () => ({ x:rand(0, W), y:rand(0, H), vx:rand(-.3, .3), vy:rand(-.3, .3), r:rand(.8, 1.8) }));
      };
      const L = 100;
      const draw = t => {
         raf = visible && !document.hidden ? requestAnimationFrame(draw) : 0;
         if (t - last < 32) return; last = t;
         const r = sec.getBoundingClientRect();
         const top = Math.max(0, r.top), bot = Math.min(H, r.bottom);
         ctx.clearRect(0, 0, W, H);
         if (bot <= top) return;
         ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, bot - top); ctx.clip();
         for (const p of pts){
            const dx = touch.x - p.x, dy = touch.y - p.y, d = Math.hypot(dx, dy);
            if (d < 170 && d > 1){ p.vx += dx / d * .03; p.vy += dy / d * .03; }
            p.vx *= .985; p.vy *= .985; p.x += p.vx * 2; p.y += p.vy * 2;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;
         }
         ctx.lineWidth = .7;
         for (let i = 0; i < pts.length; i++){
            const a = pts[i];
            for (let j = i + 1; j < pts.length; j++){
               const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
               if (d < L){ ctx.strokeStyle = `rgba(191,227,247,${(1 - d / L) * .25})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
            }
            const dm = Math.hypot(a.x - touch.x, a.y - touch.y);
            if (dm < 160){ ctx.strokeStyle = `rgba(233,195,220,${(1 - dm / 160) * .55})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(touch.x, touch.y); ctx.stroke(); }
            ctx.fillStyle = dm < 160 ? 'rgba(233,195,220,.95)' : 'rgba(255,255,255,.55)';
            ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
         }
         ctx.restore();
      };
      const setT = e => { const t = e.touches[0]; touch.x = t.clientX; touch.y = t.clientY; };
      sec.addEventListener('touchstart', setT, { passive:true });
      sec.addEventListener('touchmove', setT, { passive:true });
      sec.addEventListener('touchend', () => setTimeout(() => { touch.x = touch.y = -9999; }, 500));
      new IntersectionObserver(([en]) => {
         visible = en.isIntersecting; cv.classList.toggle('on', visible);
         if (visible && !raf){ if (!W) size(); raf = requestAnimationFrame(draw); }
      }).observe(sec);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(draw); });
      let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 200); });
   }

   /* ---------- 6: request flow pulses Client → API → DB → Cloud ---------- */
   const flow = $$('.flow li');
   if (flow.length){
      let idx = -1, timer = 0;
      const tick = () => { flow.forEach(li => li.classList.remove('lux-hot')); idx = (idx + 1) % (flow.length + 1); if (idx < flow.length) flow[idx].classList.add('lux-hot'); };
      new IntersectionObserver(([en]) => {
         clearInterval(timer);
         if (en.isIntersecting) timer = setInterval(tick, 850);
         else flow.forEach(li => li.classList.remove('lux-hot'));
      }, { threshold:.4 }).observe($('.flow'));
   }

   /* ---------- 8: confetti burst from buttons ---------- */
   function confetti(x, y, n = 18){
      for (let i = 0; i < n; i++){
         const c = document.createElement('span'); c.className = 'lux-conf';
         c.style.background = PASTEL[i % PASTEL.length];
         if (i % 3 === 0) c.style.borderRadius = '50%';
         document.body.append(c);
         const ang = rand(0, Math.PI * 2), dist = rand(50, 140);
         c.animate([
            { transform:`translate(${x}px,${y}px) rotate(0) scale(1)`, opacity:1 },
            { transform:`translate(${x + Math.cos(ang) * dist}px,${y + Math.sin(ang) * dist + 40}px) rotate(${rand(-360, 360)}deg) scale(.4)`, opacity:0 }
         ], { duration:rand(700, 1200), easing:'cubic-bezier(.16,1,.3,1)' }).onfinish = () => c.remove();
      }
   }
   document.addEventListener('click', e => {
      const p = e.target.closest('.pill:not([type="submit"]), .menu-resume');
      if (p) confetti(e.clientX || p.getBoundingClientRect().left + 40, e.clientY || p.getBoundingClientRect().top + 20);
   });
   const status = $('#formStatus'), submit = $('#submitBtn');
   if (status && submit) new MutationObserver(() => {
      if (status.classList.contains('ok')){ const r = submit.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, 34); }
   }).observe(status, { attributes:true, attributeFilter:['class'] });

   /* ---------- 9: colour wipe when the weather changes ---------- */
   const WIPE = { clear:'#e9c3dc', sun:'#ffd27a', rain:'#6f93b8', storm:'#22304a', snow:'#eef6ff', fog:'#c9d3db' };
   const wxBtn = $('#wxBtn');
   function wipe(mode){
      const r = (wxBtn || document.body).getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const w = document.createElement('div'); w.className = 'lux-wipe'; w.style.background = WIPE[mode] || '#e9c3dc';
      document.body.append(w);
      w.animate([
         { clipPath:`circle(0px at ${x}px ${y}px)`, opacity:.55 },
         { clipPath:`circle(150vmax at ${x}px ${y}px)`, opacity:.4, offset:.6 },
         { clipPath:`circle(150vmax at ${x}px ${y}px)`, opacity:0 }
      ], { duration:1300, easing:'cubic-bezier(.76,0,.24,1)' }).onfinish = () => w.remove();
   }
   $$('[data-wx]').forEach(b => b.addEventListener('click', () => wipe(b.dataset.wx)));

   /* ---------- 10: project stats re-count on hover (desktop) / when centred (phone) ---------- */
   {
      const recount = row => {
         $$('.stats dt', row).forEach(dt => {
            const f = dt.dataset.final || dt.textContent, m = f.match(/^([\d.]+)(.*)$/);
            if (!m || +m[1] === 0 || dt._busy) return;
            dt._busy = 1;
            const to = parseFloat(m[1]), dec = (m[1].split('.')[1] || '').length; let t0 = null;
            const step = ts => { t0 ??= ts; const p = Math.min((ts - t0) / 700, 1), e = 1 - Math.pow(1 - p, 3);
               dt.textContent = p < 1 ? (to * e).toFixed(dec) + m[2] : f; if (p < 1) requestAnimationFrame(step); else dt._busy = 0; };
            requestAnimationFrame(step);
         });
      };
      if (desktop) $$('.work-item').forEach(row => row.addEventListener('mouseenter', () => recount(row)));
      else {
         const seen = new WeakSet();
         const cio = new IntersectionObserver(es => es.forEach(en => {
            if (en.isIntersecting && seen.has(en.target)) recount(en.target);
            if (en.isIntersecting) seen.add(en.target);
         }), { rootMargin:'-40% 0px -40% 0px' });
         $$('.work-item').forEach(r => cio.observe(r));
      }
   }

   /* ---------- tab title when you switch away ---------- */
   const title = document.title;
   document.addEventListener('visibilitychange', () => { document.title = document.hidden ? '👋 Come back soon · Sathish Kumar M' : title; });

   /* =========================================================
      11: MOBILE ONLY
      ========================================================= */
   if (!desktop){
      // toast helper
      const toast = document.createElement('div'); toast.className = 'lux-toast'; toast.setAttribute('role', 'status');
      document.body.append(toast); let tt;
      const say = msg => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 2200); };

      // shake the phone to change the weather (Android; iOS needs a permission prompt, so it is skipped)
      if ('DeviceMotionEvent' in window && typeof DeviceMotionEvent.requestPermission !== 'function'){
         const order = ['clear', 'sun', 'rain', 'storm', 'snow', 'fog'];
         const NAMES = { clear:'Clear', sun:'Sunny', rain:'Rain', storm:'Storm', snow:'Snow', fog:'Fog' };
         let lastShake = 0, gotMotion = false;
         addEventListener('devicemotion', e => {
            const a = e.acceleration; if (!a || a.x == null) return;
            gotMotion = true;
            const mag = Math.hypot(a.x, a.y, a.z), now = Date.now();
            if (mag < 22 || now - lastShake < 1500) return;
            lastShake = now;
            const cur = document.body.dataset.weather || 'clear';
            const next = order[(order.indexOf(cur) + 1) % order.length];
            const btn = $(`[data-wx="${next}"]`); if (btn) btn.click();
            buzz([15, 30, 15]); say('Weather · ' + NAMES[next]);
         });
         // one-time hint, only on phones that really report motion
         setTimeout(() => {
            let seen = false; try { seen = localStorage.getItem('luxShakeHint'); } catch (e) {}
            if (gotMotion && !seen && scrollY < innerHeight){ say('Tip: shake your phone to change the weather'); try { localStorage.setItem('luxShakeHint', 1); } catch (e) {} }
         }, 5000);
      }

      // double-tap the portrait for a burst of hearts
      const portrait = $('.about-photo');
      if (portrait){
         let lastTap = 0;
         portrait.addEventListener('pointerup', e => {
            const now = Date.now();
            if (now - lastTap < 320){
               buzz(20);
               for (let i = 0; i < 10; i++){
                  const h = document.createElement('span'); h.className = 'lux-heart'; h.textContent = '♥';
                  h.style.color = PASTEL[i % 5]; document.body.append(h);
                  const x = e.clientX - 10, y = e.clientY - 10;
                  h.animate([
                     { transform:`translate(${x}px,${y}px) scale(.3)`, opacity:0 },
                     { transform:`translate(${x + rand(-20, 20)}px,${y - 20}px) scale(1.2)`, opacity:1, offset:.2 },
                     { transform:`translate(${x + rand(-90, 90)}px,${y - rand(120, 220)}px) scale(.8) rotate(${rand(-40, 40)}deg)`, opacity:0 }
                  ], { duration:rand(1100, 1700), easing:'cubic-bezier(.16,1,.3,1)', delay:i * 40 }).onfinish = () => h.remove();
               }
               lastTap = 0;
            } else lastTap = now;
         });
      }

   }
})();
