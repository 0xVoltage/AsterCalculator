// --- Helpers ---------------------------------------------------------------
const fmtEN = new Intl.NumberFormat('en-US');
const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const fmt2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 });
const hasAnime = typeof window !== 'undefined' && typeof window.anime === 'function';

// Parse price like "1,234.56" or "1.234,56" or "1234.56" or "2"
function parsePrice(v) {
  let s = String(v ?? '').trim();
  if (!s) return 0;
  s = s.replace(/[^0-9.,-]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    const dec = lastComma > lastDot ? ',' : '.';
    if (dec === ',') s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma > -1) {
    // Treat comma as decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Only dots or none: treat commas as thousands
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Parse number allowing thousand/decimal in either style
function parseNumberFlexible(v) { return parsePrice(v); }

// Parse integer-only (for RH Points)
function parseIntOnly(v) {
  const s = String(v ?? '').replace(/[^0-9]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Animated counters using anime.js
function animateCount(el, to, opts = {}) {
  const from = Number(el.dataset.value || '0');
  const duration = opts.duration ?? 700;
  const easing = opts.easing ?? 'easeOutQuad';
  if (hasAnime) {
    anime({
      targets: { val: from },
      val: to,
      duration,
      easing,
      update: (a) => {
        const val = a.animations[0].currentValue;
        el.dataset.value = val;
        if (opts.format === 'usd') el.textContent = fmt2.format(val);
        else el.textContent = fmtEN.format(Math.round(val));
      }
    });
  } else {
    el.dataset.value = to;
    if (opts.format === 'usd') el.textContent = fmt2.format(to);
    else el.textContent = fmtEN.format(Math.round(to));
  }
}

// --- Gate (popup) ----------------------------------------------------------
const gate = document.getElementById('gate');
const cta = document.getElementById('cta-join');
const skip = document.getElementById('cta-skip');

if (gate && cta) {
  // Show by default, every visit
  if (hasAnime) {
    anime({ targets: gate.querySelector('div'), scale: [0.96, 1], opacity: [0, 1], duration: 420, easing: 'easeOutQuad' });
  } else {
    gate.removeAttribute('hidden');
  }

  function releaseSite() {
    if (hasAnime) {
      anime({ targets: gate, opacity: [1, 0], duration: 260, easing: 'easeOutQuad', complete: () => gate.setAttribute('hidden', '') });
    } else {
      gate.setAttribute('hidden', '');
    }
  }
  cta.addEventListener('click', () => {
    // Also ensure release happens even if popup link is blocked
    setTimeout(releaseSite, 50);
  });
  if (skip) {
    skip.addEventListener('click', (e) => {
      e.preventDefault();
      releaseSite();
    });
  }
}

// --- Calculator ------------------------------------------------------------
const TOKENS_TOTAL = 320_000_000; // 320M tokens
const TOKENS_PER_EPOCH = 80_000_000; // for 1% per epoch mode

const el = {
  myPoints: document.getElementById('myPoints'),
  myShare: document.getElementById('myShare'),
  e1: document.getElementById('e1'),
  e2: document.getElementById('e2'),
  e3: document.getElementById('e3'),
  e4: document.getElementById('e4'),
  price: document.getElementById('price'),
  mode: {
    btnTotal: document.getElementById('btnTypeTotal'),
    btnEpoch: document.getElementById('btnTypeEpoch'),
    pointsWrap: document.getElementById('pointsWrap'),
    shareWrap: document.getElementById('shareWrap'),
    epochFields: Array.from(document.querySelectorAll('.epoch-field')),
    epochsNote: document.getElementById('epochsNote'),
  },
  out: {
    tokens: document.getElementById('tokensOut'),
    usd: document.getElementById('usdOut'),
    totalPoints: document.getElementById('totalPointsOut'),
    myPoints: document.getElementById('myPointsOut'),
    price: document.getElementById('priceOut'),
    type: document.getElementById('typeOut'),
    formula: document.getElementById('formulaText'),
    share: document.getElementById('shareOut'),
    totalPointsBox: document.getElementById('totalPointsBox'),
    myPointsBox: document.getElementById('myPointsBox'),
    shareBox: document.getElementById('shareBox'),
  }
};

let calcMode = 'total'; // 'total' | 'epoch'

function setMode(mode) {
  calcMode = mode;
  const { btnTotal, btnEpoch, pointsWrap, shareWrap } = el.mode;
  if (!btnTotal || !btnEpoch || !pointsWrap || !shareWrap) return;
  if (mode === 'total') {
    btnTotal.classList.add('active');
    btnEpoch.classList.remove('active');
    pointsWrap.classList.remove('hidden');
    shareWrap.classList.add('hidden');
    el.out.type && (el.out.type.textContent = '4% (TOTAL)');
    el.mode.epochFields.forEach((n) => n.classList.remove('hidden'));
    el.mode.epochsNote && el.mode.epochsNote.classList.remove('hidden');
    if (el.out.formula) el.out.formula.textContent = 'Formula: 320,000,000 tokens × (My RH Points / Total points across all 4 Epochs)';
    if (el.out.totalPointsBox) el.out.totalPointsBox.classList.remove('hidden');
    if (el.out.myPointsBox) el.out.myPointsBox.classList.remove('hidden');
    if (el.out.shareBox) el.out.shareBox.classList.add('hidden');
  } else {
    btnEpoch.classList.add('active');
    btnTotal.classList.remove('active');
    pointsWrap.classList.add('hidden');
    shareWrap.classList.remove('hidden');
    el.out.type && (el.out.type.textContent = '1% per EPOCH');
    el.mode.epochFields.forEach((n) => n.classList.add('hidden'));
    el.mode.epochsNote && el.mode.epochsNote.classList.add('hidden');
    if (el.out.formula) el.out.formula.textContent = 'Formula: 80,000,000 tokens × (Current Share % / 100)';
    if (el.out.totalPointsBox) el.out.totalPointsBox.classList.add('hidden');
    if (el.out.myPointsBox) el.out.myPointsBox.classList.add('hidden');
    if (el.out.shareBox) el.out.shareBox.classList.remove('hidden');
  }
  calc();
}

function calc() {
  const price = Math.max(0, parsePrice(el.price.value));

  let tokens = 0;
  if (calcMode === 'total') {
    const myPoints = Math.max(0, parseIntOnly(el.myPoints.value));
    const e1 = Math.max(0, Number(el.e1.value) || 0) * 1e9; // billions
    const e2 = Math.max(0, Number(el.e2.value) || 0) * 1e9;
    const e3 = Math.max(0, Number(el.e3.value) || 0) * 1e9;
    const e4 = Math.max(0, Number(el.e4.value) || 0) * 1e9;
    const totalPoints = e1 + e2 + e3 + e4;
    const share = totalPoints > 0 ? myPoints / totalPoints : 0;
    tokens = TOKENS_TOTAL * share;
    // outputs aux
    el.out.totalPoints.textContent = fmtEN.format(Math.round(totalPoints));
    el.out.myPoints.textContent = fmtEN.format(Math.round(myPoints));
  } else {
    const pct = Math.max(0, parseNumberFlexible(el.myShare.value)); // e.g., 0.00148686
    tokens = TOKENS_PER_EPOCH * (pct / 100);
    if (el.out.share) el.out.share.textContent = `${fmtPct.format(pct)}%`;
  }

  const usd = tokens * price;

  // outputs
  animateCount(el.out.tokens, tokens, { duration: 500 });
  animateCount(el.out.usd, usd, { duration: 600 });
  el.out.price.textContent = fmtUSD.format(price);
}

// Live bindings with light debounce to avoid jank while typing
function debounce(fn, wait = 100) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; }
const scheduleCalc = debounce(calc, 120);

// Events for inputs depending on mode
if (el.myPoints) {
  el.myPoints.addEventListener('input', () => { formatIntegerThousands(el.myPoints); scheduleCalc(); });
  el.myPoints.addEventListener('change', () => { formatIntegerThousands(el.myPoints); scheduleCalc(); });
}
if (el.myShare) {
  el.myShare.addEventListener('input', scheduleCalc);
  el.myShare.addEventListener('change', scheduleCalc);
}
['input','change','keyup'].forEach((ev) => {
  if (el.e3) el.e3.addEventListener(ev, scheduleCalc);
  if (el.e4) el.e4.addEventListener(ev, scheduleCalc);
  if (el.price) el.price.addEventListener(ev, scheduleCalc);
});

// Mode toggles
if (el.mode.btnTotal && el.mode.btnEpoch) {
  el.mode.btnTotal.addEventListener('click', () => setMode('total'));
  el.mode.btnEpoch.addEventListener('click', () => setMode('epoch'));
}

// Initial
window.addEventListener('DOMContentLoaded', () => {
  // default mode: total
  setMode('total');
  formatIntegerThousands(el.myPoints);
  calc();
});

// Format integer-only with thousand separators, preserving caret where possible
function formatIntegerThousands(input) {
  const prev = String(input.value || '');
  const selectionStart = input.selectionStart ?? prev.length;
  const fromEnd = prev.length - selectionStart;
  const digits = prev.replace(/\D/g, '');
  if (!digits) { input.value = ''; return; }
  const formatted = Number(digits).toLocaleString('en-US');
  input.value = formatted;
  // Restore caret relative to end to reduce jumpiness
  const newPos = Math.max(0, formatted.length - fromEnd);
  try { input.setSelectionRange(newPos, newPos); } catch (_) {}
}

// --- PNG Export of the result card ----------------------------------------
const dlBtn = document.getElementById('btnDownload');
if (dlBtn) {
  dlBtn.addEventListener('click', async () => {
    const card = document.getElementById('resultCard');
    if (!window.html2canvas || !card) {
      alert('PNG export is unavailable in this environment.');
      return;
    }
    try {
      dlBtn.disabled = true; dlBtn.textContent = 'Generating...';
      // Capture with dark background to avoid washed-out look from semi-transparent layers
      const scale = 2;
      const base = await html2canvas(card, { backgroundColor: '#07090F', scale, useCORS: true });

      // Clip to rounded corners to keep the same shape of the card
      const out = document.createElement('canvas');
      out.width = base.width; out.height = base.height;
      const ctx = out.getContext('2d');
      const radiusCss = parseFloat(getComputedStyle(card).borderRadius) || 16; // px
      const r = Math.min(radiusCss * scale, Math.min(out.width, out.height) / 2);
      const w = out.width, h = out.height, x = 0, y = 0;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(base, 0, 0);

      const link = document.createElement('a');
      link.download = 'aster-allocation.png';
      link.href = out.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
      alert('Could not generate PNG.');
    } finally {
      dlBtn.disabled = false; dlBtn.textContent = 'Download PNG';
    }
  });
}
