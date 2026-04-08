// Certificados e Notificações — IndusTrain
let certificados = [];
let matriculas = [];
let treinamentos = [];
let colaboradores = [];
let notificacoes = [];
let elegiveis = [];
let selectedEmitir = new Set();
let activeTab = "certificados";
let certToShow = null;

const COLORS = [
  "#F5A623",
  "#3498DB",
  "#2ECC71",
  "#E74C3C",
  "#9B59B6",
  "#1ABC9C",
  "#E67E22",
  "#2980B9",
];

function toast(msg, type = "info") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove("show"), 2800);
}
function setDb(state) {
  document.getElementById("db-dot").className = "db-dot " + state;
  document.getElementById("db-label").textContent =
    state === "ok" ? "Supabase · online" : "Erro de conexão";
}
function initials(n) {
  return (n || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function colorFor(n) {
  let h = 0;
  for (let c of n || "") h = (h * 31 + c.charCodeAt(0)) % COLORS.length;
  return COLORS[h];
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function loadAll() {
  try {
    const [cert, mat, trein, colab] = await Promise.all([
      api.get("certificados?select=*,matriculas(*,colaboradores(nome,setor,cargo),treinamentos(nome,area,carga_horaria,instrutor))&order=emitido_em&asc=false"),
      api.get("matriculas?select=*,colaboradores(nome,setor,cargo),treinamentos(nome,area,carga_horaria,instrutor)&order=created_at&asc=false"),
      api.get("treinamentos?select=id,nome,area,status&order=nome&asc=true"),
      api.get("colaboradores?select=id,nome,setor,cargo,email&order=nome&asc=true"),
    ]);

    setDb("ok");
    certificados = cert || [];
    matriculas = mat || [];
    treinamentos = trein || [];
    colaboradores = colab || [];
    const certMatIds = new Set(certificados.map((c) => c.matricula_id));
    elegiveis = matriculas.filter(
      (m) => m.status === "concluido" && !certMatIds.has(m.id),
    );
    gerarNotificacoesAuto();
    updateKPIs();
    populateFilters();
    renderActive();
    document.getElementById("nav-cert").textContent = certificados.length;
    document.getElementById("nav-notif").textContent = notificacoes.length;
    document.getElementById("tc-cert").textContent = certificados.length;
    document.getElementById("tc-elig").textContent = elegiveis.length;
    document.getElementById("tc-notif").textContent = notificacoes.length;
    document.getElementById("topbar-sub").textContent =
      `${certificados.length} certificados emitidos · ${elegiveis.length} colaboradores elegíveis`;
  } catch (err) {
    setDb("err");
    toast("Erro ao carregar: " + err.message, "error");
  }
}

function gerarNotificacoesAuto() {
  notificacoes = [];
  if (elegiveis.length > 0)
    notificacoes.push({
      tipo: "certificado",
      prio: "info",
      titulo: `${elegiveis.length} colaborador(es) elegível(eis) para certificado`,
      desc: "Concluíram o treinamento e ainda não receberam certificado.",
      auto: true,
    });
  const semNota = matriculas.filter(
    (m) => m.status === "andamento" && m.nota == null,
  );
  if (semNota.length > 0)
    notificacoes.push({
      tipo: "avaliacao",
      prio: "warn",
      titulo: `${semNota.length} matrícula(s) em andamento sem avaliação`,
      desc: "Colaboradores em curso sem nota registrada.",
      auto: true,
    });
  const matTreinIds = new Set(matriculas.map((m) => m.treinamento_id));
  const semMat = treinamentos.filter(
    (t) => t.status === "ativo" && !matTreinIds.has(t.id),
  );
  if (semMat.length > 0)
    notificacoes.push({
      tipo: "prazo",
      prio: "warn",
      titulo: `${semMat.length} treinamento(s) ativo(s) sem matrículas`,
      desc: semMat.map((t) => t.nome).join(", "),
      auto: true,
    });
  const reprovados = matriculas.filter((m) => m.status === "reprovado");
  if (reprovados.length > 0)
    notificacoes.push({
      tipo: "presenca",
      prio: "error",
      titulo: `${reprovados.length} colaborador(es) reprovado(s)`,
      desc: "Verificar possibilidade de reingresso.",
      auto: true,
    });
}

function updateKPIs() {
  const colabComCert = new Set(
    certificados.map((c) => c.matriculas?.colaborador_id),
  ).size;
  document.getElementById("km-emitidos").textContent = certificados.length;
  document.getElementById("km-elegiveis").textContent = elegiveis.length;
  document.getElementById("km-alertas").textContent = notificacoes.filter(
    (n) => n.prio !== "info",
  ).length;
  document.getElementById("km-colab-cert").textContent = colabComCert;
}

function populateFilters() {
  const sel = document.getElementById("filter-trein");
  const cur = sel.value;
  sel.innerHTML =
    '<option value="">Todos os treinamentos</option>' +
    treinamentos
      .map(
        (t) =>
          `<option value="${t.id}"${t.id === cur ? " selected" : ""}>${t.nome}</option>`,
      )
      .join("");
}

function switchTab(tab) {
  activeTab = tab;
  document
    .getElementById("tab-cert")
    .classList.toggle("active", tab === "certificados");
  document
    .getElementById("tab-elig")
    .classList.toggle("active", tab === "elegiveis");
  document
    .getElementById("tab-notif")
    .classList.toggle("active", tab === "notificacoes");
  document.getElementById("page-title").textContent =
    tab === "certificados"
      ? "Certificados"
      : tab === "elegiveis"
        ? "Elegíveis para Certificado"
        : "Notificações";
  document.getElementById("search").value = "";
  renderActive();
}

function renderActive() {
  if (activeTab === "certificados") renderCertificados();
  else if (activeTab === "elegiveis") renderElegiveis();
  else renderNotificacoes();
}

function renderCertificados() {
  const q = document.getElementById("search").value.toLowerCase();
  const ft = document.getElementById("filter-trein").value;
  let filtered = certificados.filter((c) => {
    const nome = c.matriculas?.colaboradores?.nome || "";
    const trein = c.matriculas?.treinamentos?.nome || "";
    return (
      (!q ||
        nome.toLowerCase().includes(q) ||
        trein.toLowerCase().includes(q)) &&
      (!ft || c.matriculas?.treinamento_id === ft)
    );
  });
  document.getElementById("count-lbl").textContent =
    `${filtered.length} certificado${filtered.length !== 1 ? "s" : ""}`;
  if (filtered.length === 0) {
    document.getElementById("view-container").innerHTML =
      `<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">Nenhum certificado emitido</div><div style="font-size:13px;color:var(--text-muted);margin-top:6px">${elegiveis.length > 0 ? `Há ${elegiveis.length} colaborador(es) elegível(eis). Clique em "Emitir Certificados".` : "Colaboradores concluintes aparecerão aqui."}</div></div>`;
    return;
  }
  document.getElementById("view-container").innerHTML =
    `<div class="table-panel"><table class="data-table"><thead><tr><th>Colaborador</th><th>Treinamento</th><th>Área</th><th>Emitido em</th><th>Código</th><th style="width:80px"></th></tr></thead><tbody>${filtered
      .map((c) => {
        const nome = c.matriculas?.colaboradores?.nome || "—";
        const setor = c.matriculas?.colaboradores?.setor || "";
        const trein = c.matriculas?.treinamentos?.nome || "—";
        const area = c.matriculas?.treinamentos?.area || "—";
        const color = colorFor(nome);
        return `<tr><td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:${color}20;color:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${initials(nome)}</div><div><div style="font-size:13px;font-weight:600;color:var(--text)">${nome}</div><div style="font-size:11px;color:var(--text-faint)">${setor}</div></div></div></td><td style="font-size:13px;color:var(--text-muted);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trein}</td><td style="font-size:12px;color:var(--text-faint)">${area}</td><td style="font-size:13px;color:var(--text-muted);white-space:nowrap">${fmtDate(c.emitido_em)}</td><td><span style="font-size:10px;color:var(--text-faint);font-family:monospace;letter-spacing:.04em">${(c.codigo || "").slice(0, 16)}...</span></td><td><div class="row-actions"><button class="btn-icon print" onclick="showCert('${c.id}')" title="Visualizar certificado"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="btn-icon del" onclick="deleteCert('${c.id}')" title="Revogar certificado"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button></div></td></tr>`;
      })
      .join("")}</tbody></table></div>`;
}

function renderElegiveis() {
  const q = document.getElementById("search").value.toLowerCase();
  const ft = document.getElementById("filter-trein").value;
  let filtered = elegiveis.filter((m) => {
    const nome = m.colaboradores?.nome || "";
    const trein = m.treinamentos?.nome || "";
    return (
      (!q ||
        nome.toLowerCase().includes(q) ||
        trein.toLowerCase().includes(q)) &&
      (!ft || m.treinamento_id === ft)
    );
  });
  document.getElementById("count-lbl").textContent =
    `${filtered.length} elegível${filtered.length !== 1 ? "is" : ""}`;
  if (filtered.length === 0) {
    document.getElementById("view-container").innerHTML =
      `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">Nenhum pendente</div><div style="font-size:13px;color:var(--text-muted);margin-top:6px">Todos os concluintes já receberam seus certificados.</div></div>`;
    return;
  }
  document.getElementById("view-container").innerHTML =
    `<div class="table-panel"><table class="data-table"><thead><tr><th>Colaborador</th><th>Treinamento</th><th>Área</th><th>Nota</th><th style="text-align:center">Ação</th></tr></thead><tbody>${filtered
      .map((m) => {
        const nome = m.colaboradores?.nome || "—";
        const setor = m.colaboradores?.setor || "";
        const trein = m.treinamentos?.nome || "—";
        const area = m.treinamentos?.area || "—";
        const color = colorFor(nome);
        const nota =
          m.nota != null
            ? `<span style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;color:${m.nota >= 7 ? "var(--green)" : m.nota >= 5 ? "var(--accent)" : "var(--red)"}">${parseFloat(m.nota).toFixed(1)}</span>`
            : "—";
        return `<tr><td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:${color}20;color:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${initials(nome)}</div><div><div style="font-size:13px;font-weight:600;color:var(--text)">${nome}</div><div style="font-size:11px;color:var(--text-faint)">${setor}</div></div></div></td><td style="font-size:13px;color:var(--text-muted);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trein}</td><td style="font-size:12px;color:var(--text-faint)">${area}</td><td>${nota}</td><td style="text-align:center"><button class="btn-green btn-sm" onclick="emitirUm('${m.id}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>Emitir</button></td></tr>`;
      })
      .join("")}</tbody></table></div>`;
}

function renderNotificacoes() {
  document.getElementById("count-lbl").textContent =
    `${notificacoes.length} notificação${notificacoes.length !== 1 ? "ões" : ""}`;
  if (notificacoes.length === 0) {
    document.getElementById("view-container").innerHTML =
      `<div class="empty-state"><div class="empty-icon">🔔</div><div class="empty-title">Sem notificações</div><div style="font-size:13px;color:var(--text-muted);margin-top:6px">O sistema não detectou alertas no momento.</div></div>`;
    return;
  }
  const icons = {
    prazo: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5A623" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    presenca: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" stroke-width="2"><polyline points="17 1 21 5 13 13"/><path d="M7 1H2v5l14 13"/></svg>`,
    avaliacao: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5A623" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    certificado: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
    geral: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3498DB" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const bgMap = {
    prazo: "var(--accent-dim)",
    presenca: "var(--red-dim)",
    avaliacao: "var(--accent-dim)",
    certificado: "var(--green-dim)",
    geral: "var(--blue-dim)",
  };
  document.getElementById("view-container").innerHTML =
    `<div class="notif-list">${notificacoes.map((n, i) => `<div class="notif-card ${n.prio}"><div class="notif-icon" style="background:${bgMap[n.tipo] || "var(--surface2)"}">${icons[n.tipo] || icons.geral}</div><div class="notif-body"><div class="notif-title">${n.titulo}</div>${n.desc ? `<div class="notif-desc">${n.desc}</div>` : ""}<div class="notif-meta">${n.auto ? "🤖 Gerado automaticamente pelo sistema" : "👤 Criado manualmente"} · ${new Date().toLocaleDateString("pt-BR")}</div></div><div class="notif-action"><span class="pill ${n.prio === "error" ? "pill-emitido" : "pill-pendente"}" style="${n.prio === "error" ? "background:var(--red-dim);color:var(--red)" : n.prio === "info" ? "background:var(--blue-dim);color:var(--blue)" : ""}"><span class="dot"></span>${n.prio === "error" ? "Urgente" : n.prio === "warn" ? "Atenção" : "Info"}</span>${!n.auto ? `<button class="btn-secondary btn-sm" onclick="removeNotif(${i})" style="color:var(--red);border-color:rgba(231,76,60,.3)">Remover</button>` : ""}</div></div>`).join("")}</div><div style="text-align:center;margin-top:8px"><button class="btn-secondary" onclick="openNotifModal()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Criar notificação manual</button></div>`;
}

