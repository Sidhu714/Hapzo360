import { useEffect, useRef } from 'react';

const EASE = '0.45 0 0.55 1;0.45 0 0.55 1';

/* Morphs a path between two shapes with identical command structure, then back. */
function Morph({ a, b, dur, begin = '0s' }) {
  return (
    <animate
      attributeName="d"
      values={`${a};${b};${a}`}
      keyTimes="0;0.5;1"
      calcMode="spline"
      keySplines={EASE}
      dur={dur}
      begin={begin}
      repeatCount="indefinite"
    />
  );
}

export default function HomeWaveBackdrop() {
  const ref = useRef(null);

  // SMIL ignores CSS, so honour reduced motion here
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ref.current?.pauseAnimations();
    }
  }, []);

  /* bottom layers: [shape A, shape B] */
  const blue = [
    'M0 690 C260 640 520 740 820 730 S1330 640 1600 610 V900 H0 Z',
    'M0 720 C300 700 540 650 820 690 S1340 740 1600 650 V900 H0 Z',
  ];
  const mint = [
    'M0 745 C280 695 560 790 860 770 S1360 705 1600 690 V900 H0 Z',
    'M0 715 C300 760 580 725 860 750 S1340 780 1600 720 V900 H0 Z',
  ];
  const green = [
    'M0 805 C300 765 600 845 900 825 S1380 775 1600 765 V900 H0 Z',
    'M0 785 C320 825 620 795 900 815 S1400 835 1600 795 V900 H0 Z',
  ];
  const crest = [
    'M0 805 C300 765 600 845 900 825 S1380 775 1600 765',
    'M0 785 C320 825 620 795 900 815 S1400 835 1600 795',
  ];

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      className="home-wave-backdrop"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="hw-green-side" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#86df62" stopOpacity="0.7" />
          <stop offset="1" stopColor="#d6f5c0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hw-blue-side" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#b9dcff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#e6f4ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hw-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4e2ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#eaf6ff" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="hw-mint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a6eb86" stopOpacity="0.5" />
          <stop offset="1" stopColor="#e6f9d9" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="hw-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fd24f" stopOpacity="0.78" />
          <stop offset="0.55" stopColor="#b3eb99" stopOpacity="0.4" />
          <stop offset="1" stopColor="#eefbe6" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="hw-crest" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* top-right sweep: blue band behind, green band in front */}
      <path d="M1040 -20 C1220 190 1440 230 1620 150 V-20 Z" fill="url(#hw-blue-side)">
        <Morph
          a="M1040 -20 C1220 190 1440 230 1620 150 V-20 Z"
          b="M1060 -20 C1250 160 1430 250 1620 175 V-20 Z"
          dur="21s"
        />
      </path>
      <path d="M960 -20 C1140 140 1400 150 1620 50 V-20 Z" fill="url(#hw-green-side)">
        <Morph
          a="M960 -20 C1140 140 1400 150 1620 50 V-20 Z"
          b="M960 -20 C1180 110 1380 190 1620 80 V-20 Z"
          dur="17s"
        />
      </path>

      {/* right-middle sheet */}
      <path d="M1600 230 C1500 340 1380 500 1180 580 C1330 610 1480 600 1600 560 Z" fill="url(#hw-blue-side)">
        <Morph
          a="M1600 230 C1500 340 1380 500 1180 580 C1330 610 1480 600 1600 560 Z"
          b="M1600 260 C1510 350 1400 490 1210 575 C1350 615 1490 595 1600 570 Z"
          dur="24s"
          begin="-6s"
        />
      </path>

      {/* left-middle wave */}
      <path d="M0 430 C140 470 260 440 360 380 C300 540 150 620 0 640 Z" fill="url(#hw-green-side)" opacity="0.8">
        <Morph
          a="M0 430 C140 470 260 440 360 380 C300 540 150 620 0 640 Z"
          b="M0 450 C150 480 250 470 380 410 C310 540 170 600 0 620 Z"
          dur="19s"
          begin="-3s"
        />
      </path>

      {/* bottom waves, back to front */}
      <path d={blue[0]} fill="url(#hw-blue)">
        <Morph a={blue[0]} b={blue[1]} dur="23s" />
      </path>
      <path d={mint[0]} fill="url(#hw-mint)">
        <Morph a={mint[0]} b={mint[1]} dur="19s" begin="-5s" />
      </path>
      <path d={green[0]} fill="url(#hw-green)">
        <Morph a={green[0]} b={green[1]} dur="15s" begin="-9s" />
      </path>

      {/* thin highlight riding the front crest */}
      <path d={crest[0]} fill="none" stroke="url(#hw-crest)" strokeWidth="2" strokeLinecap="round">
        <Morph a={crest[0]} b={crest[1]} dur="15s" begin="-9s" />
      </path>
    </svg>
  );
}