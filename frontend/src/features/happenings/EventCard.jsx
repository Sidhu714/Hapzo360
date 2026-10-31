import { useEffect, useRef } from 'react';

/*
  Full-screen background for the Happening page: from discovery to connection.
  People flow left to right through four gates (Discover, Register, Participate,
  Connect). Along the way some bring a teammate, so the stream grows. Past the last
  gate, attendees who cross paths link up like a network, and a few earn a
  conference badge. Drawn on one canvas so it stays smooth. Purely decorative.
*/

const TAU = Math.PI * 2;
const STAGES = ['Discover', 'Register', 'Participate', 'Connect'];
const GATES_DESKTOP = [0.2, 0.4, 0.6, 0.8];
const GATES_MOBILE = [0.17, 0.39, 0.61, 0.83];

const NAVY = '17,25,47';
const CORAL = '255,85,119';
const PLUM = '165,47,97';
const CYAN = '24,150,190';
const WHITE = '255,255,255';
const DOT_COLORS = [NAVY, NAVY, NAVY, CYAN, CYAN, PLUM];

const MAX_PEOPLE = 300;
const MAX_LINKED = 70;
const LINK_DIST = 78;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

export default function EventPulse({ stages = STAGES }) {
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
    let people = [];
    let rings = [];
    let badges = [];
    let flash = [0, 0, 0, 0];
    let spawn = 0;
    let time = 0;
    let last = 0;
    let raf = 0;
    let resizeTimer = 0;

    // the route: a gentle wave across the screen
    const pathY = (x) => y0 + Math.sin((x / w) * TAU) * band * 0.25;

    // stream width at x: grows left to right, pinches slightly at every gate
    const thickness = (x) => {
      const reach = (gates[1] - gates[0]) * 0.4;
      let f = 1;
      for (let i = 0; i < gates.length; i += 1) f = Math.min(f, clamp(Math.abs(x - gates[i]) / reach, 0, 1));
      const eased = f * f * (3 - 2 * f);
      const grow = 0.4 + 0.6 * clamp(x / w, 0, 1);
      return band * grow * (0.6 + 0.4 * eased);
    };

    const personY = (p) => pathY(p.x) + p.lane * thickness(p.x) + Math.sin(time * 1.3 + p.phase) * 5;

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      small = w < 720;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      gates = (small ? GATES_MOBILE : GATES_DESKTOP).map((f) => f * w);
      y0 = h * (small ? 0.4 : 0.44);
      band = clamp(h * 0.1, 46, 108);
      people = [];
      rings = [];
      badges = [];
      flash = [0, 0, 0, 0];
      spawn = 0;
    };

    const makePerson = (x, lane) => ({
      x,
      lane,
      speed: (w / 17) * rand(0.85, 1.15),
      phase: rand(0, TAU),
      size: rand(2.2, 3.4),
      color: DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)],
      passed: 0, // gates crossed so far
    });

    const step = (dt) => {
      time += dt;

      spawn += dt * (small ? 2.2 : 3.2);
      while (spawn >= 1) {
        spawn -= 1;
        people.push(makePerson(rand(-30, -4), rand(-1, 1)));
      }

      const born = [];
      people.forEach((p) => {
        p.x += p.speed * dt;

        if (p.passed < gates.length && p.x >= gates[p.passed]) {
          const gate = p.passed;
          p.passed += 1;
          flash[gate] = 1;

          if (gate < 3) {
            // a teammate joins
            if (Math.random() < 0.5 && people.length + born.length < MAX_PEOPLE) {
              const mate = makePerson(p.x - rand(6, 18), clamp(p.lane + rand(-0.5, 0.5), -1, 1));
              mate.passed = p.passed;
              mate.speed = p.speed;
              born.push(mate);
            }
          } else {
            // connected: ring plus a conference badge for some
            p.color = CORAL;
            p.size += 1;
            if (Math.random() < 0.4) {
              const y = pathY(gates[3]);
              rings.push({ x: gates[3], y, t: 0 });
              badges.push({ x: gates[3] + 20, y: y - 8, t: 0 });
            }
          }
        }
      });
      if (born.length) people = people.concat(born);

      people = people.filter((p) => p.x < w + 30);

      rings.forEach((r) => { r.t += dt; });
      badges.forEach((b) => { b.t += dt; });
      rings = rings.filter((r) => r.t < 1.6);
      badges = badges.filter((b) => b.t < 2.2);
      flash = flash.map((f) => Math.max(0, f - dt * 1.6));
    };

    const roundRect = (x, y, width, height, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + width, y, x + width, y + height, r);
      ctx.arcTo(x + width, y + height, x, y + height, r);
      ctx.arcTo(x, y + height, x, y, r);
      ctx.arcTo(x, y, x + width, y, r);
      ctx.closePath();
    };

    const pill = (cx, cy, text, glow) => {
      ctx.font = `700 ${small ? 11 : 12}px "Plus Jakarta Sans", system-ui, sans-serif`;
      const width = ctx.measureText(text).width + 26;
      const height = small ? 23 : 26;
      roundRect(cx - width / 2, cy - height / 2, width, height, height / 2);
      ctx.fillStyle = `rgba(${WHITE},${(0.5 + glow * 0.35).toFixed(3)})`;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${NAVY},${(0.2 + glow * 0.4).toFixed(3)})`;
      ctx.stroke();

      ctx.fillStyle = `rgba(${NAVY},.85)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, cy + 0.5);
    };

    const drawNetwork = (positions) => {
      // positions: [{ x, y }] of people past the last gate
      const list = positions.slice(-MAX_LINKED);
      ctx.lineWidth = 1;
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const dx = list[i].x - list[j].x;
          const dy = list[i].y - list[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            const a = (1 - d / LINK_DIST) * 0.4 * list[i].edge * list[j].edge;
            ctx.strokeStyle = `rgba(${CYAN},${a.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(list[i].x, list[i].y);
            ctx.lineTo(list[j].x, list[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // stream outline
      ctx.save();
      ctx.setLineDash([2, 8]);
      ctx.lineDashOffset = -time * 6;
      ctx.strokeStyle = `rgba(${NAVY},.2)`;
      ctx.lineWidth = 1.2;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const y = pathY(x) + side * thickness(x);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.restore();

      // gates and stage labels
      gates.forEach((gx, i) => {
        const glow = flash[i];
        const gy = pathY(gx);
        const half = band * 1.08;

        const halo = ctx.createLinearGradient(0, gy - half, 0, gy + half);
        halo.addColorStop(0, `rgba(${CYAN},0)`);
        halo.addColorStop(0.5, `rgba(${CYAN},${(0.1 + glow * 0.3).toFixed(3)})`);
        halo.addColorStop(1, `rgba(${CYAN},0)`);
        ctx.fillStyle = halo;
        ctx.fillRect(gx - 14, gy - half, 28, half * 2);

        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(${NAVY},${(0.18 + glow * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(gx, gy - half);
        ctx.lineTo(gx, gy + half);
        ctx.stroke();

        pill(gx, gy - half - 22, stages[i] || STAGES[i], glow);
      });

      // people, and the network among those past the last gate
      const connected = [];
      people.forEach((p) => {
        const y = personY(p);
        const edge = clamp(p.x / 60, 0, 1) * clamp((w - p.x) / 60, 0, 1);
        if (edge <= 0.01) return;
        if (p.passed >= 4) connected.push({ x: p.x, y, edge });

        ctx.beginPath();
        ctx.arc(p.x, y, p.size * 3, 0, TAU);
        ctx.fillStyle = `rgba(${p.color},${(edge * 0.08).toFixed(3)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, y, p.size, 0, TAU);
        ctx.fillStyle = `rgba(${p.color},${(edge * 0.8).toFixed(3)})`;
        ctx.fill();
      });
      drawNetwork(connected);

      // connect: spreading ring
      rings.forEach((r) => {
        const k = r.t / 1.6;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 10 + k * 70, 0, TAU);
        ctx.strokeStyle = `rgba(${CYAN},${((1 - k) * 0.7).toFixed(3)})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      // conference name badge that floats up
      badges.forEach((b) => {
        const k = b.t / 2.2;
        const rise = 1 - (1 - Math.min(1, k * 1.6)) ** 3;
        const alpha = k < 0.75 ? 1 : (1 - k) / 0.25;
        const scale = 0.6 + 0.4 * Math.min(1, k * 5);

        ctx.save();
        ctx.translate(b.x, b.y - rise * 46);
        ctx.scale(scale, scale);
        ctx.globalAlpha = Math.max(0, alpha);

        // card
        roundRect(-12, -15, 24, 30, 4);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgb(${NAVY})`;
        ctx.stroke();

        // lanyard slot
        roundRect(-4, -12, 8, 3, 1.5);
        ctx.fillStyle = `rgb(${NAVY})`;
        ctx.fill();

        // photo circle and name lines
        ctx.beginPath();
        ctx.arc(0, -1, 4.2, 0, TAU);
        ctx.fillStyle = `rgb(${CORAL})`;
        ctx.fill();
        ctx.fillStyle = `rgba(${NAVY},.55)`;
        ctx.fillRect(-7, 6, 14, 2);
        ctx.fillRect(-5, 10, 10, 1.6);

        // check mark
        ctx.beginPath();
        ctx.moveTo(-1.8, -1);
        ctx.lineTo(-0.4, 0.5);
        ctx.lineTo(2, -2.4);
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#fff';
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
      // warm up so the stream is already full when the page opens
      for (let i = 0; i < 340; i += 1) step(0.05);
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