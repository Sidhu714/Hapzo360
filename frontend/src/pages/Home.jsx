import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import happeningsVideo from '../assets/happenings.mp4';
import openingsVideo from '../assets/opening.mp4';
import trendsVideo from '../assets/trend.mp4';
import './home.css';

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/*  Each scene is `svg => frame(t)`: it writes its markup once, then   */
/*  frame(seconds) is called every animation frame while on screen.    */
/* ------------------------------------------------------------------ */
const NS = 'http://www.w3.org/2000/svg';
const A = 'var(--a)';
const E = (u) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 2;
const cl = (v) => Math.min(1, Math.max(0, v));

const el = (parent, name, attrs = {}) => {
  const e = document.createElementNS(NS, name);
  Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
  parent.append(e);
  return e;
};

// isometric projection
const pj = (o, x, y, z) =>
  [o.x + (x - y) * 0.866 * o.s, o.y + (x + y) * 0.5 * o.s - z * o.s].map((v) => v.toFixed(1)).join(',');
const poly = (o, pts) => pts.map((p) => pj(o, ...p)).join(' ');

function box(o, x, y, w, d, z, h, top, left, right) {
  const T = poly(o, [[x - w, y - d, z + h], [x + w, y - d, z + h], [x + w, y + d, z + h], [x - w, y + d, z + h]]);
  const L = poly(o, [[x - w, y + d, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x - w, y + d, z]]);
  const R = poly(o, [[x + w, y - d, z + h], [x + w, y + d, z + h], [x + w, y + d, z], [x + w, y - d, z]]);
  return `<polygon points="${L}" style="fill:${left}"/><polygon points="${R}" style="fill:${right}"/><polygon points="${T}" style="fill:${top}"/>`;
}

const dot = (o, x, y, z, r, op = 1) => {
  const [a, b] = pj(o, x, y, z).split(',');
  return `<circle cx="${a}" cy="${b}" r="${r}" style="fill:${A}" opacity="${op}"/>`;
};

const ring = (o, x, y, z, r, sy = 1) => {
  const s = [];
  for (let i = 0; i < 26; i += 1) {
    const a = (i / 26) * 6.283;
    s.push(pj(o, x + Math.cos(a) * r, y + Math.sin(a) * r * sy, z));
  }
  return s.join(' ');
};

/* Stick man rig. Angles are measured from straight down, positive = forward (right). */
function Man(parent) {
  const g = el(parent, 'g', { class: 'sx-man' });
  const body = el(g, 'path');
  const head = el(g, 'circle', { r: 10 });
  const pt = (a, len, ang) => [a[0] + len * Math.sin(ang), a[1] + len * Math.cos(ang)];
  let last;
  const seg = (a, l1, t1, l2, t2) => {
    const m = pt(a, l1, t1);
    const e = pt(m, l2, t2);
    last = e;
    return `M${a[0]} ${a[1]}L${m[0]} ${m[1]}L${e[0]} ${e[1]}`;
  };
  return (x, y, q, op = 1) => {
    const lean = q.l || 0;
    const n = [x + Math.sin(lean) * 34, y - Math.cos(lean) * 34];
    let d = `M${x} ${y}L${n[0]} ${n[1]}${seg(n, 18, q.A[0], 17, q.A[1])}`;
    const hand = last;
    d += seg(n, 18, q.A[2], 17, q.A[3]) + seg([x, y], 24, q.L[0], 24, q.L[1]) + seg([x, y], 24, q.L[2], 24, q.L[3]);
    body.setAttribute('d', d);
    head.setAttribute('cx', n[0] + Math.sin(lean) * 13);
    head.setAttribute('cy', n[1] - Math.cos(lean) * 13);
    g.setAttribute('opacity', op);
    return hand;
  };
}

const walk = (w, amp = 1) => {
  const s = Math.sin(w) * amp;
  const c = Math.cos(w);
  return {
    l: 0.07,
    A: [-s * 0.55, -s * 0.55 + 0.5, s * 0.55, s * 0.55 + 0.5],
    L: [s * 0.6, s * 0.6 - 0.45 * Math.max(0, -c), -s * 0.6, -s * 0.6 - 0.45 * Math.max(0, c)],
  };
};