function openEmitirModal() {
  selectedEmitir = new Set();
  document.getElementById("em-trein").innerHTML =
    '<option value="">Todos os concluídos</option>' +
    treinamentos
      .map((t) => `<option value="${t.id}">${t.nome}</option>`)
      .join("");
  renderEmitirList();
  document.getElementById("overlay-emitir").classList.add("open");
}
function closeEmitirModal() {
  document.getElementById("overlay-emitir").classList.remove("open");
}

function renderEmitirList() {
  const ft = document.getElementById("em-trein").value;
  const list = elegiveis.filter((m) => !ft || m.treinamento_id === ft);
  selectedEmitir = new Set(list.map((m) => m.id));
  updateEmCount();
  if (list.length === 0) {
    document.getElementById("emitir-list").innerHTML =
      '<div style="color:var(--text-faint);font-size:13px;padding:12px 0">Nenhum elegível para este filtro.</div>';
    return;
  }
  document.getElementById("emitir-list").innerHTML = list
    .map((m) => {
      const nome = m.colaboradores?.nome || "—";
      const trein = m.treinamentos?.nome || "—";
      const color = colorFor(nome);
      return `<div class="eligible-card"><div class="check-box checked" id="chk-${m.id}" onclick="toggleEmitir('${m.id}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div><div style="width:32px;height:32px;border-radius:50%;background:${color}20;color:${color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${initials(nome)}</div><div class="eligible-info"><div class="eligible-name">${nome}</div><div class="eligible-sub">${trein} ${m.nota != null ? "· Nota " + parseFloat(m.nota).toFixed(1) : ""}</div></div>${m.nota != null ? `<span style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;color:${m.nota >= 7 ? "var(--green)" : m.nota >= 5 ? "var(--accent)" : "var(--red)"}">${parseFloat(m.nota).toFixed(1)}</span>` : ""}</div>`;
    })
    .join("");
}

