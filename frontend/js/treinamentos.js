// Treinamentos — IndusTrain
const TABLE = "treinamentos";

let allData = [],
  editId = null,
  detailId = null;
const AREA_COLORS = {
  "Segurança do Trabalho": "#E74C3C",
  Elétrica: "#F5A623",
  Mecânica: "#3498DB",
  Qualidade: "#2ECC71",
  Manutenção: "#9B59B6",
  Logística: "#1ABC9C",
  Produção: "#E67E22",
  "TI Industrial": "#2980B9",
  "Meio Ambiente": "#27AE60",
  Liderança: "#8E44AD",
  Outro: "#7F8C8D",
};
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
function pill(s) {
  const m = {
    ativo: ["pill-ativo", "Ativo"],
    andamento: ["pill-andamento", "Em andamento"],
    encerrado: ["pill-encerrado", "Encerrado"],
  };
  const [cls, label] = m[s] || ["pill-encerrado", s];
  return `<span class="pill ${cls}"><span class="dot"></span>${label}</span>`;
}
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function areaBadge(a) {
  const c = AREA_COLORS[a] || "#7F8C8D";
  return `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:${c}20;color:${c}">${a || "—"}</span>`;
}
async function load() {
  try {
    const data = await api.get("treinamentos?order=created_at&asc=false");
    setDb("ok");
    allData = data || [];
    populateAreaFilter();
    renderKPIs();
    renderTable();
    document.getElementById("topbar-sub").textContent =
      `${allData.length} treinamento${allData.length !== 1 ? "s" : ""} cadastrado${allData.length !== 1 ? "s" : ""}`;
    document.getElementById("nav-count").textContent = allData.length;
  } catch (err) {
    setDb("err");
    toast("Erro ao carregar: " + err.message, "error");
  }
}
function populateAreaFilter() {
  const areas = [...new Set(allData.map((t) => t.area).filter(Boolean))].sort();
  const sel = document.getElementById("filter-area");
  const current = sel.value;
  sel.innerHTML =
    '<option value="">Todas as áreas</option>' +
    areas
      .map(
        (a) =>
          `<option value="${a}"${a === current ? " selected" : ""}>${a}</option>`,
      )
      .join("");
}
function renderKPIs() {
  document.getElementById("km-total").textContent = allData.length;
  document.getElementById("km-ativos").textContent = allData.filter(
    (t) => t.status === "ativo",
  ).length;
  document.getElementById("km-andamento").textContent = allData.filter(
    (t) => t.status === "andamento",
  ).length;
  document.getElementById("km-encerrados").textContent = allData.filter(
    (t) => t.status === "encerrado",
  ).length;
}
function renderTable() {
  const q = document.getElementById("search").value.toLowerCase();
  const fStatus = document.getElementById("filter-status").value;
  const fArea = document.getElementById("filter-area").value;
  const sortBy = document.getElementById("sort-by").value;
  let filtered = allData.filter((t) => {
    const matchQ =
      !q ||
      (t.nome || "").toLowerCase().includes(q) ||
      (t.area || "").toLowerCase().includes(q) ||
      (t.instrutor || "").toLowerCase().includes(q);
    const matchS = !fStatus || t.status === fStatus;
    const matchA = !fArea || t.area === fArea;
    return matchQ && matchS && matchA;
  });
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "nome") return (a.nome || "").localeCompare(b.nome || "");
    if (sortBy === "area") return (a.area || "").localeCompare(b.area || "");
    if (sortBy === "carga")
      return (b.carga_horaria || 0) - (a.carga_horaria || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });
  document.getElementById("count-label").textContent =
    `${filtered.length} treinamento${filtered.length !== 1 ? "s" : ""}`;
  const tbody = document.getElementById("tbody");
  const empty = document.getElementById("empty-state");
  if (filtered.length === 0) {
    tbody.innerHTML = "";
    document.querySelector(".data-table").style.display = "none";
    empty.style.display = "block";
    return;
  }
  document.querySelector(".data-table").style.display = "table";
  empty.style.display = "none";
  tbody.innerHTML = filtered
    .map(
      (t) =>
        `<tr><td><div class="t-name">${t.nome}</div><div class="t-sub">${areaBadge(t.area)}</div></td><td class="t-muted">${t.instrutor || '<span style="color:var(--red);font-size:12px">Não definido</span>'}</td><td class="t-small" style="white-space:nowrap">${t.carga_horaria ? t.carga_horaria + "h" : "—"}</td><td class="t-small" style="white-space:nowrap">${t.data_inicio || t.data_fim ? `${fmtDate(t.data_inicio)} → ${fmtDate(t.data_fim)}` : '<span style="color:var(--text-faint)">—</span>'}</td><td>${pill(t.status)}</td><td><div class="row-actions"><button class="btn-icon view" onclick="openDetail('${t.id}')" title="Ver detalhes"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="btn-icon" onclick="openModal('${t.id}')" title="Editar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-icon del" onclick="deleteTreinamento('${t.id}','${(t.nome || "").replace(/'/g, "\\'")}')" title="Excluir"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div></td></tr>`,
    )
    .join("");
}
function openDetail(id) {
  const t = allData.find((x) => x.id === id);
  if (!t) return;
  detailId = id;
  document.getElementById("detail-title").textContent = t.nome;
  document.getElementById("detail-body").innerHTML =
    `<div><div class="detail-section-title">Identificação</div><div class="detail-grid"><div class="detail-item"><div class="detail-item-label">Área</div><div class="detail-item-val">${t.area || "—"}</div></div><div class="detail-item"><div class="detail-item-label">Status</div><div class="detail-item-val">${pill(t.status)}</div></div><div class="detail-item"><div class="detail-item-label">Instrutor</div><div class="detail-item-val">${t.instrutor || "—"}</div></div><div class="detail-item"><div class="detail-item-label">Carga horária</div><div class="detail-item-val">${t.carga_horaria ? t.carga_horaria + "h" : "—"}</div></div></div></div><div><div class="detail-section-title">Cronograma</div><div class="detail-grid"><div class="detail-item"><div class="detail-item-label">Início</div><div class="detail-item-val">${fmtDate(t.data_inicio)}</div></div><div class="detail-item"><div class="detail-item-label">Término</div><div class="detail-item-val">${fmtDate(t.data_fim)}</div></div></div></div>${t.descricao ? `<div><div class="detail-section-title">Descrição</div><div class="detail-desc">${t.descricao}</div></div>` : ""}<div><div class="detail-section-title">Registro</div><div class="detail-grid"><div class="detail-item"><div class="detail-item-label">Cadastrado em</div><div class="detail-item-val" style="font-size:12px">${new Date(t.created_at).toLocaleDateString("pt-BR")}</div></div><div class="detail-item"><div class="detail-item-label">ID</div><div class="detail-item-val" style="font-size:10px;word-break:break-all">${t.id}</div></div></div></div>`;
  document.getElementById("detail-edit-btn").onclick = () => {
    closeDetail();
    openModal(id);
  };
  document.getElementById("detail-del-btn").onclick = () =>
    deleteTreinamento(id, t.nome);
  document.getElementById("detail-panel").classList.add("open");
}
function closeDetail() {
  document.getElementById("detail-panel").classList.remove("open");
  detailId = null;
}
function openModal(id = null) {
  editId = id;
  const t = id ? allData.find((x) => x.id === id) : null;
  document.getElementById("modal-title").textContent = id
    ? "Editar Treinamento"
    : "Novo Treinamento";
  document.getElementById("f-nome").value = t?.nome || "";
  document.getElementById("f-area").value = t?.area || "";
  document.getElementById("f-instrutor").value = t?.instrutor || "";
  document.getElementById("f-carga").value = t?.carga_horaria || "";
  document.getElementById("f-inicio").value = t?.data_inicio || "";
  document.getElementById("f-fim").value = t?.data_fim || "";
  document.getElementById("f-status").value = t?.status || "ativo";
  document.getElementById("f-vagas").value = t?.vagas || "";
  document.getElementById("f-descricao").value = t?.descricao || "";
  document.getElementById("modal-del-wrap").innerHTML = id
    ? `<button class="btn-danger" onclick="deleteTreinamento('${id}','${(t?.nome || "").replace(/'/g, "\\'")}')">Excluir</button>`
    : "";
  document.getElementById("overlay").classList.add("open");
  setTimeout(() => document.getElementById("f-nome").focus(), 80);
}
function closeModal() {
  document.getElementById("overlay").classList.remove("open");
  editId = null;
}
function closeIfBg(e) {
  if (e.target.id === "overlay") closeModal();
}
async function saveTreinamento() {
  const nome = document.getElementById("f-nome").value.trim();
  const area = document.getElementById("f-area").value;
  if (!nome || !area) {
    toast("Preencha nome e área", "error");
    return;
  }
  const payload = {
    nome,
    area,
    instrutor: document.getElementById("f-instrutor").value.trim() || null,
    carga_horaria: parseInt(document.getElementById("f-carga").value) || null,
    data_inicio: document.getElementById("f-inicio").value || null,
    data_fim: document.getElementById("f-fim").value || null,
    status: document.getElementById("f-status").value,
    descricao: document.getElementById("f-descricao").value.trim() || null,
  };
  document.getElementById("btn-save").disabled = true;
  try {
    if (editId) {
      await api.put(`treinamentos/${editId}`, payload);
      toast("Treinamento atualizado!", "success");
    } else {
      await api.post("treinamentos", payload);
      toast("Treinamento cadastrado!", "success");
    }
    closeModal();
    await load();
  } catch (err) {
    toast("Erro: " + err.message, "error");
  } finally {
    document.getElementById("btn-save").disabled = false;
  }
}
async function deleteTreinamento(id, nome) {
  if (
    !confirm(
      `Excluir "${nome}"?\n\nIsso também removerá todas as matrículas e presenças associadas.`,
    )
  )
    return;
  try {
    await api.delete(`treinamentos/${id}`);
    toast("Treinamento excluído.", "success");
    closeModal();
    closeDetail();
    await load();
  } catch (err) {
    toast("Erro ao excluir: " + err.message, "error");
  }
}
load();
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeDetail();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    openModal();
  }
});
