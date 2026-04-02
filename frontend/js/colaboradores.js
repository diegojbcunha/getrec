// Colaboradores — IndusTrain
let colabs = [],
  matriculas = [],
  treinamentos = [],
  editColabId = null,
  matColabId = null,
  ativoToggle = true,
  activeTab = "colaboradores";
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
function toast(m, t = "info") {
  const e = document.getElementById("toast");
  e.textContent = m;
  e.className = `toast ${t} show`;
  setTimeout(() => e.classList.remove("show"), 2800);
}
function setDb(s) {
  document.getElementById("db-dot").className = "db-dot " + s;
  document.getElementById("db-label").textContent =
    s === "ok" ? "Supabase · online" : "Erro de conexão";
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
function notaBadge(n) {
  if (n == null) return '<span style="color:var(--text-faint)">—</span>';
  const v = parseFloat(n);
  const c =
    v >= 9 ? "nota-a" : v >= 7 ? "nota-b" : v >= 5 ? "nota-c" : "nota-d";
  return `<span class="nota-badge ${c}">${v.toFixed(1)}</span>`;
}
function pillMat(s) {
  const m = {
    matriculado: ["pill-mat", "Matriculado"],
    andamento: ["pill-andamento", "Em andamento"],
    concluido: ["pill-concluido", "Concluído"],
    reprovado: ["pill-reprovado", "Reprovado"],
  };
  const [cls, lbl] = m[s] || ["pill-mat", s];
  return `<span class="pill ${cls}"><span class="dot"></span>${lbl}</span>`;
}
function closeIfBg(e, id) {
  if (e.target.id === id) {
    if (id === "overlay-colab") closeColabModal();
    else closeMatModal();
  }
}
async function loadAll() {
  try {
    const [colabData, matData, treinData] = await Promise.all([
      api.get("colaboradores?order=nome&asc=true"),
      api.get("matriculas?select=*,colaboradores(nome,setor),treinamentos(nome,area,status)&order=created_at&asc=false"),
      api.get("treinamentos?select=id,nome,area,status&order=nome&asc=true"),
    ]);

    setDb("ok");
    colabs = colabData || [];
    matriculas = matData || [];
    treinamentos = treinData || [];
    updateKPIs();
    populateFilters();
    renderActive();
    document.getElementById("nav-colab").textContent = colabs.length;
    document.getElementById("nav-mat").textContent = matriculas.length;
    document.getElementById("tc-colab").textContent = colabs.length;
    document.getElementById("tc-mat").textContent = matriculas.length;
    document.getElementById("topbar-sub").textContent =
      `${colabs.length} colaboradores · ${matriculas.length} matrículas`;
  } catch (err) {
    setDb("err");
    toast("Erro ao carregar: " + err.message, "error");
  }
}
function updateKPIs() {
  document.getElementById("km-colab").textContent = colabs.length;
  document.getElementById("km-ativos").textContent = colabs.filter(
    (c) => c.ativo,
  ).length;
  document.getElementById("km-mat").textContent = matriculas.length;
  document.getElementById("km-concluidos").textContent = matriculas.filter(
    (m) => m.status === "concluido",
  ).length;
}
function populateFilters() {
  const setores = [
    ...new Set(colabs.map((c) => c.setor).filter(Boolean)),
  ].sort();
  const f1 = document.getElementById("filter1");
  const cur = f1.value;
  if (activeTab === "colaboradores") {
    f1.innerHTML =
      '<option value="">Todos os setores</option>' +
      setores
        .map(
          (s) =>
            `<option value="${s}"${s === cur ? " selected" : ""}>${s}</option>`,
        )
        .join("");
    document.getElementById("filter2").innerHTML =
      '<option value="">Todos os status</option><option value="ativo">Ativo</option><option value="inativo">Inativo</option>';
  } else {
    const areas = [
      ...new Set(treinamentos.map((t) => t.area).filter(Boolean)),
    ].sort();
    f1.innerHTML =
      '<option value="">Todas as áreas</option>' +
      areas
        .map(
          (a) =>
            `<option value="${a}"${a === cur ? " selected" : ""}>${a}</option>`,
        )
        .join("");
    document.getElementById("filter2").innerHTML =
      '<option value="">Todos os status</option><option value="matriculado">Matriculado</option><option value="andamento">Em andamento</option><option value="concluido">Concluído</option><option value="reprovado">Reprovado</option>';
  }
}
function switchTab(tab) {
  activeTab = tab;
  document
    .getElementById("tab-colab")
    .classList.toggle("active", tab === "colaboradores");
  document
    .getElementById("tab-mat")
    .classList.toggle("active", tab === "matriculas");
  document.getElementById("page-title").textContent =
    tab === "colaboradores" ? "Colaboradores" : "Matrículas";
  document.getElementById("btn-novo").textContent =
    tab === "colaboradores" ? "Novo Colaborador" : "Nova Matrícula em Lote";
  document.getElementById("btn-novo").onclick =
    tab === "colaboradores"
      ? openColabModal
      : () => toast("Use o ícone de matrícula em cada colaborador", "info");
  document.getElementById("search").value = "";
  populateFilters();
  renderActive();
}
function renderActive() {
  if (activeTab === "colaboradores") renderColabs();
  else renderMatriculas();
}
function renderColabs() {
  const q = document.getElementById("search").value.toLowerCase();
  const fs = document.getElementById("filter1").value;
  const fa = document.getElementById("filter2").value;
  let filtered = colabs.filter((c) => {
    const mq =
      !q ||
      (c.nome || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.cargo || "").toLowerCase().includes(q);
    return (
      mq &&
      (!fs || c.setor === fs) &&
      (!fa || (fa === "ativo" ? c.ativo : !c.ativo))
    );
  });
  document.getElementById("count-lbl").textContent =
    `${filtered.length} colaborador${filtered.length !== 1 ? "es" : ""}`;
  if (filtered.length === 0) {
    document.getElementById("view-container").innerHTML =
      `<div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">Nenhum colaborador encontrado</div><div style="font-size:13px;color:var(--text-muted);margin-top:6px">Tente outro filtro ou cadastre um novo colaborador.</div></div>`;
    return;
  }
  const matByColab = {};
  matriculas.forEach((m) => {
    if (!matByColab[m.colaborador_id]) matByColab[m.colaborador_id] = [];
    matByColab[m.colaborador_id].push(m);
  });
  document.getElementById("view-container").innerHTML =
    `<div class="colabs-grid">${filtered
      .map((c) => {
        const color = colorFor(c.nome);
        const mats = matByColab[c.id] || [];
        const conc = mats.filter((m) => m.status === "concluido").length;
        return `<div class="colab-card" onclick="openMatModal('${c.id}')"><div class="colab-card-top"><div class="colab-avatar" style="background:${color}20;color:${color}">${initials(c.nome)}</div><div><div class="colab-name">${c.nome}</div><div class="colab-cargo">${c.cargo || "—"} ${c.matricula ? "· " + c.matricula : ""}</div></div><span class="pill ${c.ativo ? "pill-ativo" : "pill-inativo"}" style="margin-left:auto;flex-shrink:0"><span class="dot"></span>${c.ativo ? "Ativo" : "Inativo"}</span></div><div class="colab-card-meta"><div class="colab-meta-row"><span class="colab-meta-label">Setor</span><span class="colab-meta-val">${c.setor || "—"}</span></div><div class="colab-meta-row"><span class="colab-meta-label">Matrículas</span><span class="colab-meta-val">${mats.length} total · ${conc} concluído${conc !== 1 ? "s" : ""}</span></div>${c.email ? `<div class="colab-meta-row"><span class="colab-meta-label">E-mail</span><span class="colab-meta-val" style="font-size:11px">${c.email}</span></div>` : ""}</div><div class="colab-card-actions" onclick="event.stopPropagation()"><button class="btn-secondary btn-sm" style="flex:1" onclick="openColabModal('${c.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Editar</button><button class="btn-primary btn-sm" style="flex:1" onclick="openMatModal('${c.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/></svg>Matrículas</button></div></div>`;
      })
      .join("")}</div>`;
}
function renderMatriculas() {
  const q = document.getElementById("search").value.toLowerCase();
  const fa = document.getElementById("filter1").value;
  const fs = document.getElementById("filter2").value;
  let filtered = matriculas.filter((m) => {
    const nome = m.colaboradores?.nome || "";
    const trein = m.treinamentos?.nome || "";
    const area = m.treinamentos?.area || "";
    return (
      (!q ||
        nome.toLowerCase().includes(q) ||
        trein.toLowerCase().includes(q)) &&
      (!fa || area === fa) &&
      (!fs || m.status === fs)
    );
  });
  document.getElementById("count-lbl").textContent =
    `${filtered.length} matrícula${filtered.length !== 1 ? "s" : ""}`;
  if (filtered.length === 0) {
    document.getElementById("view-container").innerHTML =
      `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Nenhuma matrícula encontrada</div><div style="font-size:13px;color:var(--text-muted);margin-top:6px">Use os cards de colaboradores para gerenciar matrículas.</div></div>`;
    return;
  }
  document.getElementById("view-container").innerHTML =
    `<div class="table-panel"><table class="data-table"><thead><tr><th>Colaborador</th><th>Treinamento</th><th>Área</th><th>Status</th><th>Nota</th><th>Cadastro</th><th style="width:60px"></th></tr></thead><tbody>${filtered
      .map((m) => {
        const nome = m.colaboradores?.nome || "—";
        const color = colorFor(nome);
        const trein = m.treinamentos?.nome || "—";
        const area = m.treinamentos?.area || "—";
        const dt = new Date(m.created_at).toLocaleDateString("pt-BR");
        return `<tr><td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:${color}20;color:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${initials(nome)}</div><span style="font-size:13px;font-weight:600;color:var(--text)">${nome}</span></div></td><td style="font-size:13px;color:var(--text-muted);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trein}</td><td style="font-size:12px;color:var(--text-faint)">${area}</td><td>${pillMat(m.status)}</td><td>${notaBadge(m.nota)}</td><td style="font-size:12px;color:var(--text-faint)">${dt}</td><td><div class="row-actions"><button class="btn-icon del" onclick="deleteMatricula('${m.id}')" title="Remover matrícula"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button></div></td></tr>`;
      })
      .join("")}</tbody></table></div>`;
}
function toggleAtivo() {
  ativoToggle = !ativoToggle;
  document
    .getElementById("fc-ativo-toggle")
    .classList.toggle("on", ativoToggle);
  document.getElementById("fc-ativo-label").textContent = ativoToggle
    ? "Colaborador ativo"
    : "Colaborador inativo";
}
function openColabModal(id = null) {
  editColabId = id;
  const c = id ? colabs.find((x) => x.id === id) : null;
  document.getElementById("colab-modal-title").textContent = id
    ? "Editar Colaborador"
    : "Novo Colaborador";
  document.getElementById("fc-nome").value = c?.nome || "";
  document.getElementById("fc-matricula").value = c?.matricula || "";
  document.getElementById("fc-email").value = c?.email || "";
  document.getElementById("fc-setor").value = c?.setor || "";
  document.getElementById("fc-cargo").value = c?.cargo || "";
  ativoToggle = c ? c.ativo : true;
  document
    .getElementById("fc-ativo-toggle")
    .classList.toggle("on", ativoToggle);
  document.getElementById("fc-ativo-label").textContent = ativoToggle
    ? "Colaborador ativo"
    : "Colaborador inativo";
  document.getElementById("colab-del-wrap").innerHTML = id
    ? `<button class="btn-danger" onclick="deleteColab('${id}','${(c?.nome || "").replace(/'/g, "\\'")}')">Excluir</button>`
    : "";
  document.getElementById("overlay-colab").classList.add("open");
  setTimeout(() => document.getElementById("fc-nome").focus(), 80);
}
function closeColabModal() {
  document.getElementById("overlay-colab").classList.remove("open");
  editColabId = null;
}
async function saveColab() {
  const nome = document.getElementById("fc-nome").value.trim();
  if (!nome) {
    toast("Nome obrigatório", "error");
    return;
  }
  const payload = {
    nome,
    matricula: document.getElementById("fc-matricula").value.trim() || null,
    email: document.getElementById("fc-email").value.trim() || null,
    setor: document.getElementById("fc-setor").value || null,
    cargo: document.getElementById("fc-cargo").value.trim() || null,
    ativo: ativoToggle,
  };
  document.getElementById("btn-save-colab").disabled = true;
  try {
    if (editColabId) {
      await api.put(`colaboradores/${editColabId}`, payload);
      toast("Colaborador atualizado!", "success");
    } else {
      await api.post("colaboradores", payload);
      toast("Colaborador cadastrado!", "success");
    }
    closeColabModal();
    await loadAll();
  } catch (err) {
    toast("Erro: " + err.message, "error");
  } finally {
    document.getElementById("btn-save-colab").disabled = false;
  }
}
async function deleteColab(id, nome) {
  if (
    !confirm(
      `Excluir colaborador "${nome}"?\n\nIsso também removerá todas as matrículas associadas.`,
    )
  )
    return;
  try {
    await api.delete(`colaboradores/${id}`);
    toast("Colaborador excluído.", "success");
    closeColabModal();
    await loadAll();
  } catch (err) {
    toast("Erro: " + err.message, "error");
  }
}
async function openMatModal(colabId) {
  matColabId = colabId;
  const c = colabs.find((x) => x.id === colabId);
  document.getElementById("mat-modal-title").textContent =
    "Matrículas de " + (c?.nome || "—");
  document.getElementById("mat-modal-sub").textContent =
    (c?.cargo || "") + (c?.setor ? " · " + c.setor : "");
  document.getElementById("mat-nota-inp").value = "";
  document.getElementById("mat-status-sel").value = "matriculado";
  const jaMatriculados = matriculas
    .filter((m) => m.colaborador_id === colabId)
    .map((m) => m.treinamento_id);
  const disponiveis = treinamentos.filter(
    (t) => !jaMatriculados.includes(t.id) && t.status !== "encerrado",
  );
  document.getElementById("mat-trein-sel").innerHTML =
    '<option value="">— Selecionar treinamento —</option>' +
    disponiveis
      .map(
        (t) =>
          `<option value="${t.id}">${t.nome}${t.area ? " · " + t.area : ""}</option>`,
      )
      .join("");
  document.getElementById("overlay-mat").classList.add("open");
  renderMatList(colabId);
}
function renderMatList(colabId) {
  const mats = matriculas.filter((m) => m.colaborador_id === colabId);
  document.getElementById("mat-count-info").textContent =
    `${mats.length} matrícula${mats.length !== 1 ? "s" : ""} · ${mats.filter((m) => m.status === "concluido").length} concluída${mats.filter((m) => m.status === "concluido").length !== 1 ? "s" : ""}`;
  if (mats.length === 0) {
    document.getElementById("mat-list").innerHTML =
      '<div style="color:var(--text-faint);font-size:13px;padding:16px 0;text-align:center">Nenhuma matrícula encontrada.</div>';
    return;
  }
  document.getElementById("mat-list").innerHTML = mats
    .map((m) => {
      const trein = m.treinamentos?.nome || "—";
      const area = m.treinamentos?.area || "";
      return `<div class="mat-item"><div class="mat-trein"><div class="mat-trein-name">${trein}</div><div class="mat-trein-area">${area}</div></div>${notaBadge(m.nota)}<div>${pillMat(m.status)}</div><div class="mat-actions"><select class="filter-sel" style="padding:4px 8px;font-size:12px" onchange="updateMatStatus('${m.id}',this.value)"><option value="matriculado"${m.status === "matriculado" ? " selected" : ""}>Matriculado</option><option value="andamento"${m.status === "andamento" ? " selected" : ""}>Em andamento</option><option value="concluido"${m.status === "concluido" ? " selected" : ""}>Concluído</option><option value="reprovado"${m.status === "reprovado" ? " selected" : ""}>Reprovado</option></select><button class="btn-icon del" onclick="deleteMatricula('${m.id}')" title="Remover"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button></div></div>`;
    })
    .join("");
}
function closeMatModal() {
  document.getElementById("overlay-mat").classList.remove("open");
  matColabId = null;
}
async function addMatricula() {
  const treinId = document.getElementById("mat-trein-sel").value;
  const status = document.getElementById("mat-status-sel").value;
  const notaVal = document.getElementById("mat-nota-inp").value;
  if (!treinId) {
    toast("Selecione um treinamento", "error");
    return;
  }
  try {
    const { error } = await db
      .from("matriculas")
      .insert({
        colaborador_id: matColabId,
        treinamento_id: treinId,
        status,
        nota: notaVal !== "" ? parseFloat(notaVal) : null,
      });
    if (error) throw error;
    toast("Matrícula adicionada!", "success");
    await loadAll();
    renderMatList(matColabId);
    const jaMatriculados = matriculas
      .filter((m) => m.colaborador_id === matColabId)
      .map((m) => m.treinamento_id);
    const disponiveis = treinamentos.filter(
      (t) => !jaMatriculados.includes(t.id) && t.status !== "encerrado",
    );
    document.getElementById("mat-trein-sel").innerHTML =
      '<option value="">— Selecionar treinamento —</option>' +
      disponiveis
        .map(
          (t) =>
            `<option value="${t.id}">${t.nome}${t.area ? " · " + t.area : ""}</option>`,
        )
        .join("");
    document.getElementById("mat-nota-inp").value = "";
  } catch (err) {
    toast("Erro: " + err.message, "error");
  }
}
async function updateMatStatus(matId, newStatus) {
  try {
    const { error } = await db
      .from("matriculas")
      .update({ status: newStatus })
      .eq("id", matId);
    if (error) throw error;
    toast("Status atualizado!", "success");
    await loadAll();
    if (matColabId) renderMatList(matColabId);
  } catch (err) {
    toast("Erro: " + err.message, "error");
  }
}
async function deleteMatricula(matId) {
  if (!confirm("Remover esta matrícula?")) return;
  try {
    await api.delete(`matriculas/${matId}`);
    toast("Matrícula removida.", "success");
    await loadAll();
    if (matColabId) renderMatList(matColabId);
    if (activeTab === "matriculas") renderMatriculas();
  } catch (err) {
    toast("Erro: " + err.message, "error");
  }
}
loadAll();
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeColabModal();
    closeMatModal();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    openColabModal();
  }
});