/* ------------------------------------------------------------------ */
/*  Scenes                                                             */
/* ------------------------------------------------------------------ */

/* Technologies: servers spread apart, data pulses travel to nodes */
const techScene = (svg) => {
  svg.innerHTML = '<g></g>';
  const g = svg.firstChild;
  return (t) => {
    const o = { x: 180, y: 196, s: 1.15 };
    const N = [[-58, 24], [62, -26], [40, 40]];
    const nb = (n) => box(o, n[0], n[1], 9, 9, 10, 9, 'var(--hi)', 'var(--lo)', 'var(--rt)');
    let h = box(o, 0, 0, 84, 52, 0, 10, 'var(--hi)', 'var(--lo)', 'var(--rt)');
    N.forEach((n) => { h += `<polyline class="sx-ln" points="${poly(o, [[0, 0, 10], [n[0], n[1], 10]])}"/>`; });
    [0, 0.5].forEach((k) => {
      const u = (t * 0.35 + k) % 1;
      h += `<polygon class="sx-a sx-nf" points="${ring(o, 0, 0, 10, 20 + u * 62, 0.62)}" opacity="${((1 - u) * 0.9).toFixed(2)}"/>`;
    });
    h += nb(N[0]);
    const lift = 0.5 - 0.5 * Math.cos(t * 1.2);
    for (let k = 0; k < 3; k += 1) {
      const z = 12 + k * (13 + lift * 16);
      h += box(o, 0, 0, 36, 36, z, 10, 'var(--hi)', 'var(--lo)', 'var(--rt)');
      for (let j = 0; j < 3; j += 1) h += dot(o, -26 + j * 8, 36, z + 5, 1.9, Math.sin(t * 5 + k * 2 + j * 1.7) > 0 ? 1 : 0.25);
      if (k === 2) h += `<polygon class="sx-nf" points="${poly(o, [[-18, -18, z + 10], [18, -18, z + 10], [18, 18, z + 10], [-18, 18, z + 10]])}"/>`;
    }
    h += nb(N[1]) + nb(N[2]);
    N.forEach((n, k) => { const u = (t * 0.45 + k * 0.33) % 1; h += dot(o, n[0] * u, n[1] * u, 10, 4); });
    for (let i = 0; i < 6; i += 1) { const u = (t * 0.45 + i / 6) % 1; h += dot(o, ((i % 3) - 1) * 14, 0, 52 + u * 70, 2.2, 1 - u); }
    g.innerHTML = h;
  };
};

/* Trends: bars rise in a wave, badge counts up */
const trendScene = (svg) => {
  svg.innerHTML = '<g></g>';
  const g = svg.firstChild;
  return (t) => {
    const o = { x: 180, y: 180, s: 1.15 };
    let h = box(o, 0, 0, 124, 52, 0, 10, 'var(--hi)', 'var(--lo)', 'var(--rt)');
    for (let i = -2; i <= 2; i += 1) h += `<polyline class="sx-gr sx-nf" points="${poly(o, [[-124, i * 20, 10], [124, i * 20, 10]])}"/>`;
    for (let i = -3; i <= 3; i += 1) h += `<polyline class="sx-gr sx-nf" points="${poly(o, [[i * 36, -52, 10], [i * 36, 52, 10]])}"/>`;
    const tops = [];
    let last = 0;
    for (let k = 0; k < 5; k += 1) {
      const sm = 0.5 - 0.5 * Math.cos(t - k * 0.55);
      const H = 16 + 88 * sm;
      const x = -84 + k * 42;
      if (k === 4) last = sm;
      h += box(o, x, 0, 13, 13, 10, H, k === 4 ? A : 'var(--hi)', 'var(--lo)', 'var(--rt)');
      tops.push([x, 0, 10 + H + 14]);
    }
    h += `<polyline class="sx-a sx-nf" stroke-dasharray="4 5" points="${poly(o, tops)}"/>`;
    const [bx, by] = pj(o, ...tops[4]).split(',').map(Number);
    h += `<g transform="translate(${bx - 31},${by - 34})"><rect width="62" height="26" rx="13" style="fill:${A}"/><text x="31" y="17.5" text-anchor="middle" class="sx-t" font-size="13" fill="#fff">+${Math.round(60 + 188 * last)}%</text></g>`;
    g.innerHTML = h;
  };
};

