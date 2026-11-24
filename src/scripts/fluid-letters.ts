/*
 * Fluid letters
 * -------------
 * Letters inside a [data-fluid] element run away from the cursor
 * sideways: those left of it slide left, those right of it slide right,
 * the nearest ones the most. Each letter rides on its own spring, so it
 * overshoots a little and wobbles before settling, and it squashes and
 * stretches with its speed (wider and flatter while moving, volume kept).
 *
 * With { silver: true } the letters are also painted as liquid silver:
 * a chrome gradient whose horizon line ripples slowly across the word,
 * sloshes when a letter moves, a sheen that sweeps across now and then,
 * and a soft reflection that follows the cursor. That part keeps running
 * (only while the element is on screen) so the metal never looks frozen.
 *
 * Markup: wrap every visible character in <span class="fluid-letter">.
 */

type Options = {
  /** Furthest a letter is pushed, in em */
  push?: number;
  /** How far sideways the cursor reaches, in em */
  reach?: number;
  /** How far up/down the cursor reaches, in em (keeps other lines still) */
  reachY?: number;
  /** Spring: higher = snappier */
  stiffness?: number;
  /** Spring: lower = more wobble before it settles */
  damping?: number;
  /** Stretch per em/s of speed */
  squish?: number;
  /** Never wider than 1 + this */
  maxSquish?: number;
  /** Paint the letters as liquid silver */
  silver?: boolean;
};

const STEP = 1 / 120; // physics step, keeps the springs stable

