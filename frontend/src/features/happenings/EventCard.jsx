import { useEffect, useRef } from 'react';

/*
  Full-screen background for the Happenings page.
  Attendees drift between event "zones" (meetup, tech meetup, expo, conference,
  hackathon). Inside a zone they connect to each other, a host dot pulses at the
  centre, and rings spread out as a zone fills up. Drawn on one canvas, so it stays
  smooth. Purely decorative: it shows no real data.
*/

const TAU = Math.PI * 2;
const LINK = 78; // how close two people must be to connect (px)

// [label, x, y] as fractions of the screen
const DESKTOP = [
  ['Meetup', 0.09, 0.66],
  ['Tech meetup', 0.3, 0.88],
  ['Expo', 0.57, 0.8],
  ['Conference', 0.84, 0.72],
  ['Hackathon', 0.93, 0.3],
];
const MOBILE = [
  ['Meetup', 0.22, 0.2],
  ['Tech meetup', 0.78, 0.36],
  ['Expo', 0.24, 0.58],
  ['Conference', 0.76, 0.76],
  ['Hackathon', 0.42, 0.92],
];

const NAVY = '17,25,47';
const CORAL = '255,85,119';
const TEAL = '14,165,201';
const PEOPLE_COLORS = [NAVY, NAVY, NAVY, CORAL, CORAL, TEAL];

export default function EventCrowd() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let zones = [];
    let people = [];
    let raf = 0;
    let last = 0;
    let time = 0;
    let resizeTimer = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    const spotIn = (zone) => {
      const angle = Math.random() * TAU;
      const distance = Math.sqrt(Math.random()) * zone.r * 0.85;
      return { x: zone.x + Math.cos(angle) * distance, y: zone.y + Math.sin(angle) * distance };
    };

    const newTarget = (person) => {
      person.target = person.zone < 0 ? { x: rand(0, w), y: rand(0, h) } : spotIn(zones[person.zone]);
    };

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const layout = w < 720 ? MOBILE : DESKTOP;
      const radius = Math.max(52, Math.min(128, Math.min(w, h) * (w < 720 ? 0.17 : 0.12)));
      zones = layout.map(([label, fx, fy]) => ({ label, x: fx * w, y: fy * h, r: radius }));

      const count = Math.round(Math.min(90, Math.max(30, (w * h) / 16000)));
      people = Array.from({ length: count }, () => {
        const zone = Math.random() < 0.2 ? -1 : Math.floor(Math.random() * zones.length);
        const person = {
          x: rand(0, w),
          y: rand(0, h),
          vx: 0,
          vy: 0,
          zone,
          speed: rand(22, 44),
          size: rand(2.3, 3.6),
          color: PEOPLE_COLORS[Math.floor(Math.random() * PEOPLE_COLORS.length)],
          switchIn: rand(2, 14),
          target: null,
        };
        newTarget(person);
        return person;
      });
    };

    const step = (dt) => {
      time += dt;

      people.forEach((p) => {
        p.switchIn -= dt;
        if (p.switchIn <= 0) {
          p.zone = Math.random() < 0.22 ? -1 : Math.floor(Math.random() * zones.length);
          p.switchIn = rand(7, 16);
          newTarget(p);
        }

        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 12) newTarget(p);

        const speed = p.speed * Math.min(1, Math.max(0.28, dist / 90));
        const ease = Math.min(1, dt * 1.6);
        p.vx += ((dx / dist) * speed - p.vx) * ease;
        p.vy += ((dy / dist) * speed - p.vy) * ease;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      });
    };

    const pill = (cx, cy, text) => {
      ctx.font = '700 12px "Plus Jakarta Sans", system-ui, sans-serif';
      const width = ctx.measureText(text).width + 38;
      const height = 25;
      const x = cx - width / 2;
      const y = cy - height / 2;

      ctx.beginPath();
      ctx.moveTo(x + height / 2, y);
      ctx.arcTo(x + width, y, x + width, y + height, height / 2);
      ctx.arcTo(x + width, y + height, x, y + height, height / 2);
      ctx.arcTo(x, y + height, x, y, height / 2);
      ctx.arcTo(x, y, x + width, y, height / 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x + 13, cy, 3.2, 0, TAU);
      ctx.fillStyle = `rgba(${CORAL},1)`;
      ctx.fill();

      ctx.fillStyle = `rgba(${NAVY},.88)`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x + 23, cy + 0.5);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      const counts = zones.map(() => 0);
      people.forEach((p) => {
        if (p.zone >= 0 && Math.hypot(p.x - zones[p.zone].x, p.y - zones[p.zone].y) < zones[p.zone].r * 1.1) counts[p.zone] += 1;
      });

      // zones: soft glow, slowly turning dashed ring, ring that spreads as the zone fills
      zones.forEach((z, i) => {
        const glow = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r * 1.25);
        glow.addColorStop(0, `rgba(${CORAL},.16)`);
        glow.addColorStop(1, `rgba(${CORAL},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 1.25, 0, TAU);
        ctx.fill();

        ctx.save();
        ctx.setLineDash([3, 9]);
        ctx.lineDashOffset = -time * 9;
        ctx.strokeStyle = `rgba(${NAVY},.3)`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, TAU);
        ctx.stroke();
        ctx.restore();

        const phase = (time * 0.22 + i * 0.31) % 1;
        ctx.strokeStyle = `rgba(${CORAL},${((1 - phase) * 0.4 * Math.min(1, counts[i] / 5)).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * (1 + phase * 0.45), 0, TAU);
        ctx.stroke();
      });

      // people who are close to each other connect
      ctx.lineWidth = 1;
      for (let i = 0; i < people.length; i += 1) {
        for (let j = i + 1; j < people.length; j += 1) {
          const a = people[i];
          const b = people[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const strength = 1 - Math.sqrt(d2) / LINK;
            ctx.strokeStyle = `rgba(${NAVY},${(strength * 0.3).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      people.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fillStyle = `rgba(${p.color},${p.color === NAVY ? 0.6 : 0.9})`;
        ctx.fill();
      });

      // host dot and label for each zone
      zones.forEach((z, i) => {
        const hx = z.x + Math.cos(time * 0.4 + i) * 7;
        const hy = z.y + Math.sin(time * 0.5 + i * 2) * 7;
        const beat = 0.5 + 0.5 * Math.sin(time * 2.4 + i);

        ctx.beginPath();
        ctx.arc(hx, hy, 9 + beat * 6, 0, TAU);
        ctx.fillStyle = `rgba(${CORAL},${(0.22 - beat * 0.12).toFixed(3)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(hx, hy, 6.5, 0, TAU);
        ctx.fillStyle = `rgba(${CORAL},1)`;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,.95)';
        ctx.stroke();

        pill(z.x, z.y - z.r - 18, z.label);
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
        for (let i = 0; i < 160; i += 1) step(0.05);
        draw();
        return;
      }
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    start();

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        cancelAnimationFrame(raf);
        start();
      }, 150);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}