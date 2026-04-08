// Presenças e Avaliações — IndusTrain
let presencas = [],
  matriculas = [],
  treinamentos = [],
  colaboradores = [],
  activeTab = "presencas",
  chamadaState = {},
  chartInst = null;
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
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function closeIfBg(e, id) {
  if (e.target.id === id) {
    if (id === "overlay-chamada") closeChamadaModal();
    else closeAvalModal();
  }
}
function notaBadge(n) {
  if (n == null) return '<span style="color:var(--text-faint)">—</span>';
  const v = parseFloat(n);
  const c =
    v >= 9 ? "nota-a" : v >= 7 ? "nota-b-cls" : v >= 5 ? "nota-c" : "nota-d";
  return `<span class="nota-b ${c}">${v.toFixed(1)}</span>`;
}
async function loadAll() {
  try {
    const [p, m, t, c] = await Promise.all([
      api.get("presencas?select=*,matriculas(id,colaborador_id,treinamento_id,colaboradores(nome,setor),treinamentos(nome,area))&order=data&asc=false"),
      api.get("matriculas?select=*,colaboradores(nome,setor),treinamentos(nome,area,status)&order=created_at&asc=false"),
      api.get("treinamentos?select=id,nome,area,status&order=nome&asc=true"),
      api.get("colaboradores?select=id,nome,setor,cargo,ativo&order=nome&asc=true"),
    ]);

    setDb("ok");
    presencas = p || [];
    matriculas = m || [];
    treinamentos = t || [];
    colaboradores = c || [];
    updateKPIs();
    populateFilters();
    renderActive();
    document.getElementById("nav-pres").textContent = presencas.length;
    document.getElementById("tc-pres").textContent = presencas.length;
    document.getElementById("tc-aval").textContent = matriculas.filter(
      (m) => m.nota != null,
    ).length;
    document.getElementById("topbar-sub").textContent =
      `${presencas.length} registros de presença · ${matriculas.filter((m) => m.nota != null).length} avaliações`;
  } catch (err) {
    setDb("err");
    toast("Erro ao carregar: " + err.message, "error");
  }
}
function updateKPIs() {
  const pres = presencas.filter((p) => p.presente).length;
  const aus = presencas.filter((p) => !p.presente).length;
  const comNota = matriculas.filter((m) => m.nota != null);
  const media = comNota.length
    ? (
        comNota.reduce((s, m) => s + parseFloat(m.nota), 0) / comNota.length
      ).toFixed(1)
    : "—";
  const freq = presencas.length
    ? Math.round((pres / presencas.length) * 100)
    : 0;
  document.getElementById("km-presentes").textContent = pres;
  document.getElementById("km-ausentes").textContent = aus;
  document.getElementById("km-media").textContent = media;
  document.getElementById("km-freq").textContent = freq + "%";
}
function populateFilters() {
  const treinSel = document.getElementById("filter-trein");
  const cur = treinSel.value;
  treinSel.innerHTML =
    '<option value="">Todos os treinamentos</option>' +
    treinamentos
      .map(
        (t) =>
          `<option value="${t.id}"${t.id === cur ? " selected" : ""}>${t.nome}</option>`,
      )
      .join("");
  const extra = document.getElementById("filter-extra");
  if (activeTab === "presencas") {
    extra.innerHTML =
      '<option value="">Todos</option><option value="presente">Presentes</option><option value="ausente">Ausentes</option>';
  } else if (activeTab === "avaliacoes") {
    extra.innerHTML =
      '<option value="">Todos os resultados</option><option value="concluido">Aprovado</option><option value="reprovado">Reprovado</option><option value="andamento">Em andamento</option>';
  } else {
    extra.innerHTML =
      '<option value="">Todos</option>' +
      colaboradores
        .map((c) => `<option value="${c.id}">${c.nome}</option>`)
        .join("");
  }
}
function switchTab(tab) {
  activeTab = tab;
  document
    .getElementById("tab-pres")
    .classList.toggle("active", tab === "presencas");
  document
    .getElementById("tab-aval")
    .classList.toggle("active", tab === "avaliacoes");
  document
    .getElementById("tab-rel")
    .classList.toggle("active", tab === "relatorio");
  document.getElementById("search").value = "";
  populateFilters();
  renderActive();
}
function renderActive() {
  if (activeTab === "presencas") renderPresencas();
  else if (activeTab === "avaliacoes") renderAvaliacoes();
  else renderRelatorio();
}
function renderPresencas() {
  const q = document.getElementById("search").value.toLowerCase();
  const ft = document.getElementById("filter-trein").value;
  const fe = document.getElementById("filter-extra").value;
  let filtered = presencas.filter((p) => {
    const nome = p.matriculas?.colaboradores?.nome || "";
    const trein = p.matriculas?.treinamentos?.nome || "";
    return (
      (!q ||
        nome.toLowerCase().includes(q) ||
        trein.toLowerCase().includes(q)) &&
      (!ft || p.matriculas?.treinamento_id === ft) &&
      (!fe || (fe === "presente" ? p.presente : !p.presente))
    );
  });
  document.getElementById("count-lbl").textContent =
    `${filtered.length} registro${filtered.length !== 1 ? "s" : ""}`;
  if (filtered.length === 0) {
    document.getElementById("view-container").innerHTML =
      `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Nenhum registro encontrado</div><div style="font-size:13px;color:var(--text-muted);margin-top:6px">Registre uma chamada para começar.</div></div>`;
    return;
  }
  document.getElementById("view-container").innerHTML =
    `<div class="table-panel"><table class="data-table"><thead><tr><th>Colaborador</th><th>Treinamento</th><th>Data</th><th>Presença</th><th>Observação</th><th style="width:60px"></th></tr></thead><tbody>${filtered
      .map((p) => {
        const nome = p.matriculas?.colaboradores?.nome || "—";
        const setor = p.matriculas?.colaboradores?.setor || "";
        const trein = p.matriculas?.treinamentos?.nome || "—";
        const color = colorFor(nome);
        return `<tr><td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:${color}20;color:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${initials(nome)}</div><div><div style="font-size:13px;font-weight:600;color:var(--text)">${nome}</div><div style="font-size:11px;color:var(--text-faint)">${setor}</div></div></div></td><td style="font-size:13px;color:var(--text-muted);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trein}</td><td style="font-size:13px;color:var(--text-muted);white-space:nowrap">${fmtDate(p.data)}</td><td><span class="pill ${p.presente ? "pill-pres" : "pill-aus"}"><span class="dot"></span>${p.presente ? "Presente" : "Ausente"}</span></td><td style="font-size:12px;color:var(--text-faint)">${p.observacao || "—"}</td><td><div class="row-actions"><button class="btn-icon del" onclick="deletePresenca('${p.id}')" title="Excluir"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button></div></td></tr>`;
      })
      .join("")}</tbody></table></div>`;
}
function renderAvaliacoes() {
  const q = document.getElementById("search").value.toLowerCase();
  const ft = document.getElementById("filter-trein").value;
  const fe = document.getElementById("filter-extra").value;
  let filtered = matriculas
    .filter((m) => {
      const nome = m.colaboradores?.nome || "";
      const trein = m.treinamentos?.nome || "";
      return (
        (!q ||
          nome.toLowerCase().includes(q) ||
          trein.toLowerCase().includes(q)) &&
        (!ft || m.treinamento_id === ft) &&
        (!fe || m.status === fe)
      );
    })
    .sort((a, b) => (b.nota || 0) - (a.nota || 0));
  document.getElementById("count-lbl").textContent =
    `${filtered.length} colaborador${filtered.length !== 1 ? "es" : ""}`;
  if (filtered.length === 0) {
    document.getElementById("view-container").innerHTML =
      `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Nenhuma avaliação encontrada</div><div style="font-size:13px;color:var(--text-muted);margin-top:6px">Registre avaliações para visualizá-las aqui.</div></div>`;
    return;
  }
  const freqMap = {};
  presencas.forEach((p) => {
    const mid = p.matriculas?.id;
    if (!mid) return;
    if (!freqMap[mid]) freqMap[mid] = { total: 0, pres: 0 };
    freqMap[mid].total++;
    if (p.presente) freqMap[mid].pres++;
  });
  const statusLabel = {
    concluido: "Aprovado",
    reprovado: "Reprovado",
    andamento: "Em andamento",
    matriculado: "Pendente",
  };
  const statusPill = {
    concluido: "pill-apr",
    reprovado: "pill-rep",
    andamento: "pill-pend",
    matriculado: "pill-pend",
  };
  document.getElementById("view-container").innerHTML =
    `<div class="table-panel"><table class="data-table"><thead><tr><th>Colaborador</th><th>Treinamento</th><th>Nota</th><th>Frequência</th><th>Resultado</th><th style="width:60px"></th></tr></thead><tbody>${filtered
      .map((m) => {
        const nome = m.colaboradores?.nome || "—";
        const setor = m.colaboradores?.setor || "";
        const trein = m.treinamentos?.nome || "—";
        const color = colorFor(nome);
        const freq = freqMap[m.id];
        const freqPct = freq
          ? Math.round((freq.pres / freq.total) * 100)
          : null;
        const fcol =
          freqPct === null
            ? "var(--text-faint)"
            : freqPct >= 75
              ? "var(--green)"
              : freqPct >= 50
                ? "var(--accent)"
                : "var(--red)";
        const pclass = statusPill[m.status] || "pill-pend";
        const plabel = statusLabel[m.status] || m.status;
        return `<tr><td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:${color}20;color:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${initials(nome)}</div><div><div style="font-size:13px;font-weight:600;color:var(--text)">${nome}</div><div style="font-size:11px;color:var(--text-faint)">${setor}</div></div></div></td><td style="font-size:13px;color:var(--text-muted);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trein}</td><td>${notaBadge(m.nota)}</td><td>${freqPct !== null ? `<div class="perc-wrap"><div class="perc-bar"><div class="perc-fill" style="width:${freqPct}%;background:${fcol}"></div></div><span class="perc-label" style="color:${fcol}">${freqPct}%</span></div>` : '<span style="color:var(--text-faint);font-size:12px">Sem registros</span>'}</td><td><span class="pill ${pclass}"><span class="dot"></span>${plabel}</span></td><td><div class="row-actions"><button class="btn-icon" onclick="editAvaliacao('${m.id}')" title="Editar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div></td></tr>`;
      })
      .join("")}</tbody></table></div>`;
}
function renderRelatorio() {
  const q = document.getElementById("search").value.toLowerCase();
  const colabId = document.getElementById("filter-extra").value;
  document.getElementById("filter-trein").value = "";
  document.getElementById("count-lbl").textContent = "";
  let colabsF = colaboradores.filter(
    (c) =>
      (!q || c.nome.toLowerCase().includes(q)) &&
      (!colabId || c.id === colabId),
  );
  if (colabsF.length === 0) {
    document.getElementById("view-container").innerHTML =
      `<div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">Nenhum colaborador</div></div>`;
    return;
  }
  const freqMap = {};
  presencas.forEach((p) => {
    const mid = p.matriculas?.id;
    if (!mid) return;
    if (!freqMap[mid]) freqMap[mid] = { total: 0, pres: 0 };
    freqMap[mid].total++;
    if (p.presente) freqMap[mid].pres++;
  });
  const cards = colabsF
    .map((c) => {
      const color = colorFor(c.nome);
      const mats = matriculas.filter((m) => m.colaborador_id === c.id);
      const notas = mats
        .filter((m) => m.nota != null)
        .map((m) => parseFloat(m.nota));
      const media = notas.length
        ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1)
        : null;
      const conc = mats.filter((m) => m.status === "concluido").length;
      const rows = mats
        .map((m) => {
          const freq = freqMap[m.id];
          const fp = freq ? Math.round((freq.pres / freq.total) * 100) : null;
          const fcol =
            fp === null
              ? "var(--text-faint)"
              : fp >= 75
                ? "var(--green)"
                : fp >= 50
                  ? "var(--accent)"
                  : "var(--red)";
          return `<tr style="border-top:1px solid var(--border)"><td style="padding:9px 14px;font-size:12px;color:var(--text);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.treinamentos?.nome || "—"}</td><td style="padding:9px 14px">${notaBadge(m.nota)}</td><td style="padding:9px 14px">${fp !== null ? `<div class="perc-wrap"><div class="perc-bar" style="min-width:50px"><div class="perc-fill" style="width:${fp}%;background:${fcol}"></div></div><span style="font-size:12px;font-weight:700;color:${fcol};min-width:32px;text-align:right">${fp}%</span></div>` : '<span style="color:var(--text-faint);font-size:11px">—</span>'}</td><td style="padding:9px 14px"><span class="pill ${m.status === "concluido" ? "pill-apr" : m.status === "reprovado" ? "pill-rep" : "pill-pend"}"><span class="dot"></span>${m.status === "concluido" ? "Aprovado" : m.status === "reprovado" ? "Reprovado" : "Em curso"}</span></td></tr>`;
        })
        .join("");
      return `<div class="panel"><div class="panel-header"><div style="display:flex;align-items:center;gap:12px"><div style="width:38px;height:38px;border-radius:50%;background:${color}20;color:${color};display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;flex-shrink:0">${initials(c.nome)}</div><div><div class="panel-title">${c.nome}</div><div class="panel-sub">${c.cargo || ""} ${c.setor ? "· " + c.setor : ""}</div></div></div><div style="display:flex;gap:20px;align-items:center"><div style="text-align:center"><div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:700;color:var(--text)">${mats.length}</div><div style="font-size:10px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.04em">Matrículas</div></div><div style="text-align:center"><div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:700;color:var(--green)">${conc}</div><div style="font-size:10px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.04em">Concluídos</div></div><div style="text-align:center"><div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:700;color:var(--accent)">${media || "—"}</div><div style="font-size:10px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.04em">Média geral</div></div></div></div>${mats.length > 0 ? `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.07em;background:var(--bg3);border-bottom:1px solid var(--border)">Treinamento</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.07em;background:var(--bg3);border-bottom:1px solid var(--border)">Nota</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.07em;background:var(--bg3);border-bottom:1px solid var(--border)">Frequência</th><th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:.07em;background:var(--bg3);border-bottom:1px solid var(--border)">Resultado</th></tr></thead><tbody>${rows}</tbody></table>` : `<div style="padding:16px 18px;font-size:13px;color:var(--text-faint)">Sem matrículas registradas.</div>`}</div>`;
    })
    .join("");
  document.getElementById("view-container").innerHTML =
    `<div style="display:flex;flex-direction:column;gap:14px">${cards}</div>`;
}
function openChamadaModal() {
  chamadaState = {};
  document.getElementById("ch-trein").innerHTML =
    '<option value="">— Selecionar —</option>' +
    treinamentos
      .filter((t) => t.status !== "encerrado")
      .map((t) => `<option value="${t.id}">${t.nome}</option>`)
      .join("");
  document.getElementById("ch-data").value = new Date()
    .toISOString()
    .slice(0, 10);
  document.getElementById("chamada-list").innerHTML =
    '<div style="color:var(--text-faint);font-size:13px;padding:12px 0">Selecione o treinamento para carregar os colaboradores.</div>';
  document.getElementById("ch-info").textContent = "—";
  document.getElementById("chamada-summary").textContent = "";
  document.getElementById("overlay-chamada").classList.add("open");
}
function closeChamadaModal() {
  document.getElementById("overlay-chamada").classList.remove("open");
  chamadaState = {};
}
async function loadChamadaColabs() {
  const treinId = document.getElementById("ch-trein").value;
  const data = document.getElementById("ch-data").value;
  if (!treinId) return;
  const mats = matriculas.filter((m) => m.treinamento_id === treinId);
  if (mats.length === 0) {
    document.getElementById("chamada-list").innerHTML =
      '<div style="color:var(--text-faint);font-size:13px;padding:12px 0">Nenhum colaborador matriculado neste treinamento.</div>';
    return;
  }
  for (const m of mats) {
    const existente = presencas.find(
      (p) => p.matriculas?.id === m.id && p.data === data,
    );
    chamadaState[m.id] = {
      presente: existente ? existente.presente : true,
      obs: existente?.observacao || "",
      existeId: existente?.id || null,
    };
  }
  document.getElementById("ch-info").textContent = data
    ? `Data: ${fmtDate(data)}`
    : "—";
  renderChamadaList(mats);
}
function renderChamadaList(mats) {
  document.getElementById("chamada-list").innerHTML = mats
    .map((m) => {
      const nome = m.colaboradores?.nome || "—";
      const setor = m.colaboradores?.setor || "";
      const color = colorFor(nome);
      const state = chamadaState[m.id] || { presente: true, obs: "" };
      return `<div class="chamada-item" id="ci-${m.id}"><div class="colab-av" style="background:${color}20;color:${color}">${initials(nome)}</div><div style="flex:1"><div class="colab-n">${nome}</div><div class="colab-setor">${setor}</div></div><input class="obs-inp" placeholder="Observação..." value="${state.obs}" oninput="chamadaState['${m.id}'].obs=this.value"><div class="presenca-toggle"><button class="ptog-btn ${state.presente ? "presente" : ""}" id="btn-p-${m.id}" onclick="setPresenca('${m.id}',true)">P</button><button class="ptog-btn ${!state.presente ? "ausente" : ""}" id="btn-a-${m.id}" onclick="setPresenca('${m.id}',false)">F</button></div></div>`;
    })
    .join("");
  updateChamadaSummary(mats.length);
}
function setPresenca(matId, presente) {
  chamadaState[matId].presente = presente;
  document.getElementById("btn-p-" + matId).className =
    "ptog-btn" + (presente ? " presente" : "");
  document.getElementById("btn-a-" + matId).className =
    "ptog-btn" + (!presente ? " ausente" : "");
  updateChamadaSummary(Object.keys(chamadaState).length);
}
function marcarTodos(presente) {
  Object.keys(chamadaState).forEach((id) => {
    chamadaState[id].presente = presente;
    document.getElementById("btn-p-" + id).className =
      "ptog-btn" + (presente ? " presente" : "");
    document.getElementById("btn-a-" + id).className =
      "ptog-btn" + (!presente ? " ausente" : "");
  });
  updateChamadaSummary(Object.keys(chamadaState).length);
}
function updateChamadaSummary(total) {
  const pres = Object.values(chamadaState).filter((s) => s.presente).length;
  document.getElementById("chamada-summary").textContent =
    `${pres} presente${pres !== 1 ? "s" : ""} / ${total - pres} falta${total - pres !== 1 ? "s" : ""}`;
}
async function saveChamada() {
  const treinId = document.getElementById("ch-trein").value;
  const data = document.getElementById("ch-data").value;
  if (!treinId || !data) {
    toast("Selecione treinamento e data", "error");
    return;
  }
  if (Object.keys(chamadaState).length === 0) {
    toast("Nenhum colaborador na chamada", "error");
    return;
  }
  document.getElementById("btn-save-chamada").disabled = true;
  try {
    const ops = Object.entries(chamadaState).map(([matId, state]) => {
      if (state.existeId) {
        return db
          .from("presencas")
          .update({ presente: state.presente, observacao: state.obs || null })
          .eq("id", state.existeId);
      } else {
        return db
          .from("presencas")
          .insert({
            matricula_id: matId,
            data,
            presente: state.presente,
            observacao: state.obs || null,
          });
      }
    });
    const results = await Promise.all(ops);
    const erros = results.filter((r) => r.error);
    if (erros.length) throw erros[0].error;
    toast(
      `Chamada salva! ${Object.values(chamadaState).filter((s) => s.presente).length} presentes.`,
      "success",
    );
    closeChamadaModal();
    await loadAll();
  } catch (err) {
    toast("Erro: " + err.message, "error");
  } finally {
    document.getElementById("btn-save-chamada").disabled = false;
  }
}
async function deletePresenca(id) {
  if (!confirm("Excluir este registro de presença?")) return;
  try {
    await api.delete(`presencas/${id}`);
    toast("Registro excluído.", "success");
    await loadAll();
  } catch (err) {
    toast("Erro: " + err.message, "error");
  }
}
function openAvalModal(matId = null) {
  document.getElementById("aval-modal-title").textContent = matId
    ? "Editar Avaliação"
    : "Registrar Avaliação";
  document.getElementById("av-trein").innerHTML =
    '<option value="">— Selecionar —</option>' +
    treinamentos
      .map((t) => `<option value="${t.id}">${t.nome}</option>`)
      .join("");
  document.getElementById("av-colab").innerHTML =
    '<option value="">— Selecionar treinamento primeiro —</option>';
  document.getElementById("av-nota").value = "";
  document.getElementById("av-obs").value = "";
  document.getElementById("av-data").value = new Date()
    .toISOString()
    .slice(0, 10);
  document.getElementById("av-status").value = "concluido";
  if (matId) {
    const m = matriculas.find((x) => x.id === matId);
    if (m) {
      document.getElementById("av-trein").value = m.treinamento_id;
      loadAvalColabs().then(() => {
        document.getElementById("av-colab").value = matId;
        document.getElementById("av-nota").value = m.nota || "";
        document.getElementById("av-status").value = m.status;
      });
    }
  }
  document.getElementById("overlay-aval").classList.add("open");
}
function closeAvalModal() {
  document.getElementById("overlay-aval").classList.remove("open");
}
async function loadAvalColabs() {
  const treinId = document.getElementById("av-trein").value;
  const mats = matriculas.filter((m) => m.treinamento_id === treinId);
  document.getElementById("av-colab").innerHTML =
    '<option value="">— Selecionar colaborador —</option>' +
    mats
      .map(
        (m) =>
          `<option value="${m.id}">${m.colaboradores?.nome || "—"}</option>`,
      )
      .join("");
}
async function saveAvaliacao() {
  const matId = document.getElementById("av-colab").value;
  const nota = document.getElementById("av-nota").value;
  const status = document.getElementById("av-status").value;
  if (!matId || nota === "") {
    toast("Selecione colaborador e informe a nota", "error");
    return;
  }
  const n = parseFloat(nota);
  if (isNaN(n) || n < 0 || n > 10) {
    toast("Nota deve ser entre 0 e 10", "error");
    return;
  }
  document.getElementById("btn-save-aval").disabled = true;
  try {
    const { error } = await db
      .from("matriculas")
      .update({ nota: n, status })
      .eq("id", matId);
    if (error) throw error;
    toast("Avaliação salva!", "success");
    closeAvalModal();
    await loadAll();
  } catch (err) {
    toast("Erro: " + err.message, "error");
  } finally {
    document.getElementById("btn-save-aval").disabled = false;
  }
}
function editAvaliacao(matId) {
  openAvalModal(matId);
}
loadAll();
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeChamadaModal();
    closeAvalModal();
  }
});