/* Price List: coin stacks grow and shrink, price tag ticks with the middle stack */
const priceScene = (svg) => {
  svg.innerHTML = '<g></g>';
  const g = svg.firstChild;
  return (t) => {
    const o = { x: 180, y: 190, s: 1.15 };
    let h = box(o, 0, 0, 112, 60, 0, 10, 'var(--hi)', 'var(--lo)', 'var(--rt)');
    const coin = (x, z, top) => `<polygon points="${ring(o, x, 0, z, 19)}" style="fill:var(--lo)"/><polygon points="${ring(o, x, 0, z + 5, 19)}" style="fill:${top}"/>`;
    let tag = null;
    [-62, 0, 62].forEach((x, k) => {
      const n = 2 + (0.5 + 0.5 * Math.sin(t * 0.9 + k * 2.1)) * 6;
      const full = Math.floor(n);
      for (let i = 0; i < full; i += 1) h += coin(x, 10 + i * 5, 'var(--hi)');
      const zf = 10 + full * 5 + 9 + 4 * Math.sin(t * 3 + k);
      h += coin(x, zf, A);
      if (k === 1) tag = { z: zf + 28, v: Math.round((240 + n * 95) / 5) * 5, up: Math.cos(t * 0.9 + 2.1) > 0 };
    });
    const [tx, ty] = pj(o, 0, 0, tag.z).split(',').map(Number);
    h += `<g transform="translate(${tx - 46},${ty - 13})"><rect width="92" height="27" rx="13.5" style="fill:${A}"/><text x="46" y="18.5" text-anchor="middle" class="sx-t" font-size="14" fill="#fff">${tag.up ? '▲' : '▼'} ₹${tag.v.toLocaleString('en-IN')}</text></g>`;
    g.innerHTML = h;
  };
};