export function fluidLetters(root: HTMLElement, options: Options = {}) {
  if (root.dataset.fluidReady === "true") return;
  root.dataset.fluidReady = "true";

  const {
    push = 0.4,
    reach = 0.9,
    reachY = 0.6,
    stiffness = 160,
    damping = 13,
    squish = 0.035,
    maxSquish = 0.154,
    silver = false,
  } = options;

  const letters = [...root.querySelectorAll<HTMLElement>(".fluid-letter")];
  const count = letters.length;
  if (!count) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const offset = new Float64Array(count);
  const velocity = new Float64Array(count);
  const target = new Float64Array(count);

  // Resting centres of the letters, relative to the root's box
  let restX: number[] = [];
  let restY: number[] = [];
  let fontSize = 16;

  function measure() {
    const box = root.getBoundingClientRect();
    fontSize = parseFloat(getComputedStyle(root).fontSize) || 16;
    restX = [];
    restY = [];
    letters.forEach((letter, i) => {
      const r = letter.getBoundingClientRect();
      restX.push(r.left + r.width / 2 - offset[i] - box.left);
      restY.push(r.top + r.height / 2 - box.top);
    });
    if (silver) measureSilver(box);
  }

  /* ---------- Liquid silver paint ---------- */

  let wordWidth = 0;
  let glow = 0; // fades the cursor reflection in and out
  let glowTarget = 0;

  function measureSilver(box: DOMRect) {
    const first = letters[0].getBoundingClientRect();
    const last = letters[count - 1].getBoundingClientRect();
    const left = first.left - offset[0];
    wordWidth = last.right - offset[count - 1] - left;
    root.style.setProperty("--ww", `${wordWidth}px`);
    root.style.setProperty("--hh", `${first.height}px`);
    letters.forEach((letter, i) => {
      const r = letter.getBoundingClientRect();
      letter.style.setProperty("--bx", `${r.left - offset[i] - left}px`);
    });
    root.style.setProperty("--word-left", `${left - box.left}px`);
  }

  function paintSilver(time: number) {
    const t = time / 1000;

    // Sheen sweeps across the word every ~7s, then rests off-word
    const cycle = (t % 7) / 7;
    const sweep = Math.min(1, cycle / 0.35); // first 35% of the cycle
    const eased = 1 - Math.pow(1 - sweep, 3);
    const sheenX = -0.6 * wordWidth + eased * 2.2 * wordWidth; // band position in word space
    root.style.setProperty("--sheen", `${sheenX - 1.5 * wordWidth}px`);

    glow += (glowTarget - glow) * 0.08;
    root.style.setProperty("--glow-a", glow.toFixed(3));

    for (let i = 0; i < count; i++) {
      // Horizon ripples across the word like a slow liquid surface
      const wave = Math.sin(t * 1.15 - i * 0.65) * 0.05 + Math.sin(t * 0.55 + i * 1.3) * 0.025;
      // ...and sloshes against the direction the letter moves
      const speed = velocity[i] / fontSize;
      const slosh = Math.max(-0.16, Math.min(0.16, speed * 0.02));
      letters[i].style.setProperty("--hy", `${(wave + Math.abs(slosh) * 0.6).toFixed(4)}`);
      letters[i].style.setProperty("--tilt", `${(-slosh * 70).toFixed(2)}deg`);
    }
  }

  /* ---------- Cursor ---------- */

  let pointer: { x: number; y: number } | null = null;

  function computeTargets() {
    target.fill(0);
    glowTarget = 0;
    if (!pointer) return;

    const box = root.getBoundingClientRect();
    const px = pointer.x - box.left;
    const py = pointer.y - box.top;
    const sx = reach * fontSize;
    const sy = reachY * fontSize;
    const max = push * fontSize;

    for (let i = 0; i < count; i++) {
      const dx = restX[i] - px;
      const dy = restY[i] - py;
      const falloff = Math.exp(-(dx * dx) / (2 * sx * sx) - (dy * dy) / (2 * sy * sy));
      // Smooth sign: letters on either side of the cursor flee that way
      target[i] = max * Math.tanh(dx / (0.18 * fontSize)) * falloff;
    }

    if (silver) {
      const near =
        py > -fontSize && py < box.height + fontSize && px > -fontSize && px < box.width + fontSize;
      glowTarget = near ? 1 : 0;
      const wordLeft = parseFloat(root.style.getPropertyValue("--word-left")) || 0;
      root.style.setProperty("--mx", `${px - wordLeft}px`);
      root.style.setProperty("--my", `${py}px`);
    }
  }

  /* ---------- Loop ---------- */

  let frame = 0;
  let lastTime = 0;
  let visible = true;

  function tick(time: number) {
    let dt = Math.min(0.05, (time - lastTime) / 1000 || 1 / 60);
    lastTime = time;
    let moving = false;

    while (dt > 0) {
      const h = Math.min(STEP, dt);
      dt -= h;
      for (let i = 0; i < count; i++) {
        const force = stiffness * (target[i] - offset[i]) - damping * velocity[i];
        velocity[i] += force * h;
        offset[i] += velocity[i] * h;
      }
    }

    for (let i = 0; i < count; i++) {
      if (Math.abs(target[i] - offset[i]) < 0.05 && Math.abs(velocity[i]) < 0.5) {
        offset[i] = target[i];
        velocity[i] = 0;
      } else {
        moving = true;
      }

      const stretch = Math.min(maxSquish, (Math.abs(velocity[i]) / fontSize) * squish);
      const scaleX = 1 + stretch;
      const scaleY = 1 / scaleX; // keep the letter's volume

      letters[i].style.transform =
        offset[i] || stretch
          ? `translate3d(${offset[i].toFixed(2)}px, 0, 0) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`
          : "";
    }

    if (silver) paintSilver(time);

    // Silver keeps flowing while on screen; plain letters stop when still
    const keepGoing = silver ? visible : moving;
    frame = keepGoing ? requestAnimationFrame(tick) : 0;
  }

  function start() {
    if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  /* ---------- Wiring ---------- */

  measure();
  document.fonts?.ready.then(measure);
  window.addEventListener("resize", measure, { passive: true });

  if (reduced) {
    // Static silver, no motion
    if (silver) paintSilver(0);
    return;
  }

  if (canHover) {
    window.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        pointer = { x: event.clientX, y: event.clientY };
        computeTargets();
        start();
      },
      { passive: true }
    );

    document.documentElement.addEventListener("pointerleave", () => {
      pointer = null;
      computeTargets();
      start();
    });

    // The letters move under a still cursor while scrolling
    window.addEventListener(
      "scroll",
      () => {
        if (!pointer) return;
        computeTargets();
        start();
      },
      { passive: true }
    );
  }

  if (silver) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }).observe(root);
    start();
  }
}
