/* =========================================================
   LUXE MOTION LAYER (works with script.js, changes no design)
   Runs only when <html> has .lux (motion allowed).
   ========================================================= */
(function(){
   const root = document.documentElement;
   if (!root.classList.contains('lux')) return;

   const $  = (s, el = document) => el.querySelector(s);
   const $$ = (s, el = document) => [...el.querySelectorAll(s)];
   const desktop = matchMedia('(hover: hover) and (pointer: fine)').matches;
   const phone = innerWidth <= 700;
   // phones on modern browsers already get scroll-driven slide-ins from style.css,
   // so we only add what those don't cover (no double animation)
   // phones now get the SAME reveal set as the web (luxe.css switches off style.css's own phone slide-ins so nothing doubles)
   const cssScrollAnims = false;
   const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

   /* ---------- split text into masked words ---------- */
   function splitWords(el, cls){
      let i = 0;
      const walk = node => [...node.childNodes].forEach(n => {
         if (n.nodeType === 3){
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(part => {
               if (!part) return;
               if (/^\s+$/.test(part)){ frag.append(' '); return; }
               const o = document.createElement('span'); o.className = 'lw';
               const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
               o.append(s); frag.append(o);
            });
            n.replaceWith(frag);
         } else if (n.nodeType === 1 && n.tagName !== 'I') walk(n);
      });
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
      walk(el);
      if (cls) el.classList.add(cls);
   }

   /* ---------- hero intro ---------- */
   const heroH1 = $('.hero h1');
   if (heroH1) splitWords(heroH1);
   function playIntro(){
      root.classList.add('lux-go');
      setTimeout(() => root.classList.add('lux-intro-done'), 2400);
   }

   /* ---------- preloader (first visit in a session) ---------- */
   const loader = $('#luxLoader');
   if (root.classList.contains('lux-load') && loader){
      const name = $('.lux-loader-name', loader); let k = 0;
      $$('span', name).forEach(w => {
         const t = w.textContent; w.textContent = '';
         [...t].forEach(c => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; s.style.setProperty('--i', k++); w.append(s); });
      });
      root.style.overflow = 'hidden';
      const bar = $('#luxBar'), pct = $('#luxPct');
      const minDur = phone ? 650 : 1400;
      const maxWait = phone ? 0 : 3200;   // phones never wait for every image: page appears fast
      let loaded = document.readyState === 'complete', t0 = null;
      addEventListener('load', () => loaded = true);
      const ease = t => 1 - Math.pow(1 - t, 3);
      const step = ts => {
         t0 ??= ts;
         const elapsed = ts - t0;
         // hold at 90% until the page has loaded (max 3.2s)
         let p = Math.min(elapsed / minDur, 1);
         if (!loaded && elapsed < maxWait) p = Math.min(p, .9);
         const e = ease(p);
         bar.style.transform = `scaleX(${e})`; pct.textContent = Math.round(e * 100);
         if (p < 1 || (!loaded && elapsed < maxWait)) return requestAnimationFrame(step);
         setTimeout(() => {
            loader.classList.add('out');
            root.style.overflow = '';
            try { sessionStorage.setItem('luxSeen', '1'); } catch (e) {}
            setTimeout(playIntro, phone ? 200 : 380);
            setTimeout(() => { loader.remove(); root.classList.remove('lux-load'); }, 1300);
         }, phone ? 80 : 220);
      };
      requestAnimationFrame(step);
   } else {
      requestAnimationFrame(() => setTimeout(playIntro, 60));
   }

   /* ---------- mark reveal targets ---------- */
   const reveal = new Set();
   const add = (sel, opts = {}) => $$(sel).forEach(el => { if (opts.cls) el.classList.add(opts.cls); else el.classList.add('lx'); reveal.add(el); });

   // headings (not the hero): masked words
   $$('main h2, .footer h2').forEach(h => { if (!h.closest('.hero') && !cssScrollAnims){ splitWords(h, 'lh'); reveal.add(h); } });
   // eyebrows get a drawn hairline
   $$('.eyebrow').forEach(e => { if (!e.closest('.hero') && !e.closest('.center-head')){ e.classList.add('lx-line'); reveal.add(e); } });

   add('.head-note, .center-head .sub, .center-head .chip, .icon-box-lg');
   add('.impact-grid > div');
   add('.form .field, .form-foot, .alt-contact');
   add('.footer-stack', { cls:'lx-kids' });
   add('.facts li');

   if (!cssScrollAnims){
      add('.work-title, .work-body > p, .work-side');
      add('.svc article, .proc li, .card, .stack-cols article, .flow li, .stack-title, .proc-title');
      add('.about-copy > p:not(.eyebrow)');
      add('.job-meta');
      add('.bullets, .tags', { cls:'lx-kids' });
      add('.faq details');
      add('.footer-cta .pill, .footer-grid > div');
   }
   // children stagger
   $$('.lx-kids').forEach(list => [...list.children].forEach((li, k) => li.style.setProperty('--k', k)));
   // siblings stagger
   reveal.forEach(el => {
      if (!el.classList.contains('lx')) return;
      const sibs = [...el.parentElement.children].filter(c => c.classList.contains('lx'));
      el.style.setProperty('--d', Math.max(0, sibs.indexOf(el)));
   });

   // portrait: wrap the image so it can open like an iris with an orbiting ring
   const img = $('.about-photo img');
   if (img){
      const wrap = document.createElement('div'); wrap.className = 'lux-portrait';
      img.parentNode.insertBefore(wrap, img); wrap.append(img);
      reveal.add(wrap);
   }
   const aboutCopy = $('.about-copy'); if (aboutCopy) reveal.add(aboutCopy);

   const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in'); io.unobserve(el);
      setTimeout(() => el.classList.add('lx-done'), 1800);
   }), { rootMargin:'0px 0px -8% 0px', threshold:.12 });
   reveal.forEach(el => io.observe(el));

   /* ---------- counters (impact strip + project stats) ---------- */
   const counters = $$('.impact-grid dt, .stats dt').map(el => {
      const m = el.textContent.trim().match(/^([\d.]+)(.*)$/);
      if (!m || +m[1] === 0) return null;
      const to = parseFloat(m[1]), dec = (m[1].split('.')[1] || '').length, suf = m[2];
      el.dataset.final = el.textContent; el.textContent = (0).toFixed(dec) + suf;
      return { el, to, dec, suf };
   }).filter(Boolean);
   const cio = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const c = counters.find(c => c.el === en.target); cio.unobserve(en.target);
      const dur = 1800; let t0 = null;
      const step = ts => {
         t0 ??= ts;
         const p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
         c.el.textContent = p < 1 ? (c.to * e).toFixed(c.dec) + c.suf : c.el.dataset.final;
         if (p < 1) requestAnimationFrame(step);
      };
      setTimeout(() => requestAnimationFrame(step), 250);
   }), { threshold:.6 });
   counters.forEach(c => cio.observe(c.el));

   /* ---------- FAQ: silky open / close ---------- */
   $$('.faq details').forEach(d => {
      const sum = $('summary', d), ans = $('p', d);
      if (!ans) return;
      sum.addEventListener('click', e => {
         e.preventDefault();
         if (d.dataset.busy) return; d.dataset.busy = 1;
         const done = () => delete d.dataset.busy;
         if (d.open){
            const a = ans.animate([{ height:ans.offsetHeight + 'px', opacity:1 }, { height:'0px', opacity:0, paddingBottom:'0px' }], { duration:450, easing:'cubic-bezier(.76,0,.24,1)' });
            a.onfinish = () => { d.open = false; done(); };
         } else {
            d.open = true;
            const h = ans.offsetHeight;
            const a = ans.animate([{ height:'0px', opacity:0, transform:'translateY(-6px)' }, { height:h + 'px', opacity:1, transform:'none' }], { duration:600, easing:'cubic-bezier(.16,1,.3,1)' });
            a.onfinish = done;
         }
      });
   });

   /* ---------- form: celebrate a sent message ---------- */
   const status = $('#formStatus'), btn = $('#submitBtn');
   if (status && btn){
      new MutationObserver(() => {
         if (status.classList.contains('ok')){
            btn.classList.add('lux-sent'); buzz([18, 40, 18]);
            setTimeout(() => btn.classList.remove('lux-sent'), 2400);
         } else if (status.classList.contains('err')) buzz([30, 50, 30]);
      }).observe(status, { attributes:true, attributeFilter:['class'] });
   }

   /* =========================================================
      DESKTOP — mouse-driven
      ========================================================= */
   if (desktop){
      root.classList.add('lux-cursor-on');
      const ring = $('#luxCursor'), dot = $('#luxDot'), label = $('#luxCursorText');
      let mx = -100, my = -100, rx = -100, ry = -100;
      addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px)`; ring.classList.remove('gone'); }, { passive:true });
      (function loop(){ rx += (mx - rx) * .14; ry += (my - ry) * .14; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); })();
      document.addEventListener('mouseover', e => {
         const link = e.target.closest('a, button, summary, label');
         const row = e.target.closest('.work-item');
         const isLabel = row && !link;
         ring.classList.toggle('link', !!link);
         ring.classList.toggle('label', !!isLabel);
         label.textContent = isLabel ? 'Visit' : '';
      });
      document.addEventListener('mouseleave', () => ring.classList.add('gone'));
      addEventListener('mousedown', () => ring.classList.add('down'));
      addEventListener('mouseup', () => ring.classList.remove('down'));

      // the whole project row opens its site
      $$('.work-item').forEach(row => row.addEventListener('click', e => {
         if (e.target.closest('a') || getSelection().toString()) return;
         const a = $('.visit', row); if (a) window.open(a.href, '_blank', 'noopener');
      }));

      // magnetic pull
      $$('.pill, .menu-btn, .wx-btn, .social a, .menu-social a').forEach(b => {
         const strength = b.classList.contains('pill') ? .32 : .25;
         b.addEventListener('mousemove', e => {
            const r = b.getBoundingClientRect();
            b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * strength}px, ${(e.clientY - r.top - r.height / 2) * strength}px)`;
         });
         b.addEventListener('mouseleave', () => b.style.transform = '');
      });

      // spotlight position for rows and dark cards
      $$('.work-item, .card, .stack-cols article, .flow li').forEach(c => c.addEventListener('mousemove', e => {
         const r = c.getBoundingClientRect();
         c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
         c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }));

      // soft 3D tilt on skill cards
      $$('.card').forEach(c => {
         c.addEventListener('mousemove', e => {
            if (!c.classList.contains('in') && c.classList.contains('lx')) return;
            const r = c.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
            c.style.transform = `perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) translateY(-4px)`;
         });
         c.addEventListener('mouseleave', () => c.style.transform = '');
      });

      // hero: wave drifts against the mouse, light follows it
      const hero = $('.hero'), media = $('.hero-media'), inner = $('.hero-inner');
      if (hero && media){
         let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
         const tick = () => {
            cx += (tx - cx) * .06; cy += (ty - cy) * .06;
            media.style.translate = `${cx * -22}px ${cy * -16}px`;
            if (inner) inner.style.transform = `translate3d(${cx * 8}px, ${cy * 6}px, 0)`;
            hero.style.setProperty('--lx', (cx * 260) + 'px'); hero.style.setProperty('--ly', (cy * 180) + 'px');
            raf = (Math.abs(tx - cx) > .001 || Math.abs(ty - cy) > .001) ? requestAnimationFrame(tick) : 0;
         };
         hero.addEventListener('mousemove', e => {
            const r = hero.getBoundingClientRect();
            tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5;
            if (!raf) raf = requestAnimationFrame(tick);
         });
         hero.addEventListener('mouseleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
      }
   }

   /* =========================================================
      TOUCH / MOBILE — tap-driven
      ========================================================= */
   if (!desktop){
      // soft pastel ripple from the exact tap point + a tiny haptic tick on buttons
      document.addEventListener('pointerdown', e => {
         const t = e.target.closest('.pill, .menu-btn, .wx-btn, .card, .work-item, .svc article, .job, .flow li, .stack-cols article, .faq summary, .social a, .menu-social a, .menu-resume');
         if (!t) return;
         const r = t.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2;
         const s = document.createElement('span'); s.className = 'lux-ripple';
         s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
         if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
         t.style.overflow = 'hidden';
         t.append(s); setTimeout(() => s.remove(), 850);
         if (t.matches('.pill, .menu-btn, .wx-btn, .menu-resume')) buzz(8);
      }, { passive:true });

      const menuBtn = $('#menuBtn');
      if (menuBtn) menuBtn.addEventListener('click', () => buzz(12));

      // the web's hover looks (row glow, card spotlight + glowing edge, icon flip) play
      // on phones when the item reaches the middle of the screen
      const act = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('lux-active', en.isIntersecting)),
         { rootMargin:'-35% 0px -35% 0px' });
      $$('.work-item, .card, .stack-cols article, .flow li, .svc article').forEach(el => act.observe(el));

      // (phone tilt parallax removed: moving the masked hero image every frame cost scroll smoothness)
   }
})();
