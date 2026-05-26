'use strict';

/* ── CUSTOM CURSOR ── */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursor-ring');
  if (!cursor || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  function animateRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();

  document.querySelectorAll('a, button, .card').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
  });
})();


/* ── GEO CANVAS (mouse-reactive network globe) ── */
(function initGeoCanvas() {
  const canvas = document.getElementById('geoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const NUM = 80;
  let W, H, points = [];
  let mouseX = 0, mouseY = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width  = rect.width;
    H = canvas.height = rect.height;
  }

  function initPoints() {
    points = [];
    for (let i = 0; i < NUM; i++) {
      const r = (Math.random() * 0.42 + 0.04) * Math.min(W, H);
      const a = Math.random() * Math.PI * 2;
      points.push({
        bx: W / 2 + Math.cos(a) * r,
        by: H / 2 + Math.sin(a) * r,
        x: W / 2 + Math.cos(a) * r,
        y: H / 2 + Math.sin(a) * r,
        r: Math.random() * 3 + 1.5,
        speed:  Math.random() * 0.003 + 0.001,
        angle:  a,
        radius: r,
        color:  Math.random() > 0.5 ? '#2d7dd2' : '#0099ff',
        pulse:  Math.random() * Math.PI * 2,
      });
    }
  }

  resize();
  initPoints();

  window.addEventListener('resize', () => { resize(); initPoints(); });

  const hero = canvas.closest('.hero') || document.body;
  hero.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const cr = Math.min(W, H) * 0.46;

    ctx.beginPath();
    ctx.arc(W / 2, H / 2, cr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(45,125,210,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, cr * (i / 5), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(45,125,210,${0.04 + i * 0.01})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    for (let a = 0; a < Math.PI; a += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + Math.cos(a) * cr, H / 2 + Math.sin(a) * cr);
      ctx.lineTo(W / 2 - Math.cos(a) * cr, H / 2 - Math.sin(a) * cr);
      ctx.strokeStyle = 'rgba(45,125,210,0.07)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    const t = Date.now();

    points.forEach(p => {
      p.angle += p.speed;
      p.bx = W / 2 + Math.cos(p.angle) * p.radius;
      p.by = H / 2 + Math.sin(p.angle) * p.radius;

      const dx = p.bx - mouseX;
      const dy = p.by - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let tx = p.bx, ty = p.by;
      if (dist < 90 && dist > 0) {
        const force = (90 - dist) / 90;
        tx += (dx / dist) * force * 50;
        ty += (dy / dist) * force * 50;
      }

      p.x += (tx - p.x) * 0.08;
      p.y += (ty - p.y) * 0.08;

      const cx = p.x - W / 2, cy = p.y - H / 2;
      const d  = Math.sqrt(cx * cx + cy * cy);
      if (d > cr) { p.x = W / 2 + (cx / d) * cr; p.y = H / 2 + (cy / d) * cr; }

      const pulse = Math.sin(t * 0.002 + p.pulse) * 0.3 + 0.7;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.round(pulse * 180).toString(16).padStart(2, '0');
      ctx.fill();
    });

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 70) {
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.strokeStyle = `rgba(0,153,255,${(1 - d / 70) * 0.3})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
})();


/* ── SCROLL REVEAL ── */
(function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  reveals.forEach(el => observer.observe(el));
})();


/* ============================================================
   GEO Platform — login.js
   ============================================================ */

'use strict';

/* ── MINI CANVAS ANIMATION ── */
(function initMiniCanvas() {
  const canvas = document.getElementById('miniCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const PW = 340, PH = 180;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const pr = window.devicePixelRatio || 1;
    canvas.width  = rect.width  * pr;
    canvas.height = rect.height * pr;
    canvas.style.width  = rect.width  + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(pr, pr);
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 40 }, () => ({
    x:  Math.random() * PW,
    y:  Math.random() * PH,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r:  Math.random() * 2 + 1,
  }));

  function draw() {
    ctx.clearRect(0, 0, PW, PH);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > PW) p.vx *= -1;
      if (p.y < 0 || p.y > PH) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,153,255,0.6)';
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 80) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,153,255,${(1 - d / 80) * 0.35})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
})();


/* ── LOGIN FORM ── */
(function initLoginForm() {
  const form   = document.getElementById('loginForm');
  const errMsg = document.getElementById('errMsg');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errMsg && errMsg.classList.remove('show');

    const btn = form.querySelector('.btn-submit');
    btn.textContent = '확인 중...';
    btn.disabled = true;

    try {
      const res = await fetch('http://localhost:8080/api/v1/auth/dummy-login', { method: 'POST' });
      if (res.ok) {
        const token = await res.text();
        localStorage.setItem('ACCESS_TOKEN', token);
      }
    } catch (_) {}

    setTimeout(() => { window.location.href = 'geo-personal.html'; }, 500);
  });
})();


/* ============================================================
   GEO Platform — signup.js
   ============================================================ */

'use strict';

/* ── PASSWORD STRENGTH METER ── */
(function initPasswordStrength() {
  const pwInput = document.getElementById('pwInput');
  if (!pwInput) return;

  const bars  = ['pw1','pw2','pw3','pw4'].map(id => document.getElementById(id));
  const label = document.getElementById('pwLabel');
  if (!label) return;

  const COLORS = ['', '#ff4757', '#ffa502', '#2d7dd2', '#00c896'];
  const LABELS = ['', '취약', '보통', '강함', '매우 강함'];

  function getScore(val) {
    let score = 0;
    if (val.length >= 8)        score++;
    if (/[A-Z]/.test(val))      score++;
    if (/[0-9]/.test(val))      score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    return score;
  }

  pwInput.addEventListener('input', () => {
    const val   = pwInput.value;
    const score = val.length ? getScore(val) : 0;

    bars.forEach((bar, i) => {
      bar.style.background = i < score ? COLORS[score] : '';
    });

    label.textContent = val.length ? LABELS[score] : '';
    label.style.color = COLORS[score] || '';
  });
})();


/* ── ALL-AGREE CHECKBOX ── */
(function initAllAgree() {
  const allAgree  = document.getElementById('allAgree');
  if (!allAgree) return;

  const subChecks = document.querySelectorAll('.sub-agree');

  allAgree.addEventListener('change', () => {
    subChecks.forEach(c => { c.checked = allAgree.checked; });
  });

  subChecks.forEach(c => {
    c.addEventListener('change', () => {
      allAgree.checked = [...subChecks].every(sc => sc.checked);
    });
  });
})();


/* ── SIGNUP FORM ── */
(function initSignupForm() {
  const form = document.getElementById('signupForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const btn = form.querySelector('.btn-submit');
    btn.textContent = '계정 생성 중...';
    btn.disabled = true;

    setTimeout(() => {
      window.location.href = 'geo-personal.html';
    }, 1200);
  });
})();


/* ============================================================
   GEO Platform — personal.js
   ============================================================ */

'use strict';

let currentFilter = 'all';

function setFilter(btn, filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = filter;
  applyFilter();
}

function filterProjects(query) {
  applyFilter(query);
}

function applyFilter(query = '') {
  const lowerQuery = query.toLowerCase().trim();
  const wraps = document.querySelectorAll('.project-row-wrap');

  wraps.forEach(wrap => {
    const name      = (wrap.querySelector('.proj-name')?.textContent || '').toLowerCase();
    const status    = wrap.dataset.status || '';

    const matchFilter = currentFilter === 'all' || status === currentFilter;
    const matchQuery  = !lowerQuery || name.includes(lowerQuery);

    wrap.style.display = (matchFilter && matchQuery) ? '' : 'none';
  });

  updatePageInfo();
}

function updatePageInfo() {
  const total   = document.querySelectorAll('.project-row-wrap').length;
  const visible = [...document.querySelectorAll('.project-row-wrap')]
    .filter(r => r.style.display !== 'none').length;
  const info = document.querySelector('.page-info');
  if (info) info.textContent = `총 ${total}건 · ${visible}건 표시 중`;
}

window.setFilter      = setFilter;
window.filterProjects = filterProjects;


/* ============================================================
   GEO Platform — result.js
   AI 서버 직접 연동 (백엔드 없이 프론트 → AI 서버)
   ============================================================ */

'use strict';

/* ── 로컬 프록시 엔드포인트 ── */
const AI_ENDPOINT = '/api/evaluate';

// 카테고리 1: Entity & Topic Clarity       /15
// 카테고리 2: Answerability & Content Structure /25
// 카테고리 3: Evidence & Citation Readiness  /20
// 카테고리 4: Schema-HTML Alignment         /15
// 카테고리 5: Domain-Specific Completeness   /15
// 카테고리 6: Freshness & Operational Trust  /10
const CATEGORY_ORDER = [
  'entity_clarity',
  'answerability',
  'evidence_citation',
  'schema_alignment',
  'domain_completeness',
  'freshness_trust'
];
const CATEGORY_LABELS = {
  entity_clarity:      '엔티티·주제 명확성',
  answerability:       '콘텐츠 구조·답변성',
  evidence_citation:   '근거·인용 준비',
  schema_alignment:    '스키마-HTML 정렬',
  domain_completeness: '도메인별 완성도',
  freshness_trust:     '최신성·운영 신뢰'
};
const CATEGORY_SHORT_LABELS = {
  entity_clarity:      '엔티티',
  answerability:       '답변성',
  evidence_citation:   '근거',
  schema_alignment:    '스키마',
  domain_completeness: '도메인',
  freshness_trust:     '최신성'
};
// 카테고리별 만점 (각 배점이 다름)
const CATEGORY_MAX = {
  entity_clarity:      15,
  answerability:       25,
  evidence_citation:   20,
  schema_alignment:    15,
  domain_completeness: 15,
  freshness_trust:     10
};

function normalizeJsonLdPayload(value) {
  if (value === undefined || value === null) return [];
  if (typeof value === 'object') return value;

  const trimmed = String(value).trim();
  if (!trimmed) return [];

  try {
    return JSON.parse(trimmed);
  } catch {
    return [];
  }
}

function normalizeCategoryKey(label) {
  const text = String(label || '').toLowerCase();

  // 카테고리 1: Entity & Topic Clarity
  if (text.includes('entity') || text.includes('topic') || text.includes('clarity') ||
      text.includes('엔티티') || text.includes('주제') || text.includes('명확성')) return 'entity_clarity';
  // 카테고리 2: Answerability & Content Structure
  if (text.includes('answer') || text.includes('content structure') || text.includes('answerability') ||
      text.includes('답변') || text.includes('콘텐츠') || text.includes('구조')) return 'answerability';
  // 카테고리 3: Evidence & Citation Readiness
  if (text.includes('evidence') || text.includes('citation') || text.includes('readiness') ||
      text.includes('근거') || text.includes('인용') || text.includes('출처')) return 'evidence_citation';
  // 카테고리 4: Schema-HTML Alignment
  if (text.includes('schema') || text.includes('html') || text.includes('alignment') ||
      text.includes('스키마') || text.includes('정렬')) return 'schema_alignment';
  // 카테고리 5: Domain-Specific Completeness
  if (text.includes('domain') || text.includes('completeness') || text.includes('specific') ||
      text.includes('도메인') || text.includes('완성')) return 'domain_completeness';
  // 카테고리 6: Freshness & Operational Trust
  if (text.includes('fresh') || text.includes('operational') || text.includes('trust') ||
      text.includes('최신') || text.includes('운영') || text.includes('신뢰')) return 'freshness_trust';
  return '';
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── JSON 구조 응답에서 카테고리 빌드 ──
function buildCategories(cats) {
  if (!cats || typeof cats !== 'object') return {};
  const result = {};
  for (const [key, val] of Object.entries(cats)) {
    const nk = normalizeCategoryKey(key);
    if (!nk) continue;
    result[nk] = {
      score: Number.isFinite(Number(val?.score)) ? Number(val.score) : 0,
      max:   Number.isFinite(Number(val?.max))   ? Number(val.max)   : (CATEGORY_MAX[nk] || 20),
      feedback: [val?.feedback_strengths, val?.feedback_improvements]
                  .filter(Boolean).join(' | ') || String(val?.feedback || '')
    };
  }
  return result;
}

// ── 텍스트 응답 파서 (멀티-포맷 지원) ──
function parseAiResponse(data) {
  const payload = data || {};

  /* 경로 1: 구조화 JSON 응답 */
  const structuredCategories = buildCategories(payload.categories);
  if (Object.keys(structuredCategories).length > 0) {
    return {
      total_score: Number.isFinite(Number(payload.total_score)) ? Number(payload.total_score) : 0,
      max_score:   Number.isFinite(Number(payload.max_score))   ? Number(payload.max_score)   : 100,
      categories:  structuredCategories
    };
  }

  /* 경로 2: 텍스트 응답 파싱 */
  const content = typeof payload.content === 'string' ? payload.content : '';
  console.log('[GEO] AI 원문:\n', content);

  // 총점 추출 — "Total Score: 72 / 100" 또는 "총점: 72/100" 등
  const totalMatch =
    content.match(/Total\s+Score\s*[:\-]?\s*([\d.]+)\s*\/\s*([\d.]+)/i) ||
    content.match(/총점\s*[:\-]?\s*([\d.]+)\s*\/\s*([\d.]+)/i) ||
    content.match(/종합\s*점수\s*[:\-]?\s*([\d.]+)\s*\/\s*([\d.]+)/i);

  const categories = {};

  // ── 시도 1: [섹션] 형식 ──
  // [카테고리명] ... - 점수: X / Y ... - 강점: ... - 개선점: ...
  // 섹션 끝: 빈 줄 + [ 또는 텍스트 끝 (엄격하지 않게)
  const fmt1 = /\[([^\]]+)\]([\s\S]+?)(?=\n\s*\[|\n\s*카테고리\s*\d|\n\s*Category\s*\d|$)/gi;
  for (const m of content.matchAll(fmt1)) {
    const [, rawLabel, body] = m;
    const key = normalizeCategoryKey(rawLabel);
    if (!key) continue;

    // 점수: X / Y  (dash 있든 없든, 공백 유연)
    const scoreM = body.match(/[-•*]?\s*점수\s*[:\-]\s*([\d.]+)\s*\/\s*([\d.]+)/i) ||
                   body.match(/[-•*]?\s*score\s*[:\-]\s*([\d.]+)\s*\/\s*([\d.]+)/i) ||
                   body.match(/([\d.]+)\s*\/\s*([\d.]+)/);

    const strengthM  = body.match(/[-•*]\s*강점\s*[:\-]\s*([\s\S]+?)(?=\n\s*[-•*]|$)/i);
    const improveM   = body.match(/[-•*]\s*개선점\s*[:\-]\s*([\s\S]+?)(?=\n\s*[-•*]|$)/i);
    const commentM   = body.match(/[-•*]\s*(?:평가|코멘트|요약|설명)\s*[:\-]\s*([\s\S]+?)(?=\n\s*[-•*]|$)/i);

    const feedbackParts = [
      strengthM?.[1]?.trim(),
      improveM?.[1]?.trim(),
      commentM?.[1]?.trim()
    ].filter(Boolean);

    const parsedScore = scoreM ? Number(scoreM[1]) : 0;
    const parsedMax   = scoreM ? Number(scoreM[2]) : (CATEGORY_MAX[key] || 20);

    categories[key] = {
      score:    parsedScore,
      max:      parsedMax,
      feedback: feedbackParts.join(' | ')
    };
  }

  // ── 시도 2: "카테고리 N: 이름" 형식 ──
  if (Object.keys(categories).length === 0) {
    const fmt2 = /(?:카테고리\s*\d+|Category\s*\d+)\s*[:\-]\s*([^\n]+)\n([\s\S]+?)(?=\n\s*(?:카테고리|Category)\s*\d|$)/gi;
    for (const m of content.matchAll(fmt2)) {
      const [, rawLabel, body] = m;
      const key = normalizeCategoryKey(rawLabel);
      if (!key) continue;
      const scoreM = body.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      if (!scoreM) continue;
      categories[key] = {
        score:    Number(scoreM[1]) || 0,
        max:      Number(scoreM[2]) || (CATEGORY_MAX[key] || 20),
        feedback: body.replace(scoreM[0], '').replace(/[-•*\n]/g, ' ').trim().slice(0, 300)
      };
    }
  }

  // ── 시도 3: 카테고리 라벨 근방의 점수 패턴 검색 ──
  if (Object.keys(categories).length === 0) {
    for (const key of CATEGORY_ORDER) {
      const label      = CATEGORY_LABELS[key];
      const shortLabel = CATEGORY_SHORT_LABELS[key];
      const re = new RegExp(
        `(?:${escapeRegex(label)}|${escapeRegex(shortLabel)})[\\s\\S]{0,300}?` +
        `(?:점수|score)[\\s\\S]{0,50}?(\\d+)\\s*\\/\\s*(\\d+)`, 'gi'
      );
      const hit = re.exec(content);
      if (hit) {
        categories[key] = {
          score:    Number(hit[1]) || 0,
          max:      Number(hit[2]) || (CATEGORY_MAX[key] || 20),
          feedback: ''
        };
      }
    }
  }

  // ── max 보정: AI가 잘못된 만점을 반환한 경우 CATEGORY_MAX로 정규화 ──
  for (const [key, val] of Object.entries(categories)) {
    const expected = CATEGORY_MAX[key];
    if (expected && val.max !== expected) {
      // 비율을 유지하며 점수 재계산
      val.score = Math.round((val.score / val.max) * expected * 10) / 10;
      val.max   = expected;
    }
  }

  // 총점: 텍스트에 없으면 카테고리 점수 합산
  const computedTotal = Object.values(categories).reduce((s, c) => s + c.score, 0);
  return {
    total_score: totalMatch ? Number(totalMatch[1]) : computedTotal,
    max_score:   totalMatch ? Number(totalMatch[2]) : 100,
    categories
  };
}

/* ── 결과 페이지 초기화 (백엔드 폴링) ── */
(function initResultPage() {
  const params  = new URLSearchParams(location.search);
  const orderId = params.get('orderId');
  const badge   = document.getElementById('ph-badge');

  if (!orderId) {
    if (badge) { badge.textContent = '⚠ 주문 번호 없음'; badge.style.color = 'var(--red)'; }
    return;
  }

  if (badge) badge.textContent = '◌ AI 분석 중...';

  const token = localStorage.getItem('ACCESS_TOKEN');
  const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

  let attempts = 0;
  const MAX_ATTEMPTS = 60; // 최대 3분 대기

  function poll() {
    attempts++;
    fetch('http://localhost:8080/api/v1/geo/report/' + orderId, { headers })
      .then(res => {
        if (!res.ok) throw new Error('서버 오류: ' + res.status);
        return res.json();
      })
      .then(data => {
        if (data.jobStatus === 'SUCCESS') {
          const aiText   = (data.aiResult && data.aiResult.content) ? data.aiResult.content : '';
          const aiResult = parseAiResponse({ content: aiText });
          renderPage({
            orderId:    data.orderId,
            targetUrl:  data.targetUrl,
            jobStatus:  data.jobStatus,
            createdAt:  data.createdAt,
            rawContent: aiText,   // 파싱 실패 시 raw 표시용
            aiResult: {
              total_score: aiResult.total_score,
              max_score:   aiResult.max_score,
              categories:  aiResult.categories
            }
          });
        } else if (data.jobStatus === 'FAILED') {
          if (badge) { badge.textContent = '⚠ 분석 실패'; badge.style.color = 'var(--red)'; }
        } else if (attempts < MAX_ATTEMPTS) {
          setTimeout(poll, 3000); // 3초마다 재시도
        } else {
          if (badge) { badge.textContent = '⚠ 시간 초과'; badge.style.color = 'var(--red)'; }
        }
      })
      .catch(err => {
        console.error('[GEO] 결과 조회 실패:', err);
        if (attempts < MAX_ATTEMPTS) setTimeout(poll, 5000);
        else if (badge) { badge.textContent = '⚠ ' + err.message; badge.style.color = 'var(--red)'; }
      });
  }

  poll();
})();


/* ── 렌더링 ── */
function renderPage(report) {
  const ai      = report.aiResult;
  const cats    = ai.categories || {};
  const catKeys = CATEGORY_ORDER.filter(key => cats[key]);

  // 파싱 완전 실패 시 피드백 영역에 raw 텍스트 표시
  if (catKeys.length === 0) {
    console.warn('[GEO] 카테고리 파싱 실패 — raw content를 표시합니다.');
    const feedbackList = document.getElementById('feedbackList');
    if (feedbackList) {
      const rawText = (report.rawContent || '').replace(/</g, '&lt;');
      feedbackList.innerHTML = `
        <div class="insight-item med">
          <span class="insight-icon">⚠️</span>
          <div class="insight-text">
            <strong>카테고리 점수 파싱 실패</strong><br>
            <pre style="white-space:pre-wrap;font-size:0.78rem;margin-top:8px;">${rawText || 'AI 응답 없음'}</pre>
          </div>
        </div>`;
    }
  }

  document.getElementById('ph-title').textContent = report.targetUrl;
  document.getElementById('m-order-id').textContent = '#' + report.orderId;
  document.getElementById('m-url').textContent = report.targetUrl;
  document.getElementById('m-status').textContent = report.jobStatus;
  document.getElementById('m-created-at').textContent =
    new Date(report.createdAt).toLocaleString('ko-KR');

  const badge = document.getElementById('ph-badge');
  badge.textContent = '● 분석 완료';
  badge.style.color = 'var(--green)';

  const maxScore = Number(ai.max_score) || 100;
  const total = Number(ai.total_score) || 0;
  const pct   = Math.round((total / maxScore) * 100);
  const grade = pct >= 80 ? '우수' : pct >= 60 ? '양호' : pct >= 40 ? '보통' : '개선 필요';
  const gradeColor = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--accent)' : pct >= 40 ? 'var(--orange)' : 'var(--red)';

  document.getElementById('kpi-total-val').innerHTML = total + '<span class="kpi-unit">/ ' + maxScore + '</span>';
  const gradeEl = document.getElementById('kpi-total-grade');
  gradeEl.textContent = grade + ' (' + pct + '%)';
  gradeEl.style.color = gradeColor;
  document.getElementById('kpi-total-bar').dataset.w = pct + '%';

  const kpiMap = {
    entity_clarity:      ['kpi-entity-clarity',         'kpi-entity-clarity-bar'],
    answerability:       ['kpi-answerability',           'kpi-answerability-bar'],
    evidence_citation:   ['kpi-evidence',                'kpi-evidence-bar'],
    schema_alignment:    ['kpi-schema',                  'kpi-schema-bar'],
    domain_completeness: ['kpi-domain-completeness',     'kpi-domain-completeness-bar'],
    freshness_trust:     ['kpi-freshness',               'kpi-freshness-bar']
  };

  Object.entries(kpiMap).forEach(([key, [valId, barId]]) => {
    const c  = cats[key];
    const el = document.getElementById(valId);
    const bl = document.getElementById(barId);
    if (!c) return;
    if (el) el.innerHTML = c.score + '<span class="kpi-unit">/ ' + c.max + '</span>';
    if (bl) bl.dataset.w = Math.round((c.score / c.max) * 100) + '%';
  });

  setTimeout(() => {
    document.querySelectorAll('.kpi-bar-fill').forEach(el => {
      el.style.width = el.dataset.w || '0%';
    });
  }, 300);

  const feedbackList = document.getElementById('feedbackList');
  if (feedbackList) {
    feedbackList.innerHTML = catKeys.map(key => {
      const c     = cats[key];
      const ratio = c.score / c.max;
      const cls   = ratio >= 0.7 ? 'low' : ratio >= 0.4 ? 'med' : 'high';
      const icon  = ratio >= 0.7 ? '🟢' : ratio >= 0.4 ? '🟠' : '🔴';
      const scoreTag = `<span style="font-family:var(--font-mono);font-size:0.75rem;
        background:var(--blue-50);color:var(--accent);padding:2px 8px;
        border-radius:4px;margin-left:8px;">${c.score} / ${c.max}</span>`;
      return `<div class="insight-item ${cls}">
        <span class="insight-icon">${icon}</span>
        <div class="insight-text">
          <strong>${CATEGORY_LABELS[key] || key}${scoreTag}</strong><br>
          <span style="margin-top:4px;display:block">${c.feedback}</span>
        </div>
      </div>`;
    }).join('');
  }

  try {
    const parsed = typeof ai.json_ld === 'string' ? JSON.parse(ai.json_ld) : ai.json_ld;
    const block  = document.getElementById('jsonLdBlock');
    if (block) block.textContent = JSON.stringify(parsed, null, 2);
  } catch {
    const block = document.getElementById('jsonLdBlock');
    if (block) block.textContent = ai.json_ld || '—';
  }

  initRadarChart(catKeys, cats);
  initBarChart(catKeys, cats);
}