/* Happenings: hackathon expo with coder, robot and presenter */
const happeningsScene = (svg) => {
  svg.innerHTML = `
    <rect x="60" y="28" width="240" height="118" rx="10" class="sx-st" style="fill:var(--hi)"/>
    <path d="M60 40a12 12 0 0 1 12-12h216a12 12 0 0 1 12 12v10H60z" style="fill:var(--rt)"/>
    <circle cx="75" cy="39" r="3.2" style="fill:var(--a)"/><circle cx="86" cy="39" r="3.2" style="fill:var(--hi)" opacity=".6"/>
    <text x="185" y="44" text-anchor="middle" font-size="12" class="sx-t" style="fill:var(--ink)">Hackathon Expo · Demo Day</text>
    <g data-k="cl"></g>
    <circle data-k="lz" r="5" style="fill:var(--a)"/><line data-k="lzl" class="sx-st" stroke-dasharray="3 5" style="stroke:var(--a)"/>
    <line x1="16" x2="344" y1="292" y2="292" class="sx-st"/>
    <g class="sx-st"><line x1="52" y1="272" x2="86" y2="272"/><line x1="69" y1="272" x2="69" y2="292"/><line x1="92" y1="258" x2="180" y2="258"/><line x1="100" y1="258" x2="100" y2="292"/><line x1="172" y1="258" x2="172" y2="292"/>
      <line x1="104" y1="256" x2="148" y2="256" stroke-width="3.4"/><line x1="148" y1="256" x2="159" y2="224" stroke-width="3.4"/><line x1="144" y1="251" x2="153" y2="228" style="stroke:var(--a)"/></g>
    <g data-k="rb"><circle cx="213" cy="284" r="7" class="sx-st" style="fill:var(--lo)"/><circle cx="237" cy="284" r="7" class="sx-st" style="fill:var(--lo)"/>
      <rect x="205" y="222" width="40" height="52" rx="9" class="sx-st" style="fill:var(--hi)"/><rect x="212" y="190" width="26" height="24" rx="7" class="sx-st" style="fill:var(--hi)"/>
      <line x1="225" y1="190" x2="225" y2="178" class="sx-st"/><circle data-k="an" cx="225" cy="175" r="4" style="fill:var(--a)"/>
      <g data-k="ey"><circle cx="219" cy="202" r="3" style="fill:var(--a)"/><circle cx="231" cy="202" r="3" style="fill:var(--a)"/></g>
      <circle data-k="gr" cx="225" cy="247" r="9" class="sx-st" stroke-width="5" stroke-dasharray="4.2 3.2"/>
      <g data-k="ra"><line x1="245" y1="236" x2="268" y2="236" class="sx-st" stroke-width="3.6"/><circle cx="271" cy="236" r="4.5" style="fill:var(--a)"/></g></g>
    <g data-k="mx"></g>
    <text class="sx-nt" style="--dx:12px" x="112" y="238">&lt;/&gt;</text><text class="sx-nt" style="--dx:-12px;animation-delay:-1.4s" x="198" y="170">{ }</text><text class="sx-nt" style="--dx:10px;animation-delay:-2.8s" x="160" y="214">01</text>`;
  const q = (k) => svg.querySelector(`[data-k="${k}"]`);
  const coder = Man(q('mx'));
  const pres = Man(q('mx'));
  const lines = [];
  const bars = [];
  for (let i = 0; i < 5; i += 1) lines.push(el(q('cl'), 'rect', { x: 76, y: 62 + i * 15, height: 7, rx: 3.5, style: `fill:${i === 1 ? A : 'var(--ink)'}`, opacity: i === 1 ? 1 : 0.7 }));
  for (let i = 0; i < 4; i += 1) bars.push(el(q('cl'), 'rect', { x: 218 + i * 20, width: 12, rx: 3, style: `fill:${i === 2 ? A : 'var(--lo)'}` }));
  return (t) => {
    lines.forEach((r, i) => r.setAttribute('width', 52 + ((i * 37) % 60) * (0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.4))));
    bars.forEach((r, i) => { const h = 12 + 54 * Math.abs(Math.sin(t * 1.4 + i * 1.1)); r.setAttribute('y', 136 - h); r.setAttribute('height', h); });
    const lx = 235 + 34 * Math.sin(t * 1.6);
    const ly = 96 + 16 * Math.sin(t * 2.3);
    q('lz').setAttribute('cx', lx); q('lz').setAttribute('cy', ly);
    const T = t * 13;
    coder(70, 268, { l: -0.05, A: [1.1 + 0.1 * Math.sin(t * 14), 1.55 + 0.15 * Math.sin(T + 1), 1 + 0.1 * Math.sin(T + 2), 1.5 + 0.15 * Math.sin(T + 3)], L: [1.57, 0.05, 1.5, 0.1] });
    const hand = pres(312, 244, { l: -0.05, A: [-2.4 + 0.06 * Math.sin(t * 2), -2.45, -0.3, -0.15], L: [0.1, 0.08, -0.15, -0.15] });
    const l = q('lzl');
    l.setAttribute('x1', hand[0]); l.setAttribute('y1', hand[1]); l.setAttribute('x2', lx); l.setAttribute('y2', ly);
    q('ra').setAttribute('transform', `rotate(${-50 * (0.5 + 0.5 * Math.sin(t * 5))} 245 236)`);
    q('gr').setAttribute('transform', `rotate(${t * 90} 225 247)`);
    q('ey').setAttribute('opacity', Math.sin(t * 1.3) > 0.93 ? 0 : 1);
    q('an').setAttribute('r', 3 + 1.8 * Math.abs(Math.sin(t * 4)));
    q('rb').setAttribute('transform', `translate(0 ${-1.5 * Math.abs(Math.sin(t * 5))})`);
  };
};

