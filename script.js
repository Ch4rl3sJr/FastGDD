/* Mini GDD — GameJam Plus | Sem bibliotecas externas, servidor ou conta. */
(() => {
  'use strict';

  const STORAGE_KEY = 'gamejamplus_minigdd_v1';
  const form = document.getElementById('gdd-form');
  const screens = [...document.querySelectorAll('.form-step')];
  const stepItems = [...document.querySelectorAll('[data-go-step]')];
  const fields = [...form.querySelectorAll('[data-field]')];
  const themeRadios = [...form.querySelectorAll('input[name="tema"]')];
  const required = [...form.querySelectorAll('[data-required="true"]')];
  const headingNames = ['CONCEITO E NARRATIVA', 'REGRAS E PRIMEIRA FASE', 'ESCOPO E PRODUÇÃO', 'CONFERÊNCIA DO DOCUMENTO'];
  const checkLabels = [
    ['check_abre', 'O jogo abre e inicia'], ['check_controle', 'Os controles funcionam'],
    ['check_conclusao', 'Existe uma conclusão'], ['check_tema', 'O tema da jam está claro'],
    ['check_testes', 'Foi testado por outra pessoa'], ['check_build', 'Build ou link estão prontos']
  ];

  const sections = [
    { num: '01', title: 'Conceito e narrativa', questions: [
      ['01', 'Qual é a ideia do jogo em até três frases?', 'q01'],
      ['02', 'Como o tema escolhido aparece na jogabilidade?', 'q02'],
      ['03', 'Quem é o protagonista e qual é o seu objetivo?', 'q03'],
      ['04', 'Qual é a situação inicial ou conflito da aventura?', 'q04'],
      ['05', 'Que experiência o jogo quer proporcionar?', 'q05']
    ]},
    { num: '02', title: 'Controles, regras e primeira fase', questions: [
      ['06', 'Qual é o objetivo principal de quem joga?', 'q06'],
      ['07', 'O que o jogador faz repetidamente?', 'q07'],
      ['08', 'Quais são as três mecânicas essenciais?', ['mec1', 'mec2', 'mec3']],
      ['09', 'Como o jogador controla o jogo?', 'q09'],
      ['10', 'Quais são os principais desafios ou obstáculos?', 'q10'],
      ['11', 'Condição de vitória', 'vitoria'],
      ['11b', 'Condição de derrota / reinício', 'derrota'],
      ['12', 'Como será a primeira fase jogável?', 'q12']
    ]},
    { num: '03', title: 'Escopo e produção', questions: [
      ['13', 'Qual será o estilo visual e sonoro?', 'q13'],
      ['14', 'O que precisa existir no protótipo mínimo (MVP)?', 'q14'],
      ['15', 'Que ideias podem ficar para depois?', 'q15'],
      ['16', 'Como serão divididas as responsabilidades da equipe?', 'q16']
    ]}
  ];

  let activeStep = 0;
  let saveTimer;
  let toastTimer;

  function getValues() {
    const values = {};
    for (const field of fields) values[field.dataset.field] = field.type === 'checkbox' ? field.checked : field.value;
    values.tema = themeRadios.find(radio => radio.checked)?.value || '';
    return values;
  }

  function setValues(values) {
    if (!values || typeof values !== 'object') return;
    for (const field of fields) {
      const v = values[field.dataset.field];
      if (field.type === 'checkbox') field.checked = v === true;
      else field.value = typeof v === 'string' ? v : '';
    }
    themeRadios.forEach(radio => radio.checked = radio.value === values.tema);
    refresh();
  }

  function filled(el) {
    if (el.type === 'radio') return themeRadios.some(r => r.checked);
    if (el.type === 'checkbox') return el.checked;
    return el.value.trim().length > 0;
  }

  function refreshProgress() {
    const done = required.filter(filled).length;
    const total = required.length;
    const pct = Math.round(done * 100 / total);
    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('progress-percent').textContent = `${pct}%`;
    document.getElementById('progress-detail').textContent = `${done} de ${total} campos essenciais`;

    for (let i = 0; i < 3; i++) {
      const requiredHere = [...screens[i].querySelectorAll('[data-required="true"]')];
      stepItems[i].classList.toggle('is-done', requiredHere.length > 0 && requiredHere.every(filled));
    }
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), values: getValues() }));
      document.getElementById('save-label').textContent = 'Salvo neste navegador';
    } catch (_) {
      document.getElementById('save-label').textContent = 'Use Salvar JSON para manter uma cópia';
    }
  }

  function restoreLocal() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const obj = JSON.parse(stored);
        if (obj && obj.values) setValues(obj.values);
      }
    } catch (_) { /* Funciona também quando o armazenamento está indisponível. */ }
  }

  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 4200);
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function valueOrDefault(value) { return String(value || '').trim() || 'A definir'; }

  function appendQuestion(parent, number, label, field, values) {
    const item = el('div', 'doc-question');
    item.append(el('div', 'doc-question-label', `${number.replace('11b', '11 ·')}  ${label}`));
    const answer = el('p', 'doc-answer');
    if (Array.isArray(field)) {
      const list = el('ol', 'doc-mechanics');
      const effective = field.map(k => String(values[k] || '').trim()).filter(Boolean);
      for (const v of effective) list.append(el('li', '', v));
      if (list.children.length) answer.append(list);
      else { answer.classList.add('doc-empty'); answer.textContent = 'A definir'; }
    } else {
      const str = valueOrDefault(values[field]);
      answer.textContent = str;
      if (str === 'A definir') answer.classList.add('doc-empty');
    }
    item.append(answer);
    parent.append(item);
  }

  function buildDocument(values, mode = 'preview') {
    const root = el('div', `document-view ${mode === 'print' ? 'doc-for-print' : 'doc-for-preview'}`);
    const header = el('header', 'doc-header');
    header.append(el('div', 'doc-kicker', 'GAMEJAM PLUS / MINI GDD'));
    header.append(el('h1', '', valueOrDefault(values.jogo) === 'A definir' ? 'Nome do jogo a definir' : values.jogo.trim()));
    header.append(el('p', '', 'Mini Game Design Document · 1 objetivo / até 3 mecânicas / 1 fase jogável'));
    root.append(header);

    const meta = el('div', 'doc-meta');
    for (const [label, key] of [['Equipe', 'equipe'], ['Integrantes', 'integrantes'], ['Engine', 'engine'], ['Plataforma-alvo', 'plataforma']]) {
      const part = el('div', 'doc-meta-block');
      part.append(el('span', '', label));
      part.append(el('strong', '', valueOrDefault(values[key])));
      meta.append(part);
    }
    root.append(meta);
    const theme = el('div', 'doc-theme');
    theme.append(el('strong', '', 'Tema da jam: '));
    theme.append(document.createTextNode(valueOrDefault(values.tema)));
    root.append(theme);

    for (const group of sections) {
      const section = el('section', 'doc-section');
      const head = el('div', 'doc-section-heading');
      head.append(el('span', '', group.num));
      head.append(el('h2', '', group.title));
      section.append(head);
      for (const [number, label, field] of group.questions) appendQuestion(section, number, label, field, values);
      root.append(section);
    }

    const checklist = el('section', 'doc-section');
    const ch = el('div', 'doc-section-heading');
    ch.append(el('span', '', '✓'), el('h2', '', 'Checklist de entrega'));
    checklist.append(ch);
    const checks = el('div', 'doc-checks');
    for (const [key, label] of checkLabels) {
      const item = el('div', 'doc-check-item');
      item.append(el('span', 'tick', values[key] ? '☑' : '☐'));
      item.append(el('span', '', label));
      checks.append(item);
    }
    checklist.append(checks);
    root.append(checklist);
    const foot = el('footer', 'doc-footer');
    foot.append(el('span', '', 'Critério: é possível entender e jogar sem explicação longa?'));
    foot.append(el('span', '', `Atualizado em ${new Date().toLocaleDateString('pt-BR')}`));
    root.append(foot);
    return root;
  }

  function refreshDocuments() {
    const values = getValues();
    document.getElementById('preview-paper').replaceChildren(buildDocument(values, 'preview'));
    document.getElementById('print-document').replaceChildren(buildDocument(values, 'print'));
  }

  function refresh() {
    refreshProgress();
    refreshDocuments();
  }

  function showStep(index) {
    activeStep = Math.max(0, Math.min(3, index));
    screens.forEach((screen, n) => {
      screen.hidden = n !== activeStep;
      screen.classList.toggle('is-active', n === activeStep);
    });
    stepItems.forEach((button, n) => {
      button.classList.toggle('is-active', n === activeStep);
      if (n === activeStep) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    document.getElementById('stage-index').textContent = `ETAPA 0${activeStep + 1} / 04`;
    document.getElementById('stage-label').textContent = headingNames[activeStep];
    document.getElementById('prev-step').disabled = activeStep === 0;
    const next = document.getElementById('next-step');
    next.textContent = activeStep === 3 ? 'Gerar PDF ⇩' : 'Continuar →';
    document.getElementById('step-tip').textContent = activeStep === 3 ? 'Revisem o documento antes da entrega.' : 'Responda em equipe: clareza é mais importante que tamanho.';
    if (activeStep === 3) refreshDocuments();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function slug(text) {
    return String(text || 'projeto-gamejam').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'projeto-gamejam';
  }

  function downloadFile(content, mime, name) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function exportJSON() {
    const obj = { tipo: 'mini-gdd-gamejam-plus', versao: 1, exportadoEm: new Date().toISOString(), valores: getValues() };
    downloadFile(JSON.stringify(obj, null, 2), 'application/json;charset=utf-8', `MiniGDD_${slug(obj.valores.jogo)}.json`);
    toast('Projeto JSON salvo. Importe esse arquivo para continuar em outro dispositivo.');
  }

  function exportPDF() {
    refreshDocuments();
    toast('Na janela de impressão, selecione “Salvar como PDF” em Destino.');
    // Browser nativo: PDF com texto selecionável, margens A4 e paginação automática.
    window.requestAnimationFrame(() => window.print());
  }

  function importJSON(file) {
    if (!file) return;
    if (file.size > 1024 * 1024) { toast('Arquivo muito grande. Importe um JSON criado por este formulário.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        const vals = obj?.valores || obj?.values;
        if (!vals || typeof vals !== 'object' || Array.isArray(vals)) throw new Error('Formato inválido');
        const allowedKeys = new Set([...fields.map(f => f.dataset.field), 'tema']);
        if (!Object.keys(vals).some(k => allowedKeys.has(k))) throw new Error('Nenhum campo reconhecido');
        if (!window.confirm('Substituir as respostas atuais pelas respostas deste arquivo JSON?')) return;
        setValues(vals);
        saveLocal();
        showStep(0);
        toast('Projeto JSON importado. Agora você pode continuar editando.');
      } catch (_) { toast('Não foi possível importar. Confira se é um JSON do Mini GDD.'); }
    };
    reader.onerror = () => toast('Não foi possível ler o arquivo.');
    reader.readAsText(file, 'UTF-8');
  }

  form.addEventListener('input', () => {
    refreshProgress();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveLocal(); refreshDocuments(); }, 170);
  });
  form.addEventListener('change', () => { refresh(); saveLocal(); });
  form.addEventListener('submit', event => event.preventDefault());
  stepItems.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.goStep))));
  document.getElementById('brand-home').addEventListener('click', () => showStep(0));
  document.getElementById('prev-step').addEventListener('click', () => showStep(activeStep - 1));
  document.getElementById('next-step').addEventListener('click', () => activeStep === 3 ? exportPDF() : showStep(activeStep + 1));
  document.getElementById('export-pdf').addEventListener('click', exportPDF);
  document.getElementById('top-pdf').addEventListener('click', exportPDF);
  document.getElementById('export-json').addEventListener('click', exportJSON);
  document.getElementById('top-json').addEventListener('click', exportJSON);
  document.getElementById('load-json').addEventListener('click', () => document.getElementById('json-file').click());
  document.getElementById('json-file').addEventListener('change', event => {
    importJSON(event.target.files?.[0]);
    event.target.value = '';
  });
  document.getElementById('reset-all').addEventListener('click', () => {
    if (!window.confirm('Limpar todas as respostas deste Mini GDD? Salve o JSON antes se quiser guardar uma cópia.')) return;
    form.reset();
    refresh();
    saveLocal();
    showStep(0);
    toast('Respostas limpas. Um novo Mini GDD pode ser iniciado.');
  });

  restoreLocal();
  refresh();
  showStep(0);
})();