/* ── RADAR CHART ── */
function initRadarChart(catKeys, cats) {
  const canvas = document.getElementById('radarChart');
  if (!canvas) return;
  if (!catKeys || catKeys.length === 0) return; // 데이터 없으면 스킵
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  function resize() {
    const w = canvas.parentElement.offsetWidth - 48;
    canvas.width  = w * dpr;
    canvas.height = 280 * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = '280px';
    ctx.scale(dpr, dpr);
    draw(w);
  }

  // 각 카테고리를 만점 대비 달성률(0~1)로 정규화하여 레이더에 표시
  const scores = catKeys.map(k => cats[k].score / (cats[k].max || CATEGORY_MAX[k] || 1));
  const N = catKeys.length;
  let prog = 0;

  function draw(W) {
    const H  = 280;
    const cx = W / 2, cy = H / 2 + 10;
    const r  = Math.min(W, H) * 0.30;
    ctx.clearRect(0, 0, W, H);
    const angles = catKeys.map((_, i) => -Math.PI / 2 + (2 * Math.PI / N) * i);

    for (let ring = 1; ring <= 4; ring++) {
      const rr = r * (ring / 4);
      ctx.beginPath();
      angles.forEach((a, i) => {
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(136,170,200,0.2)'; ctx.lineWidth = 1; ctx.stroke();
    }

    angles.forEach(a => {
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.strokeStyle = 'rgba(136,170,200,0.2)'; ctx.lineWidth = 1; ctx.stroke();
    });

    ctx.beginPath();
    scores.forEach((v, i) => {
      const rr = r * v * prog;
      const x = cx + Math.cos(angles[i]) * rr;
      const y = cy + Math.sin(angles[i]) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = '#0099ff22'; ctx.fill();
    ctx.strokeStyle = '#0099ff'; ctx.lineWidth = 2; ctx.stroke();

    const shortLabels = catKeys.map(key => CATEGORY_SHORT_LABELS[key] || key);
    ctx.font = 'bold 11px DM Sans, sans-serif'; ctx.fillStyle = '#0a1628'; ctx.textAlign = 'center';
    angles.forEach((a, i) => {
      const x = cx + Math.cos(a) * (r + 24), y = cy + Math.sin(a) * (r + 24);
      ctx.fillText(shortLabels[i] || catKeys[i], x, y + 4);
    });

    scores.forEach((v, i) => {
      const rr = r * v * prog;
      const x = cx + Math.cos(angles[i]) * rr;
      const y = cy + Math.sin(angles[i]) * rr;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0099ff'; ctx.fill();
    });
  }

  let ap = 0;
  function animate() {
    if (ap < 1) { ap = Math.min(1, ap + 0.03); prog = ap; resize(); requestAnimationFrame(animate); }
    else { prog = 1; resize(); }
  }
  resize();
  setTimeout(animate, 500);
  window.addEventListener('resize', resize);
}


/* ── BAR CHART ── */
function initBarChart(catKeys, cats) {
  const canvas = document.getElementById('barChart');
  if (!canvas) return;
  if (!catKeys || catKeys.length === 0) return; // 데이터 없으면 스킵
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const SCORES = catKeys.map(k => cats[k].score);
  const MAXES  = catKeys.map(k => cats[k].max || CATEGORY_MAX[k] || 25);
  const SHORT  = catKeys.map(key => CATEGORY_SHORT_LABELS[key] || key);
  const COLORS = ['#0099ff','#7b5ea7','#00c896','#ff8c00','#00b5b5','#6b46c1'];
  const PAD    = { l: 44, r: 20, t: 20, b: 56 };
  const H      = 280;
  let animProg = 0;

  // y축 최대값: 카테고리 중 가장 높은 만점 (answerability = 25)
  const Y_MAX = Math.max(...MAXES);

  function resize() {
    const w = canvas.parentElement.offsetWidth - 48;
    canvas.width  = w * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    draw(w);
  }

  function draw(W) {
    const cw = W - PAD.l - PAD.r;
    const ch = H - PAD.t - PAD.b;
    ctx.clearRect(0, 0, W, H);
    const bw = (cw / SCORES.length) - 12;

    SCORES.forEach((v, i) => {
      const bh = (v / Y_MAX) * ch * animProg;
      const x  = PAD.l + i * (cw / SCORES.length) + 6;
      const y  = PAD.t + ch - bh;

      // 만점 대비 달성률에 따라 바 투명도 조절
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 5); ctx.fill();

      // 만점 기준선 (점선)
      const maxBarH = (MAXES[i] / Y_MAX) * ch;
      const maxY = PAD.t + ch - maxBarH;
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = COLORS[i % COLORS.length] + '88';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, maxY); ctx.lineTo(x + bw, maxY); ctx.stroke();
      ctx.restore();

      if (animProg > 0.9) {
        ctx.fillStyle = '#0a1628'; ctx.font = 'bold 11px DM Sans, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(v + '/' + MAXES[i], x + bw / 2, y - 6);
      }

      ctx.fillStyle = '#4a6685'; ctx.font = 'bold 10px DM Sans, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(SHORT[i] || catKeys[i], x + bw / 2, H - PAD.b + 18);
    });

    // y축 눈금 (0 ~ Y_MAX, 5단계)
    for (let i = 0; i <= 5; i++) {
      const y = PAD.t + ch * (1 - i / 5);
      ctx.fillStyle = '#8aaac8'; ctx.font = '9px DM Mono, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText((Y_MAX * i / 5).toFixed(0), PAD.l - 6, y + 4);
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + cw, y);
      ctx.strokeStyle = 'rgba(136,170,200,0.15)'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  let ap = 0;
  function animate() {
    if (ap < 1) { ap = Math.min(1, ap + 0.04); animProg = ap; resize(); requestAnimationFrame(animate); }
    else { animProg = 1; resize(); }
  }
  resize();
  setTimeout(animate, 400);
  window.addEventListener('resize', resize);
}

function switchTab(btn, type) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
window.switchTab = switchTab;


/* ============================================================
   GEO Order Page — 의뢰 신청 폼 핸들러
   ============================================================ */

(function initOrderForm() {
  const form = document.getElementById('orderForm');
  if (!form) return;

  const SERVICE_TYPE_MAP = {
    '쇼핑몰 / 이커머스': 'ECOMMERCE',
    '뉴스 / 미디어':     'NEWS',
    'SaaS / 테크':       'TECHBLOG',
    '교육 / 학술':       'EDUCATION',
    '의료 / 헬스케어':   'ETC',
    '로컬 비즈니스':     'ETC',
    '기타':              'ETC',
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const btn = form.querySelector('.order-submit-btn');
    btn.textContent = '제출 중...';
    btn.disabled = true;

    // 토큰 없으면 더미 로그인 자동 실행
    if (!localStorage.getItem('ACCESS_TOKEN')) {
      try {
        const loginRes = await fetch('http://localhost:8080/api/v1/auth/dummy-login', { method: 'POST' });
        if (loginRes.ok) {
          const tok = await loginRes.text();
          localStorage.setItem('ACCESS_TOKEN', tok);
        }
      } catch (_) { /* 로그인 실패해도 계속 진행 (백엔드가 익명 처리) */ }
    }

    const targetUrl      = document.getElementById('targetUrl')?.value || '';
    const serviceType    = document.getElementById('serviceType')?.value || '';
    const categoryStatus = SERVICE_TYPE_MAP[serviceType] || 'ETC';
    const token          = localStorage.getItem('ACCESS_TOKEN');

    try {
      const res = await fetch('http://localhost:8080/api/v1/geo/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({ targetUrl, categoryStatus })
      });

      if (!res.ok) throw new Error('서버 오류: ' + res.status);
      const data = await res.json();
      window.location.href = 'geo-result.html?orderId=' + data.orderId;

    } catch (err) {
      alert('분석 요청 실패: ' + err.message);
      btn.textContent = '분석 의뢰 →';
      btn.disabled = false;
    }
  });
})();


/* ============================================================
   GEO Personal Page — localStorage 의뢰 목록 동적 렌더링
   ============================================================ */

(function initPersonalOrders() {
  const list = document.getElementById('projectList');
  if (!list) return;

  const orders = JSON.parse(localStorage.getItem('geoOrders') || '[]');
  if (orders.length === 0) return;

  const iconMap = {
    '쇼핑몰 / 이커머스': '🛒',
    '뉴스 / 미디어':     '📰',
    'SaaS / 테크':       '💻',
    '교육 / 학술':       '🎓',
    '의료 / 헬스케어':   '🏥',
    '로컬 비즈니스':     '🏪',
    '기타':              '🌐',
  };

  orders.forEach(order => {
    const icon  = iconMap[order.serviceType] || '🌐';
    const items = (order.analysisItems || []).join(' · ') || '기본 분석';
    const wrap  = document.createElement('div');
    wrap.className  = 'project-row-wrap';
    wrap.dataset.status = order.status || 'queued';

    wrap.innerHTML = `
      <div class="project-row">
        <div class="proj-icon geo">${icon}</div>
        <div class="proj-info">
          <div class="proj-name">${order.siteName || order.targetUrl}</div>
          <div class="proj-meta">${order.targetUrl} · ${items}</div>
        </div>
        <div class="proj-date">${order.date}</div>
        <span class="status-badge queued">◌ 대기 중</span>
      </div>`;

    list.insertBefore(wrap, list.firstChild);
  });

  const totalEl = document.querySelector('.stat-card.c-blue .sc-val');
  const queueEl = document.querySelector('.stat-card.c-orange .sc-val');
  if (totalEl) totalEl.textContent = parseInt(totalEl.textContent) + orders.length;
  if (queueEl) queueEl.textContent = parseInt(queueEl.textContent) + orders.length;

  updatePageInfo();
})();