/* Openings: job seeker picks a role, shakes hands, gets hired */
const openingsScene = (svg) => {
  svg.innerHTML = `<g data-k="sc">
    <g data-k="bn"><rect x="36" y="20" width="288" height="52" rx="16" style="fill:var(--a)"/><text x="180" y="55" text-anchor="middle" font-size="24" class="sx-t" fill="#fff">We’re hiring</text></g>
    <g data-k="jc"></g><rect data-k="sel" width="94" height="68" rx="12" class="sx-st" stroke-width="3.4" style="stroke:var(--a)"/>
    <g data-k="ck"><circle r="13" style="fill:var(--a)"/><path d="M-6 0l4.5 5 8-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
    <line x1="16" x2="344" y1="290" y2="290" class="sx-st"/>
    <g data-k="m1"></g><g data-k="m2"></g>
    <g data-k="rs"><rect x="-1" y="-22" width="16" height="22" rx="2" class="sx-st" style="fill:#fff"/><path d="M3 -16h8M3 -11h8M3 -6h5" class="sx-st" stroke-width="1.4" style="stroke:var(--c-mid)"/></g>
    <g data-k="hp"><rect x="-40" y="-14" width="80" height="28" rx="14" style="fill:var(--a)"/><text y="6" text-anchor="middle" font-size="15" class="sx-t" fill="#fff">Hired!</text></g>
    <g data-k="cf"></g></g>`;
  const q = (k) => svg.querySelector(`[data-k="${k}"]`);
  const s1 = Man(q('m1'));
  const s2 = Man(q('m2'));
  ['Designer', 'Developer', 'Analyst'].forEach((name, i) => {
    const x = 36 + i * 100;
    const g = el(q('jc'), 'g');
    el(g, 'rect', { x: x + 3, y: 94, width: 88, height: 62, rx: 10, class: 'sx-st', style: 'fill:var(--hi)' });
    const tx = el(g, 'text', { x: x + 14, y: 116, 'font-size': 13, class: 'sx-t', style: 'fill:var(--ink)' });
    tx.textContent = name;
    el(g, 'rect', { x: x + 14, y: 127, width: 62 - i * 8, height: 5, rx: 2.5, style: 'fill:var(--lo)' });
    el(g, 'rect', { x: x + 14, y: 138, width: 44 + i * 6, height: 5, rx: 2.5, style: 'fill:var(--lo)' });
  });
  const cf = [];
  for (let i = 0; i < 26; i += 1) cf.push(el(q('cf'), 'rect', { width: 7, height: 4, style: `fill:${[A, '#ffc233', '#4aa3ff', '#ff5a8a'][i % 4]}`, opacity: 0 }));
  let selX = null;
  return (time) => {
    const t = time % 10;
    let x = 148;
    let y = 243;
    let pose;
    const k = cl((t - 2.6) / 0.4) * (1 - cl((t - 4.8) / 0.5));
    const sh = t > 3.2 && t < 4.8 ? Math.sin(t * 14) * 0.07 : 0;
    if (t < 2.6) {
      const u = (t - 0.2) / 2.4;
      x = -30 + 178 * E(u);
      pose = walk(t * 9, 0.35 + 0.65 * (1 - cl(u)));
    } else if (t < 5.3) {
      pose = { l: 0.05, A: [1.45 * k + sh, 1.45 * k + sh, -0.3, -0.1], L: [0.12, 0.1, -0.18, -0.2] };
    } else {
      y = 243 - 16 * Math.abs(Math.sin((t - 5.3) * 6));
      const w = 0.2 * Math.sin(t * 14);
      pose = { l: 0, A: [2.6 + w, 2.6 + w, -2.6 - w, -2.6 - w], L: [0.3, -0.1, -0.3, 0.1] };
    }
    const pose2 = t < 5.3
      ? { l: -0.05, A: [-1.45 * k - sh, -1.45 * k - sh, 0.3, 0.1], L: [-0.12, -0.1, 0.18, 0.2] }
      : { l: 0, A: [-1.2 + 0.2 * Math.sin(t * 12), -1.5 + 0.2 * Math.sin(t * 12), -1, -1.4], L: [-0.12, -0.1, 0.18, 0.2] };
    const hand = s1(x, y, pose);
    s2(222, 243, pose2);
    const rs = q('rs');
    rs.setAttribute('opacity', t < 3.2 ? 1 : 0);
    rs.setAttribute('transform', `translate(${hand[0]} ${hand[1]}) rotate(-8)`);
    const target = 36 + (t < 0.9 ? 0 : t < 1.8 ? 2 : 1) * 100;
    selX = selX === null ? target : selX + (target - selX) * 0.1;
    q('sel').setAttribute('x', selX); q('sel').setAttribute('y', 91);
    q('ck').setAttribute('transform', `translate(228 94) scale(${E((t - 3.6) / 0.4)})`);
    q('hp').setAttribute('transform', `translate(185 170) scale(${E((t - 3.5) / 0.5) * cl(1 - (t - 7.6) / 0.3)})`);
    q('bn').setAttribute('transform', `translate(0 ${2 * Math.sin(t * 2.5)})`);
    cf.forEach((r, i) => {
      const tau = t - 3.6;
      const vx = (i % 2 ? 1 : -1) * (25 + ((i * 37) % 75));
      const vy = -(90 + ((i * 53) % 110));
      r.setAttribute('opacity', tau > 0 && tau < 2.8 ? 1 - tau / 2.8 : 0);
      r.setAttribute('transform', `translate(${185 + vx * tau} ${205 + vy * tau + 130 * tau * tau}) rotate(${tau * 320 + i * 30})`);
    });
    q('sc').style.opacity = Math.min(1, t / 0.4, (10 - t) / 0.6);
  };
};