function toggleEmitir(id) {
  if (selectedEmitir.has(id)) selectedEmitir.delete(id);
  else selectedEmitir.add(id);
  const chk = document.getElementById("chk-" + id);
  chk.classList.toggle("checked", selectedEmitir.has(id));
  chk.innerHTML = selectedEmitir.has(id)
    ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
    : "";
  updateEmCount();
}

function selectAllEligible(sel) {
  const ft = document.getElementById("em-trein").value;
  elegiveis
    .filter((m) => !ft || m.treinamento_id === ft)
    .forEach((m) => {
      if (sel) selectedEmitir.add(m.id);
      else selectedEmitir.delete(m.id);
      const chk = document.getElementById("chk-" + m.id);
      if (chk) {
        chk.classList.toggle("checked", sel);
        chk.innerHTML = sel
          ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
          : "";
      }
    });
  updateEmCount();
}

function updateEmCount() {
  document.getElementById("em-count").textContent =
    `${selectedEmitir.size} selecionado${selectedEmitir.size !== 1 ? "s" : ""}`;
}

async function emitirCertificados() {
  if (selectedEmitir.size === 0) {
    toast("Selecione ao menos um colaborador", "error");
    return;
  }
  document.getElementById("btn-emitir").disabled = true;
  try {
    const inserts = [...selectedEmitir].map((matId) => ({
      matricula_id: matId,
    }));
    await api.post("certificados", inserts);
    toast(
      `${inserts.length} certificado${inserts.length !== 1 ? "s" : ""} emitido${inserts.length !== 1 ? "s" : ""}!`,
      "success",
    );
    closeEmitirModal();
    await loadAll();
    renderActive();
  } catch (err) {
    toast("Erro: " + err.message, "error");
  } finally {
    document.getElementById("btn-emitir").disabled = false;
  }
}

