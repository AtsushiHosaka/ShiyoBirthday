(() => {
  const stage = document.getElementById('stage');
  const group = document.getElementById('group');
  const hit = document.getElementById('hit');
  const bgLayer = document.getElementById('sparkles-bg');
  const fxLayer = document.getElementById('sparkles-fx');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLORS = ['#fff6d6', '#ffe49a', '#ffd3e2', '#ffffff'];
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

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

  function open() {
    if (stage.classList.contains('is-open')) return;
    stage.classList.add('is-open');
    hit.disabled = true;
    if (reduced) return;

    burst(0, 0.03, 10, 0.35);
    setTimeout(() => burst(0, -0.4, 14, 0.6), 1000);
    setTimeout(() => { burst(0, 0, 34, 0.95); ambient(14); }, 2450);
    setTimeout(() => burst(0, 0, 16, 0.7), 3700);
  }

  if (!reduced) ambient(12);
  hit.addEventListener('click', open);
})();
