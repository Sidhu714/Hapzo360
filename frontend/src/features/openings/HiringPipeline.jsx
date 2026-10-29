import { useEffect, useRef } from 'react';

/*
  Full-screen background for the Openings page: a hiring pipeline.
  Candidates flow left to right through four stages (Apply, Shortlist, Interview,
  Offer). The funnel narrows at every gate, some candidates drop out, and the ones
  who make it through the last gate are hired, with a ring and a check badge.
  Drawn on one canvas so it stays smooth. Purely decorative: it shows no real data.
*/

const TAU = Math.PI * 2;
const STAGES = ['Apply', 'Shortlist', 'Interview', 'Offer'];
const GATES_DESKTOP = [0.2, 0.4, 0.6, 0.8];
const GATES_MOBILE = [0.17, 0.39, 0.61, 0.83];

const WHITE = '255,255,255';
const AMBER = '255,176,77';
const CORAL = '255,122,89';
const DOT_COLORS = [WHITE, WHITE, WHITE, WHITE, AMBER, CORAL];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

export default function HiringPipeline({ stages = STAGES }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let small = false;
    let gates = [];
    let y0 = 0;
    let band = 0;
    let candidates = [];
    let rings = [];
    let badges = [];
    let flash = [0, 0, 0, 0];
    let spawn = 0;
    let time = 0;
    let last = 0;
    let raf = 0;
    let resizeTimer = 0;

    // how wide the funnel is at x: wide in the open, narrow at every gate
    const thickness = (x) => {
      let f = 1;
      const reach = (gates[1] - gates[0]) * 0.5;
      for (let i = 0; i < gates.length; i += 1) f = Math.min(f, clamp(Math.abs(x - gates[i]) / reach, 0, 1));
      const eased = f * f * (3 - 2 * f);
      return band * (0.16 + 0.84 * eased);
    };

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      small = w < 720;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      gates = (small ? GATES_MOBILE : GATES_DESKTOP).map((f) => f * w);
      y0 = h * (small ? 0.39 : 0.42);
      band = clamp(h * 0.1, 46, 108);
      candidates = [];
      rings = [];
      badges = [];
      flash = [0, 0, 0, 0];
      spawn = 0;
    };

    const addCandidate = (x) => {
      // decide in advance where (if anywhere) this candidate drops out
      let fate = 3;
      if (Math.random() < 0.35) fate = 0;
      else if (Math.random() < 0.4) fate = 1;
      else if (Math.random() < 0.45) fate = 2;

      candidates.push({
        x,
        lane: rand(-1, 1),
        speed: (w / 17) * rand(0.85, 1.15),
        phase: rand(0, TAU),
        size: rand(2.2, 3.4),
        color: DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)],
        fate,
        dropped: false,
        dropT: 0,
        hired: false,
      });
    };

    const step = (dt) => {
      time += dt;

      spawn += dt * (small ? 2.4 : 3.6);
      while (spawn >= 1) {
        spawn -= 1;
        addCandidate(rand(-30, -4));
      }

      candidates.forEach((p) => {
        p.x += p.speed * (p.dropped ? 0.35 : 1) * dt;

        if (p.dropped) {
          p.dropT += dt;
          return;
        }

        if (p.fate < 3 && p.x >= gates[p.fate]) {
          p.dropped = true;
          flash[p.fate] = 1;
        } else if (p.fate === 3 && !p.hired && p.x >= gates[3]) {
          p.hired = true;
          p.color = AMBER;
          p.size += 1.2;
          flash[3] = 1;
          rings.push({ x: gates[3], y: y0, t: 0 });
          badges.push({ x: gates[3] + 18, y: y0 - 6, t: 0 });
        }
      });

      candidates = candidates.filter((p) => p.x < w + 30 && p.dropT < 1.4);
      rings.forEach((r) => { r.t += dt; });
      badges.forEach((b) => { b.t += dt; });
      rings = rings.filter((r) => r.t < 1.6);
      badges = badges.filter((b) => b.t < 2);
      flash = flash.map((f) => Math.max(0, f - dt * 1.6));
    };

    const pill = (cx, cy, text, glow) => {
      ctx.font = `700 ${small ? 11 : 12}px "Plus Jakarta Sans", system-ui, sans-serif`;
      const width = ctx.measureText(text).width + 26;
      const height = small ? 23 : 26;
      const x = cx - width / 2;
      const y = cy - height / 2;

      ctx.beginPath();
      ctx.moveTo(x + height / 2, y);
      ctx.arcTo(x + width, y, x + width, y + height, height / 2);
      ctx.arcTo(x + width, y + height, x, y + height, height / 2);
      ctx.arcTo(x, y + height, x, y, height / 2);
      ctx.arcTo(x, y, x + width, y, height / 2);
      ctx.closePath();
      ctx.fillStyle = `rgba(${WHITE},${(0.1 + glow * 0.18).toFixed(3)})`;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${WHITE},${(0.26 + glow * 0.4).toFixed(3)})`;
      ctx.stroke();

      ctx.fillStyle = `rgba(${WHITE},.92)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, cy + 0.5);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // funnel outline
      ctx.save();
      ctx.setLineDash([2, 8]);
      ctx.lineDashOffset = -time * 6;
      ctx.strokeStyle = `rgba(${WHITE},.2)`;
      ctx.lineWidth = 1.2;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const y = y0 + side * thickness(x);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.restore();

      // gates and stage labels
      gates.forEach((gx, i) => {
        const glow = flash[i];
        const half = band * 1.08;

        const halo = ctx.createLinearGradient(0, y0 - half, 0, y0 + half);
        halo.addColorStop(0, `rgba(${AMBER},0)`);
        halo.addColorStop(0.5, `rgba(${AMBER},${(0.1 + glow * 0.35).toFixed(3)})`);
        halo.addColorStop(1, `rgba(${AMBER},0)`);
        ctx.fillStyle = halo;
        ctx.fillRect(gx - 14, y0 - half, 28, half * 2);

        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(${WHITE},${(0.22 + glow * 0.55).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(gx, y0 - half);
        ctx.lineTo(gx, y0 + half);
        ctx.stroke();

        pill(gx, y0 - half - 22, stages[i] || STAGES[i], glow);
      });

      // candidates
      candidates.forEach((p) => {
        const dropFade = p.dropped ? Math.max(0, 1 - p.dropT / 1.3) : 1;
        const fall = p.dropped ? p.dropT * p.dropT * 70 : 0;
        const y = y0 + p.lane * thickness(p.x) + Math.sin(time * 1.3 + p.phase) * 5 + fall;
        const edge = clamp(p.x / 60, 0, 1) * clamp((w - p.x) / 60, 0, 1);
        const alpha = dropFade * edge;
        if (alpha <= 0.01) return;

        const color = p.dropped ? WHITE : p.color;
        ctx.beginPath();
        ctx.arc(p.x, y, p.size * 3, 0, TAU);
        ctx.fillStyle = `rgba(${color},${(alpha * 0.1).toFixed(3)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, y, p.size, 0, TAU);
        ctx.fillStyle = `rgba(${color},${(alpha * (p.dropped ? 0.5 : 0.88)).toFixed(3)})`;
        ctx.fill();
      });

      // hired: spreading ring and a check badge that floats up
      rings.forEach((r) => {
        const k = r.t / 1.6;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 10 + k * 70, 0, TAU);
        ctx.strokeStyle = `rgba(${AMBER},${((1 - k) * 0.7).toFixed(3)})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      badges.forEach((b) => {
        const k = b.t / 2;
        const rise = 1 - (1 - Math.min(1, k * 1.6)) ** 3;
        const alpha = k < 0.75 ? 1 : (1 - k) / 0.25;
        const x = b.x;
        const y = b.y - rise * 46;
        const scale = 0.6 + 0.4 * Math.min(1, k * 5);

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, TAU);
        ctx.fillStyle = `rgb(${AMBER})`;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-4.5, 0.5);
        ctx.lineTo(-1.2, 4);
        ctx.lineTo(5, -3.6);
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#3a1208';
        ctx.stroke();
        ctx.restore();
      });
    };

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      setup();
      if (reduceMotion) {
        for (let i = 0; i < 360; i += 1) step(0.05);
        draw();
        return;
      }
      // warm up so the funnel is already full when the page opens
      for (let i = 0; i < 240; i += 1) step(0.05);
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    start();

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        cancelAnimationFrame(raf);
        time = 0;
        start();
      }, 150);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [stages]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