async function emitirUm(matId) {
  try {
    await api.post("certificados", { matricula_id: matId });
    toast("Certificado emitido!", "success");
    await loadAll();
    renderActive();
  } catch (err) {
    toast("Erro: " + err.message, "error");
  }
}

async function deleteCert(id) {
  if (
    !confirm(
      "Revogar este certificado?\nO colaborador perderá o acesso ao documento.",
    )
  )
    return;
  try {
    await api.delete(`certificados/${id}`);
    toast("Certificado revogado.", "success");
    await loadAll();
    renderActive();
  } catch (err) {
    toast("Erro: " + err.message, "error");
  }
}

function showCert(certId) {
  const c = certificados.find((x) => x.id === certId);
  if (!c) return;
  certToShow = c;
  const nome = c.matriculas?.colaboradores?.nome || "—";
  const trein = c.matriculas?.treinamentos?.nome || "—";
  const area = c.matriculas?.treinamentos?.area || "—";
  const carga = c.matriculas?.treinamentos?.carga_horaria || "—";
  document.getElementById("cert-modal-sub").textContent = `${nome} · ${trein}`;
  document.getElementById("cert-nome").textContent = nome;
  document.getElementById("cert-curso").textContent = trein;
  document.getElementById("cert-carga").textContent = carga;
  document.getElementById("cert-area").textContent = area;
  document.getElementById("cert-data").textContent = fmtDate(c.emitido_em);
  document.getElementById("cert-code").textContent =
    "Código: " + (c.codigo || "").slice(0, 20).toUpperCase();
  document.getElementById("cert-emitido-em").textContent =
    "Emitido em " + fmtDate(c.emitido_em);
  document.getElementById("overlay-cert").classList.add("open");
}