/* Render a single stable scene frame. Rebuilding several SVG scenes every animation frame,
   alongside looping videos, can freeze navigation on lower-powered graphics devices. */
function useScene(scene, stillTime) {
  const ref = useRef(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return undefined;
    const frame = scene(svg);
    frame(stillTime);
    return undefined;
  }, [scene, stillTime]);
  return ref;
}

const makeGraphic = (scene, stillTime, iso = false) =>
  function Graphic() {
    const ref = useScene(scene, stillTime);
    return <svg ref={ref} viewBox="0 0 360 330" className={`sx-svg${iso ? ' sx-iso' : ''}`} aria-hidden="true" />;
  };

const OpeningsGraphic = makeGraphic(openingsScene, 4.2);
const HappeningsGraphic = makeGraphic(happeningsScene, 1.2);
export const TrendsGraphic = makeGraphic(trendScene, 5, true);
export const PriceGraphic = makeGraphic(priceScene, 2, true);
const TechGraphic = makeGraphic(techScene, 3, true);

/* ------------------------------------------------------------------ */
/*  Card definitions                                                   */
/*  base = deep colour behind the text, mid = main colour,             */
/*  glow / mix = light blobs behind the illustration                   */
/* ------------------------------------------------------------------ */
const TONES = {
  happeningsBlue: { base: '#253C6D', mid: '#314F83', glow: '#6F91CB', mix: '#1A2F56', accent: '#C9F36A' },
  forest: { base: '#1b0a12', mid: '#c2411f', glow: '#ffb04d', mix: '#d6336c', accent: '#ffb04d' },
  sky: { base: '#052f2a', mid: '#0d8560', glow: '#34d399', mix: '#0ea5e9', accent: '#ff4f86' },
  rose: { base: '#4a0d33', mid: '#c0266b', glow: '#ff7ab6', mix: '#7c3aed', accent: '#3563ff' },
  midnightSignal: { base: '#081823', mid: '#102d42', glow: '#52d9e7', mix: '#0b2637', accent: '#c9f36a' },
};

