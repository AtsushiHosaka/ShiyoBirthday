(() => {
  const stage = document.getElementById('stage');
  const group = document.getElementById('group');
  const floatEl = document.getElementById('float');
  const hit = document.getElementById('hit');
  const bgLayer = document.getElementById('sparkles-bg');
  const fxLayer = document.getElementById('sparkles-fx');
  const shardLayer = document.getElementById('shards');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLORS = ['#fff6d6', '#ffe49a', '#ffd3e2', '#ffffff'];
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const vibrate = (pattern) => { if (!reduced && navigator.vibrate) navigator.vibrate(pattern); };

  /* ---------- キラキラ ---------- */

  function sparkle(layer, kind, vars, x, y) {
    const el = document.createElement('i');
    el.className = `sparkle ${kind}`;
    el.style.left = x;
    el.style.top = y;
    for (const [key, value] of Object.entries(vars)) el.style.setProperty(key, value);
    if (kind === 'burst') el.addEventListener('animationend', () => el.remove(), { once: true });
    layer.append(el);
  }

  function ambient(count) {
    for (let i = 0; i < count; i++) {
      sparkle(bgLayer, 'twinkle', {
        '--s': `${rand(5, 14)}px`,
        '--c': pick(COLORS),
        '--d': `${rand(2.2, 4.2)}s`,
        '--delay': `${rand(0, 4)}s`,
      }, `${rand(6, 94)}%`, `${rand(6, 94)}%`);
    }
  }

  function burst(dx, dy, count, spread) {
    const rect = group.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2 + dy * rect.width;
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const dist = rand(0.35, 1) * spread * rect.width;
      sparkle(fxLayer, 'burst', {
        '--s': `${rand(6, 16)}px`,
        '--c': pick(COLORS),
        '--d': `${rand(1.2, 2.2)}s`,
        '--delay': `${rand(0, 0.35)}s`,
        '--dx': `${Math.cos(angle) * dist}px`,
        '--dy': `${Math.sin(angle) * dist - rand(10, 40)}px`,
      }, `${x + dx * rect.width}px`, `${y}px`);
    }
  }

  /* ---------- 紙片 ---------- */

  const PAPER = ['#fffdf8', '#efe3d2'];
  const FLAP = ['#b5d6cb', '#7fada0'];
  const MINT = {
    inside: ['#9ec7bb', '#6f9d91'],
    left: ['#e8f1e5', '#cbddcb'],
    right: ['#eef5ec', '#d3e3d2'],
    bottom: ['#edf5ea', '#d9e8d6'],
  };

  function envelopeTone(x, y, w) {
    const u = x / w;
    const v = y / (w * 0.68);
    if (v < 0.55 * (1 - Math.abs(2 * u - 1))) return MINT.inside;
    if (v > 1 - 0.9 * Math.min(u, 1 - u)) return MINT.bottom;
    return u < 0.5 ? MINT.left : MINT.right;
  }

  // 長方形を揺らしたグリッドで割り、辺をギザギザにした三角形の紙片にする
  function tessellate(x, y, w, h, cols, rows) {
    const idx = (c, r) => r * (cols + 1) + c;
    const points = [];
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        points.push([
          x + (w * c) / cols + (c > 0 && c < cols ? rand(-0.32, 0.32) * (w / cols) : 0),
          y + (h * r) / rows + (r > 0 && r < rows ? rand(-0.32, 0.32) * (h / rows) : 0),
        ]);
      }
    }

    const mids = new Map();
    const onBoundary = (i, j) => {
      const ci = i % (cols + 1), ri = Math.floor(i / (cols + 1));
      const cj = j % (cols + 1), rj = Math.floor(j / (cols + 1));
      return (ci === cj && (ci === 0 || ci === cols)) || (ri === rj && (ri === 0 || ri === rows));
    };
    const mid = (i, j) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!mids.has(key)) {
        const [ax, ay] = points[i];
        const [bx, by] = points[j];
        const k = onBoundary(i, j) ? 0 : rand(-0.12, 0.12);
        mids.set(key, [(ax + bx) / 2 - (by - ay) * k, (ay + by) / 2 + (bx - ax) * k]);
      }
      return mids.get(key);
    };
    const poly = (i, j, k) => [points[i], mid(i, j), points[j], mid(j, k), points[k], mid(k, i)];

    const polys = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = idx(c, r), b = idx(c + 1, r), d = idx(c, r + 1), e = idx(c + 1, r + 1);
        if (Math.random() < 0.5) polys.push(poly(a, b, e), poly(a, e, d));
        else polys.push(poly(a, b, d), poly(b, e, d));
      }
    }
    return polys;
  }

  function tear() {
    const w = group.offsetWidth;
    const transform = getComputedStyle(floatEl).transform;
    const m = new DOMMatrix(transform === 'none' ? undefined : transform);
    const ox = (stage.clientWidth - w) / 2 + m.e;
    const oy = (stage.clientHeight - w * 0.68) / 2 + m.f;
    const cx = w * 0.5;
    const cy = -w * 0.05;
    const farthest = Math.hypot(w * 0.6, w * 0.75);
    const fragment = document.createDocumentFragment();

    function addShard(poly, tone) {
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const vx = (minX + maxX) / 2 - cx;
      const vy = (minY + maxY) / 2 - cy;
      const len = Math.hypot(vx, vy) || 1;
      const force = rand(0.5, 1.2) * w;

      const el = document.createElement('i');
      el.className = 'shard';
      el.style.left = `${ox + minX}px`;
      el.style.top = `${oy + minY}px`;
      el.style.width = `${maxX - minX}px`;
      el.style.height = `${maxY - minY}px`;
      el.style.clipPath = `polygon(${poly.map(([px, py]) => `${px - minX}px ${py - minY}px`).join(',')})`;
      el.style.background = `linear-gradient(${rand(0, 360)}deg, ${tone[0]}, ${tone[1]})`;
      el.style.setProperty('--dx', `${(vx / len) * force}px`);
      el.style.setProperty('--dy', `${(vy / len) * force * 0.8}px`);
      el.style.setProperty('--lift', `${rand(0.15, 0.45) * w}px`);
      el.style.setProperty('--fall', `${innerHeight * rand(0.9, 1.4)}px`);
      el.style.setProperty('--rot', `${rand(-540, 540)}deg`);
      el.style.setProperty('--rx', `${rand(-300, 300)}deg`);
      el.style.setProperty('--ry', `${rand(-300, 300)}deg`);
      el.style.setProperty('--t', `${rand(1.5, 2.4)}s`);
      el.style.setProperty('--d', `${(len / farthest) * 0.25 + rand(0, 0.05)}s`);
      fragment.append(el);
    }

    // 奥の紙片から順に積む（開いたフラップ → 封筒 → 手紙）
    const flap = [[0, 0], [w, 0], [w * 0.5, -w * 0.374]];
    const hub = [w * 0.5, -w * 0.12];
    for (let i = 0; i < 3; i++) addShard([flap[i], flap[(i + 1) % 3], hub], FLAP);

    for (const poly of tessellate(0, 0, w, w * 0.68, 4, 3)) {
      const gx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
      const gy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
      addShard(poly, envelopeTone(gx, gy, w));
    }

    for (const poly of tessellate(w * 0.05, -w * 0.7, w * 0.9, w * 0.6, 3, 4)) addShard(poly, PAPER);

    shardLayer.append(fragment);
    stage.classList.add('torn');

    vibrate([400, 60, 80, 40, 80, 40, 80]);
    setTimeout(() => vibrate(200), 800);
    setTimeout(() => vibrate([150, 60, 500]), 4900);
  }

  /* ---------- シーケンス ---------- */

  function alarm() {
    stage.classList.add('alert');
    vibrate([250, 90, 250, 90, 250, 90, 250, 90, 250, 90, 250]);
  }

  function open() {
    if (stage.classList.contains('is-open')) return;
    stage.classList.add('is-open');
    hit.disabled = true;

    if (reduced) {
      stage.classList.add('alert', 'torn');
      return;
    }

    burst(0, 0.03, 10, 0.35);
    setTimeout(() => burst(0, -0.4, 14, 0.6), 1000);
    setTimeout(alarm, 3400);
    setTimeout(tear, 5800);
  }

  if (!reduced) ambient(12);
  hit.addEventListener('click', open);
})();
