/* ==========================================================================
   NeuroScore — Application Logic
   Vanilla JS. No frameworks. Talks to a FastAPI backend at /predict.
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------
   * 0. CONFIG
   * ------------------------------------------------------------------ */
  const CONFIG = {
    BASE_URL: 'https://neuroscore-ai-2.onrender.com',
    PREDICT_ENDPOINT: '/predict',
    HEALTH_ENDPOINT: '/',
    REQUEST_TIMEOUT_MS: 15000,
    HEALTH_TIMEOUT_MS: 4000,
  };

  const TOP_COUNTRIES = ['India', 'USA', 'Canada', 'Australia', 'UK', 'Germany', 'Turkey', 'Mexico', 'France'];

  /* ------------------------------------------------------------------
   * 1. FORM SCHEMA
   * ------------------------------------------------------------------ */
  const FORM_SCHEMA = [
    { name: 'Age', label: 'Age', type: 'number', required: true, min: 1, max: 100, step: 1, placeholder: 'e.g. 21', hint: 'Whole number, 1–100 years.' },
    { name: 'Gender', label: 'Gender', type: 'radio', required: true, options: ['Male', 'Female'], hint: 'Select one.' },
    { name: 'Country', label: 'Country', type: 'select-other', required: true, options: TOP_COUNTRIES, placeholder: 'Enter your country', hint: 'Choose from the list or select "Other".' },
    { name: 'Academic_Level', label: 'Academic Level', type: 'select', required: true, options: ['Undergraduate', 'Graduate', 'High School'], hint: 'Current level of study.' },
    { name: 'Most_Used_Platform', label: 'Most Used Platform', type: 'select', required: true, options: ['Facebook', 'LinkedIn', 'Instagram', 'Snapchat', 'Twitter', 'YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp', 'WeChat'], hint: 'The social platform used most often.' },
    { name: 'Purpose_Of_Use', label: 'Purpose of Use', type: 'select', required: true, options: ['Networking', 'Education', 'Entertainment', 'News'], hint: 'Primary reason for using the platform.' },
    { name: 'Avg_Daily_Usage_Hours', label: 'Avg. Daily Usage (hrs)', type: 'number', required: true, min: 0.1, max: 24, step: 0.1, placeholder: 'e.g. 4.5', hint: 'Decimal allowed, 0–24 hours.' },
    { name: 'Daily_Unlocks', label: 'Daily Phone Unlocks', type: 'number', required: true, min: 1, max: 500, step: 1, placeholder: 'e.g. 60', hint: 'Whole number, times per day.' },
    { name: 'Study_Hours', label: 'Study Hours / Day', type: 'number', required: true, min: 0.1, max: 24, step: 0.1, placeholder: 'e.g. 3', hint: 'Decimal allowed, 0–24 hours.' },
    { name: 'Physical_Activity_Hours', label: 'Physical Activity (hrs/day)', type: 'number', required: true, min: 0.1, max: 24, step: 0.1, placeholder: 'e.g. 1', hint: 'Decimal allowed, 0–24 hours.' },
    { name: 'Sleep_Hours_Per_Night', label: 'Sleep per Night (hrs)', type: 'number', required: true, min: 0.1, max: 24, step: 0.1, placeholder: 'e.g. 7', hint: 'Decimal allowed, 0–24 hours.' },
    { name: 'Stress_Level', label: 'Stress Level', type: 'radio', required: true, options: ['Low', 'Medium', 'High', 'Very High'], hint: 'Select one.' },
  ];

  /* ------------------------------------------------------------------
   * 2. DOM REFERENCES
   * ------------------------------------------------------------------ */
  const $ = (sel) => document.querySelector(sel);
  const els = {
    formGrid: $('#formGrid'),
    form: $('#predictForm'),
    predictBtn: $('#predictBtn'),
    resetBtn: $('#resetBtn'),
    retryBtn: $('#retryBtn'),
    resultIdle: $('#resultIdle'),
    resultLoading: $('#resultLoading'),
    resultData: $('#resultData'),
    resultErrorState: $('#resultErrorState'),
    resultErrorMsg: $('#resultErrorMsg'),
    gaugeNeedle: $('#gaugeNeedle'),
    gaugeScore: $('#gaugeScore'),
    gaugeBand: $('#gaugeBand'),
    gaugeTrack: document.querySelector('.gauge-track'),
    insightIcon: $('#insightIcon'),
    insightTitle: $('#insightTitle'),
    insightText: $('#insightText'),
    apiStatusDot: $('#apiStatusDot'),
    apiStatusLabel: $('#apiStatusLabel'),
    navToggle: $('#navToggle'),
    navLinks: $('#navLinks'),
    toastContainer: $('#toastContainer'),
  };

  /* ------------------------------------------------------------------
   * 3. SCORE BANDS
   * ------------------------------------------------------------------ */
  const SCORE_BANDS = [
    { max: 3, label: 'Critical', color: '#ff3b5c', title: 'Critical — Immediate Support Recommended', text: 'The predicted signals indicate significant strain. Consider reaching out to a counselor, trusted adult, or mental health professional soon.' },
    { max: 5, label: 'Needs Attention', color: '#ff9d3b', title: 'Needs Attention', text: 'Several lifestyle factors may be impacting wellbeing. Small, consistent changes to sleep, activity, or screen time could help.' },
    { max: 7, label: 'Moderate', color: '#ffe23b', title: 'Moderate — Room to Improve', text: 'Overall balance looks reasonable, but there is room to strengthen routines like sleep consistency and study-life balance.' },
    { max: 8.5, label: 'Healthy', color: '#8bff3b', title: 'Healthy Balance', text: 'Lifestyle signals point to a healthy balance between digital habits, study, rest, and activity. Keep up the good routines.' },
    { max: 10.0001, label: 'Excellent', color: '#00ffb2', title: 'Excellent Neural Wellness', text: 'This profile reflects excellent balance across sleep, activity, study, and digital habits.' },
  ];

  const ICONS = { 'Critical': '🚨', 'Needs Attention': '⚠️', 'Moderate': '🧭', 'Healthy': '🌿', 'Excellent': '✨' };

  function getBand(score) {
    return SCORE_BANDS.find((b) => score < b.max) || SCORE_BANDS[SCORE_BANDS.length - 1];
  }

  /* ------------------------------------------------------------------
   * 4. FORM RENDERING
   * ------------------------------------------------------------------ */
  function buildField(field) {
    const wrap = document.createElement('div');
    wrap.className = 'field' + (field.type === 'radio' || field.type === 'select-other' ? ' field--full' : '');

    const label = document.createElement('label');
    label.className = 'field__label';
    label.setAttribute('for', field.name);
    label.textContent = field.label;   // Removed asterisk span
    wrap.appendChild(label);

    if (field.type === 'number') {
      const input = document.createElement('input');
      Object.assign(input, { type: 'number', id: field.name, name: field.name, placeholder: field.placeholder, required: true });
      input.min = field.min; input.max = field.max; input.step = field.step;
      input.className = 'field__control';
      input.setAttribute('aria-describedby', `${field.name}-hint`);
      wrap.appendChild(input);
    } else if (field.type === 'select') {
      const select = document.createElement('select');
      select.id = field.name; select.name = field.name; select.required = true;
      select.className = 'field__control';
      select.setAttribute('aria-describedby', `${field.name}-hint`);
      select.appendChild(new Option(`Select ${field.label.toLowerCase()}…`, '', true, true)).disabled = true;
      field.options.forEach((opt) => select.appendChild(new Option(opt, opt)));
      wrap.appendChild(select);
    } else if (field.type === 'select-other') {
      const select = document.createElement('select');
      select.id = field.name; select.name = field.name; select.required = true;
      select.className = 'field__control';
      select.setAttribute('aria-describedby', `${field.name}-hint`);
      select.appendChild(new Option('Select your country…', '', true, true)).disabled = true;
      field.options.forEach((opt) => select.appendChild(new Option(opt, opt)));
      select.appendChild(new Option('Other', 'Other'));
      wrap.appendChild(select);

      const otherInput = document.createElement('input');
      Object.assign(otherInput, { type: 'text', id: `${field.name}_other`, name: `${field.name}_other`, placeholder: field.placeholder });
      otherInput.className = 'field__control hidden';
      otherInput.style.marginTop = '0.6rem';
      wrap.appendChild(otherInput);

      select.addEventListener('change', () => {
        if (select.value === 'Other') {
          otherInput.classList.remove('hidden');
          otherInput.required = true;
        } else {
          otherInput.classList.add('hidden');
          otherInput.required = false;
          otherInput.value = '';
        }
        clearFieldError(field.name);
      });
    } else if (field.type === 'radio') {
      const group = document.createElement('div');
      group.className = 'radio-group';
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-describedby', `${field.name}-hint`);
      field.options.forEach((opt) => {
        const pill = document.createElement('div');
        pill.className = 'radio-pill';
        const id = `${field.name}_${opt.replace(/\s+/g, '')}`;
        pill.innerHTML = `<input type="radio" id="${id}" name="${field.name}" value="${opt}" /><label for="${id}">${opt}</label>`;
        group.appendChild(pill);
      });
      wrap.appendChild(group);
    }

    const hint = document.createElement('p');
    hint.className = 'field__hint';
    hint.id = `${field.name}-hint`;
    hint.textContent = field.hint;
    wrap.appendChild(hint);

    const error = document.createElement('p');
    error.className = 'field__error';
    error.id = `${field.name}-error`;
    error.setAttribute('role', 'alert');
    wrap.appendChild(error);

    return wrap;
  }

  function renderForm() {
    const frag = document.createDocumentFragment();
    FORM_SCHEMA.forEach((field) => frag.appendChild(buildField(field)));
    els.formGrid.appendChild(frag);
  }

  function setFieldError(name, message) {
    const errEl = document.getElementById(`${name}-error`);
    const ctrl = document.getElementById(name);
    if (errEl) errEl.textContent = message;
    if (ctrl) ctrl.classList.toggle('is-invalid', Boolean(message));
  }

  function clearFieldError(name) { setFieldError(name, ''); }
  function clearAllErrors() { FORM_SCHEMA.forEach((f) => clearFieldError(f.name)); }

  /* ------------------------------------------------------------------
   * 5. VALIDATION + COLLECTION
   * ------------------------------------------------------------------ */
  function collectAndValidate() {
    clearAllErrors();
    const payload = {};
    let firstInvalid = null;

    for (const field of FORM_SCHEMA) {
      if (field.type === 'radio') {
        const checked = els.form.querySelector(`input[name="${field.name}"]:checked`);
        if (!checked) {
          setFieldError(field.name, `Please select a ${field.label.toLowerCase()}.`);
          firstInvalid = firstInvalid || field.name;
          continue;
        }
        payload[field.name] = checked.value;
      } else if (field.type === 'select-other') {
        const select = document.getElementById(field.name);
        const other = document.getElementById(`${field.name}_other`);
        let value = select.value;
        if (!value) {
          setFieldError(field.name, 'Please select a country.');
          firstInvalid = firstInvalid || field.name;
          continue;
        }
        if (value === 'Other') {
          value = other.value.trim();
          if (!value) {
            setFieldError(field.name, 'Please type your country.');
            firstInvalid = firstInvalid || field.name;
            continue;
          }
        }
        payload[field.name] = value;
      } else if (field.type === 'select') {
        const select = document.getElementById(field.name);
        if (!select.value) {
          setFieldError(field.name, `Please select a ${field.label.toLowerCase()}.`);
          firstInvalid = firstInvalid || field.name;
          continue;
        }
        payload[field.name] = select.value;
      } else if (field.type === 'number') {
        const input = document.getElementById(field.name);
        const raw = input.value.trim();
        if (raw === '') {
          setFieldError(field.name, `${field.label} is required.`);
          firstInvalid = firstInvalid || field.name;
          continue;
        }
        const num = Number(raw);
        if (Number.isNaN(num)) {
          setFieldError(field.name, 'Must be a valid number.');
          firstInvalid = firstInvalid || field.name;
          continue;
        }
        if (num < field.min || num > field.max) {
          setFieldError(field.name, `Must be between ${field.min} and ${field.max}.`);
          firstInvalid = firstInvalid || field.name;
          continue;
        }
        payload[field.name] = field.step === 1 ? Math.round(num) : num;
      }
    }
    return { payload, firstInvalid };
  }

  /* ------------------------------------------------------------------
   * 6. TOASTS
   * ------------------------------------------------------------------ */
  const TOAST_ICONS = { error: '⛔', success: '✅', warning: '⚠️', info: 'ℹ️' };

  function showToast({ type = 'info', title, message, duration = 5000 }) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span class="toast__icon" aria-hidden="true">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><div class="toast__body"><strong>${title}</strong><span>${message}</span></div>`;
    els.toastContainer.appendChild(toast);
    const remove = () => { toast.classList.add('is-leaving'); setTimeout(() => toast.remove(), 260); };
    const timer = setTimeout(remove, duration);
    toast.addEventListener('click', () => { clearTimeout(timer); remove(); });
  }

  /* ------------------------------------------------------------------
   * 7. RESULT PANEL STATE
   * ------------------------------------------------------------------ */
  function showResultState(state) {
    els.resultIdle.classList.add('hidden');
    els.resultLoading.classList.add('hidden');
    els.resultData.classList.add('hidden');
    els.resultErrorState.classList.add('hidden');
    const map = { idle: els.resultIdle, loading: els.resultLoading, data: els.resultData, error: els.resultErrorState };
    map[state].classList.remove('hidden');
  }

  function setPredictButtonLoading(isLoading) {
    els.predictBtn.disabled = isLoading;
    els.predictBtn.classList.toggle('is-loading', isLoading);
  }

  /* ------------------------------------------------------------------
   * 8. GAUGE RENDERING
   * ------------------------------------------------------------------ */
  function renderGauge(score) {
    const clamped = Math.max(0, Math.min(10, score));
    const angle = -90 + (clamped / 10) * 180;
    els.gaugeNeedle.style.transform = `rotate(${angle}deg)`;
    els.gaugeScore.textContent = clamped.toFixed(2);

    if (els.gaugeTrack) {
      const totalLength = els.gaugeTrack.getTotalLength();
      const visibleLength = (clamped / 10) * totalLength;
      els.gaugeTrack.style.strokeDasharray = `${visibleLength} ${totalLength - visibleLength}`;
      els.gaugeTrack.style.strokeDashoffset = 0;
    }

    const band = getBand(clamped);
    els.gaugeScore.style.color = band.color;
    els.gaugeBand.textContent = band.label;
    els.gaugeBand.style.color = band.color;

    els.insightIcon.textContent = ICONS[band.label] || '🧠';
    els.insightTitle.textContent = band.title;
    els.insightText.textContent = band.text;

    return band;
  }

  /* ------------------------------------------------------------------
   * 9. API INTEGRATION
   * ------------------------------------------------------------------ */
  async function fetchWithTimeout(url, options = {}, timeoutMs = CONFIG.REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  async function checkApiHealth() {
    els.apiStatusDot.className = 'api-status__dot checking';
    els.apiStatusLabel.textContent = 'Checking API…';
    try {
      const res = await fetchWithTimeout(CONFIG.BASE_URL + CONFIG.HEALTH_ENDPOINT, { method: 'GET' }, CONFIG.HEALTH_TIMEOUT_MS);
      if (res.ok) {
        els.apiStatusDot.className = 'api-status__dot online';
        els.apiStatusLabel.textContent = 'API Online';
      } else {
        throw new Error('Non-OK status');
      }
    } catch {
      els.apiStatusDot.className = 'api-status__dot offline';
      els.apiStatusLabel.textContent = 'API Offline';
    }
  }

  async function submitPrediction(payload) {
    let response;
    try {
      response = await fetchWithTimeout(CONFIG.BASE_URL + CONFIG.PREDICT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, CONFIG.REQUEST_TIMEOUT_MS);
    } catch (err) {
      if (err.name === 'AbortError') throw new ApiError('The server took too long to respond. Please try again.', 'timeout');
      throw new ApiError('Could not reach the prediction server. Is the backend running?', 'network');
    }

    if (response.status === 422) {
      const body = await safeJson(response);
      throw new ApiError(formatValidationError(body), 'validation');
    }
    if (!response.ok) {
      const body = await safeJson(response);
      const detail = body?.detail || `Server responded with status ${response.status}.`;
      throw new ApiError(detail, 'server');
    }
    const data = await safeJson(response);
    if (!data || typeof data.predicted_mental_health_score !== 'number') {
      throw new ApiError('The server returned an unexpected response format.', 'parse');
    }
    return data;
  }

  async function safeJson(response) {
    try { return await response.json(); } catch { return null; }
  }

  function formatValidationError(body) {
    if (body && Array.isArray(body.detail)) {
      const first = body.detail[0];
      const field = first?.loc?.[first.loc.length - 1] || 'A field';
      const msg = first?.msg || 'is invalid.';
      return `${field}: ${msg}`;
    }
    return 'The server rejected the submitted data. Please check your inputs.';
  }

  class ApiError extends Error {
    constructor(message, kind) { super(message); this.kind = kind; }
  }

  /* ------------------------------------------------------------------
   * 10. FORM SUBMIT HANDLER
   * ------------------------------------------------------------------ */
  async function handlePredictSubmit(e) {
    e.preventDefault();
    const { payload, firstInvalid } = collectAndValidate();
    if (firstInvalid) {
      showToast({ type: 'warning', title: 'Check your inputs', message: 'Some fields need attention before we can run the prediction.' });
      const el = document.getElementById(firstInvalid) || document.querySelector(`[name="${firstInvalid}"]`);
      if (el) el.focus();
      return;
    }

    setPredictButtonLoading(true);
    showResultState('loading');

    try {
      const data = await submitPrediction(payload);
      const score = data.predicted_mental_health_score;
      if (els.gaugeTrack) els.gaugeTrack.style.strokeDasharray = '0 999';
      renderGauge(0);
      showResultState('data');
      requestAnimationFrame(() => requestAnimationFrame(() => renderGauge(score)));
      showToast({ type: 'success', title: 'Prediction complete', message: `Neural health score: ${score.toFixed(2)} / 10.` });
    } catch (err) {
      showResultState('error');
      const message = err instanceof ApiError ? err.message : 'An unexpected error occurred. Please try again.';
      els.resultErrorMsg.textContent = message;
      showToast({ type: 'error', title: 'Prediction failed', message });
      checkApiHealth();
    } finally {
      setPredictButtonLoading(false);
    }
  }

  function handleReset() {
    els.form.reset();
    clearAllErrors();
    document.querySelectorAll('#formGrid input[type="text"].hidden').forEach((el) => el.classList.add('hidden'));
    showResultState('idle');
    showToast({ type: 'info', title: 'Form reset', message: 'All fields have been cleared.' });
  }

  /* ------------------------------------------------------------------
   * 11. NAVBAR TOGGLE
   * ------------------------------------------------------------------ */
  function initNavToggle() {
    els.navToggle.addEventListener('click', () => {
      const isOpen = els.navLinks.classList.toggle('is-open');
      els.navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    els.navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        els.navLinks.classList.remove('is-open');
        els.navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ------------------------------------------------------------------
   * 12. NEURAL NETWORK BACKGROUND
   * ------------------------------------------------------------------ */
  function initNeuralBackground() {
    const canvas = document.getElementById('neuralCanvas');
    const ctx = canvas.getContext('2d');
    let width, height, nodes;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      const count = Math.min(70, Math.floor((width * height) / 22000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.6 + 0.6,
        hue: Math.random() > 0.5 ? '0, 229, 255' : '168, 85, 247',
      }));
    }

    function step() {
      ctx.clearRect(0, 0, width, height);
      const linkDist = 140;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x, dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            ctx.strokeStyle = `rgba(${n.hue}, ${0.14 * (1 - dist / linkDist)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${n.hue}, 0.85)`;
        ctx.shadowColor = `rgba(${n.hue}, 0.9)`;
        ctx.shadowBlur = 6;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!prefersReducedMotion) requestAnimationFrame(step);
    }

    resize();
    window.addEventListener('resize', resize);
    step();
    if (prefersReducedMotion) {
      ctx.clearRect(0, 0, width, height);
      for (const n of nodes) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${n.hue}, 0.6)`;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ------------------------------------------------------------------
   * 13. INIT
   * ------------------------------------------------------------------ */
  function init() {
    renderForm();
    initNavToggle();
    initNeuralBackground();
    checkApiHealth();

    els.form.addEventListener('submit', handlePredictSubmit);
    els.resetBtn.addEventListener('click', handleReset);
    els.retryBtn.addEventListener('click', () => showResultState('idle'));

    setInterval(checkApiHealth, 30000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();