// `id` is also used for translation keys: services.<id>.title / .desc / .cta
// If a key is missing, the English text below is shown.
// Desktop grid keeps all cards the same size, with the final two centered below.
const SERVICES = [
  { id: 'happenings', to: '/services/happenings', tone: 'happeningsBlue', title: 'Happenings', desc: 'Workshops and hiring events, happening near you.', cta: 'See what is on', Graphic: HappeningsGraphic, className: 'lg:col-span-4' },
  { id: 'openings', to: '/services/openings', tone: 'forest', title: 'Openings', desc: 'Great teams are hiring. Your next role starts here.', cta: 'View all jobs', Graphic: OpeningsGraphic, className: 'lg:col-span-4' },
  { id: 'trends', to: '/services/trends', tone: 'sky', title: 'Trends', desc: 'See what’s rising before everyone else does.', cta: 'Read the trends', Graphic: TrendsGraphic, className: 'lg:col-span-4' },
  { id: 'price-list', to: '/services/price-list', tone: 'rose', title: 'Price List', desc: 'Know the price before you make your next move.', cta: 'View prices', Graphic: PriceGraphic, className: 'service-card--wide lg:col-span-4 lg:col-start-3' },
  { id: 'technologies', to: '/services/technologies', tone: 'midnightSignal', title: 'Technologies', desc: 'Smarter technology, built to move with you.', cta: 'Explore tools', Graphic: TechGraphic, className: 'service-card--wide md:col-span-2 lg:col-span-4 lg:col-start-7' },
];

const CARD_VIDEOS = {
  happenings: happeningsVideo,
  openings: openingsVideo,
  trends: trendsVideo,
};

const translate = (t, key, fallback) => {
  const value = t(key);
  return typeof value === 'string' && value && value !== key ? value : fallback;
};

// moves the soft spotlight with the cursor (no re-render)
const spotlight = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

export default function ServiceGrid() {
  const { t } = useLanguage();

  return (
    <div className="home-page relative isolate min-h-screen overflow-hidden">
    <div className="relative z-10 mx-auto grid w-full max-w-[1512px] grid-cols-1 gap-7 px-5 py-8 sm:grid-cols-2 sm:gap-8 sm:px-8 sm:py-10 lg:grid-cols-12 lg:gap-9 xl:gap-10 xl:px-12 xl:py-12">
      {SERVICES.map((service, index) => {
        const tone = TONES[service.tone];
        const Graphic = service.Graphic;

        return (
          <Link
            key={service.id}
            to={service.to}
            onPointerMove={spotlight}
            style={{
              '--i': index,
              '--card-ink': '#ffffff',
              '--c-base': tone.base,
              '--c-mid': tone.mid,
              '--c-glow': tone.glow,
              '--c-mix': tone.mix,
              '--art-accent': tone.accent,
            }}
            className={`service-card service-card--${service.id} group relative flex min-h-[330px] flex-col overflow-hidden rounded-[24px] p-5 text-white outline-none focus-visible:ring-4 focus-visible:ring-white/60 motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-1.5 md:min-h-[350px] md:p-5 lg:min-h-[370px] ${service.className ?? ''}`}
          >
            {CARD_VIDEOS[service.id] && (
              <video
                className="service-card-background-video"
                src={CARD_VIDEOS[service.id]}
                autoPlay={service.id === 'happenings'}
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
              />
            )}

            <div className="service-card-copy relative z-10">
              <span className="service-chip">
                {translate(t, `services.${service.id}.title`, service.title)}
              </span>
              <h3 className="service-card-description mt-3">
                {translate(t, `services.${service.id}.desc`, service.desc)}
              </h3>
            </div>

            {/* Do not mount illustrations underneath video cards: they still consume CPU even when hidden. */}
            {!CARD_VIDEOS[service.id] && (
              <div aria-hidden="true" className={`service-art service-art--${service.id}`}>
                <Graphic />
              </div>
            )}

            <div className="relative z-10 mt-auto flex items-center justify-between pt-6 text-base font-extrabold">
              {translate(t, `services.${service.id}.cta`, service.cta)}
              <span
                style={{ backgroundColor: tone.accent, color: '#fff' }}
                className="service-card-arrow grid h-11 w-11 place-items-center rounded-full motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:translate-x-1 motion-safe:group-hover:-translate-y-1"
              >
                <ArrowUpRight size={19} />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
    </div>
  );
}