function closeCertModal() {
  document.getElementById("overlay-cert").classList.remove("open");
}

function printCert() {
  const paper = document.getElementById("cert-paper");
  const w = window.open("", "_blank", "width=900,height=700");
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&family=Playfair+Display:wght@400;600&display=swap" rel="stylesheet"><style>body{margin:0;padding:40px;background:#fff;font-family:'Barlow',sans-serif}@media print{body{padding:0}}</style></head><body>${paper.outerHTML}</body></html>`,
  );
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print();
  }, 800);
}

function openNotifModal() {
  document.getElementById("n-colab").innerHTML =
    '<option value="">Todos</option>' +
    colaboradores
      .map((c) => `<option value="${c.id}">${c.nome}</option>`)
      .join("");
  document.getElementById("n-trein").innerHTML =
    '<option value="">Todos</option>' +
    treinamentos
      .map((t) => `<option value="${t.id}">${t.nome}</option>`)
      .join("");
  document.getElementById("n-titulo").value = "";
  document.getElementById("n-desc").value = "";
  document.getElementById("overlay-notif").classList.add("open");
}
function closeNotifModal() {
  document.getElementById("overlay-notif").classList.remove("open");
}

function saveNotificacao() {
  const titulo = document.getElementById("n-titulo").value.trim();
  if (!titulo) {
    toast("Título obrigatório", "error");
    return;
  }
  notificacoes.push({
    tipo: document.getElementById("n-tipo").value,
    prio: document.getElementById("n-prio").value,
    titulo,
    desc: document.getElementById("n-desc").value.trim(),
    auto: false,
  });
  document.getElementById("tc-notif").textContent = notificacoes.length;
  document.getElementById("nav-notif").textContent = notificacoes.length;
  toast("Notificação registrada!", "success");
  closeNotifModal();
  if (activeTab === "notificacoes") renderNotificacoes();
}

function removeNotif(i) {
  notificacoes.splice(i, 1);
  document.getElementById("tc-notif").textContent = notificacoes.length;
  document.getElementById("nav-notif").textContent = notificacoes.length;
  renderNotificacoes();
}

loadAll();
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeEmitirModal();
    closeCertModal();
    closeNotifModal();
  }
});
