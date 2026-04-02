// Dashboard ADM — IndusTrain
const SUPABASE_URL = "https://inflnnnbwwfxwapsprqc.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZmxubm5id3dmeHdhcHNwcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTUxMjYsImV4cCI6MjA5MDM5MTEyNn0.r9-5vG72aLQ6LWiCyQ98O6xVaLkeB7SekwBHVMHBLus";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);
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
const INST_COLORS = [
  "#F5A623",
  "#3498DB",
  "#2ECC71",
  "#E74C3C",
  "#9B59B6",
  "#1ABC9C",
];
let charts = {};
function toast(msg, type = "info") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove("show"), 2800);
}
function setDb(state, label) {
  document.getElementById("db-dot").className =
    "db-dot " + (state === "ok" ? "ok" : "err");
  document.getElementById("db-label").textContent = label;
}
function initDate() {
  const d = new Date();
  document.getElementById("today-date").textContent = d
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(/^\w/, (c) => c.toUpperCase());
}
function pill(status) {
  const map = {
    ativo: ["pill-ativo", "Ativo"],
    andamento: ["pill-andamento", "Em andamento"],
    encerrado: ["pill-encerrado", "Encerrado"],
    matriculado: ["pill-ativo", "Matriculado"],
    concluido: ["pill-concluido", "Concluído"],
    reprovado: ["pill-encerrado", "Reprovado"],
  };
  const [cls, label] = map[status] || ["pill-encerrado", status];
  return `<span class="pill ${cls}"><span class="dot"></span>${label}</span>`;
}
function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function makeChart(id, type, data) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id).getContext("2d");
  charts[id] = new Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: type === "doughnut" ? "65%" : undefined,
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: "#8B90A0",
            font: { family: "Barlow", size: 12 },
            padding: 14,
            usePointStyle: true,
            pointStyleWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: "#1C2030",
          titleColor: "#E8EAF0",
          bodyColor: "#8B90A0",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
        },
      },
      scales:
        type === "bar"
          ? {
              x: {
                ticks: {
                  color: "#8B90A0",
                  font: { family: "Barlow", size: 11 },
                },
                grid: { color: "rgba(255,255,255,0.04)" },
              },
              y: {
                ticks: {
                  color: "#8B90A0",
                  font: { family: "Barlow", size: 11 },
                },
                grid: { color: "rgba(255,255,255,0.04)" },
              },
            }
          : undefined,
    },
  });
}
async function loadAll() {
  toast("Atualizando dados...", "info");
  try {
    const [
      { data: treinamentos, error: e1 },
      { data: colaboradores, error: e2 },
      { data: matriculas, error: e3 },
      { data: certificados, error: e4 },
    ] = await Promise.all([
      db
        .from("treinamentos")
        .select("*")
        .order("created_at", { ascending: false }),
      db
        .from("colaboradores")
        .select("*")
        .order("created_at", { ascending: false }),
      db
        .from("matriculas")
        .select("*, colaboradores(nome, setor), treinamentos(nome, area)")
        .order("created_at", { ascending: false }),
      db.from("certificados").select("*"),
    ]);
    if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4;
    setDb("ok", "Supabase · online");
    renderAll(
      treinamentos || [],
      colaboradores || [],
      matriculas || [],
      certificados || [],
    );
    toast("Dashboard atualizado!", "success");
  } catch (err) {
    setDb("err", "Erro de conexão");
    document.getElementById("topbar-sub").textContent =
      "Erro ao carregar dados do Supabase";
    toast("Erro: " + err.message, "error");
  }
}
function renderAll(treinamentos, colaboradores, matriculas, certificados) {
  const total_t = treinamentos.length;
  const ativos_t = treinamentos.filter((t) => t.status === "ativo").length;
  const andamento = treinamentos.filter((t) => t.status === "andamento").length;
  const encerrados = treinamentos.filter(
    (t) => t.status === "encerrado",
  ).length;
  const total_c = colaboradores.length;
  const ativos_c = colaboradores.filter((c) => c.ativo).length;
  const total_m = matriculas.length;
  const concluidas = matriculas.filter((m) => m.status === "concluido").length;
  const total_cert = certificados.length;
  const alerts = [];
  if (andamento > 0)
    alerts.push({
      t: "info",
      msg: `${andamento} treinamento(s) em andamento`,
      sub: "Acompanhar progresso",
    });
  if (encerrados > 0)
    alerts.push({
      t: "warn",
      msg: `${encerrados} treinamento(s) encerrado(s)`,
      sub: "Revisar ou arquivar",
    });
  const semInstrutor = treinamentos.filter(
    (t) => !t.instrutor || t.instrutor.trim() === "",
  ).length;
  if (semInstrutor > 0)
    alerts.push({
      t: "error",
      msg: `${semInstrutor} treinamento(s) sem instrutor definido`,
      sub: "Atribuir responsável",
    });
  const semMatricula = treinamentos.filter(
    (t) =>
      t.status === "ativo" &&
      !matriculas.some((m) => m.treinamento_id === t.id),
  ).length;
  if (semMatricula > 0)
    alerts.push({
      t: "warn",
      msg: `${semMatricula} treinamento(s) ativo(s) sem matrículas`,
      sub: "Matricular colaboradores",
    });
  if (alerts.length === 0)
    alerts.push({
      t: "ok",
      msg: "Nenhum alerta crítico no momento",
      sub: "Sistema operando normalmente",
    });
  document.getElementById("k-treinamentos").textContent = total_t;
  document.getElementById("k-trein-sub").textContent =
    `${ativos_t} ativos · ${andamento} em andamento`;
  document.getElementById("k-colaboradores").textContent = total_c;
  document.getElementById("k-colab-sub").textContent = `${ativos_c} ativos`;
  document.getElementById("k-matriculas").textContent = total_m;
  document.getElementById("k-mat-sub").textContent = `${concluidas} concluídas`;
  document.getElementById("k-certificados").textContent = total_cert;
  document.getElementById("k-alertas").textContent =
    alerts.filter((a) => a.t !== "ok").length || "0";
  document.getElementById("nav-treinamentos").textContent = total_t;
  document.getElementById("nav-colaboradores").textContent = total_c;
  document.getElementById("nav-matriculas").textContent = total_m;
  document.getElementById("nav-certificados").textContent = total_cert;
  document.getElementById("alert-badge").textContent = alerts.length;
  document.getElementById("topbar-sub").textContent =
    `${total_t} treinamentos · ${total_c} colaboradores · ${total_m} matrículas · atualizado agora`;
  makeChart("chart-status", "doughnut", {
    labels: ["Ativos", "Em andamento", "Encerrados"],
    datasets: [
      {
        data: [ativos_t, andamento, encerrados],
        backgroundColor: ["#2ECC71", "#F5A623", "#4A5068"],
        borderColor: "#212636",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  });
  const matStatus = {};
  matriculas.forEach((m) => {
    matStatus[m.status] = (matStatus[m.status] || 0) + 1;
  });
  makeChart("chart-matriculas", "doughnut", {
    labels: Object.keys(matStatus).map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1),
    ),
    datasets: [
      {
        data: Object.values(matStatus),
        backgroundColor: ["#2ECC71", "#F5A623", "#E74C3C", "#3498DB"],
        borderColor: "#212636",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  });
  const areaCount = {};
  treinamentos.forEach((t) => {
    if (t.area) areaCount[t.area] = (areaCount[t.area] || 0) + 1;
  });
  const sorted = Object.entries(areaCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const max = sorted[0]?.[1] || 1;
  document.getElementById("area-list").innerHTML = sorted
    .map(
      ([area, count]) =>
        `<div class="area-item"><div class="area-top"><span class="area-name">${area}</span><span class="area-count">${count}</span></div><div class="area-bar-bg"><div class="area-bar-fill" style="width:${Math.round((count / max) * 100)}%;background:${AREA_COLORS[area] || "#F5A623"}"></div></div></div>`,
    )
    .join("");
  const instCount = {};
  treinamentos.forEach((t) => {
    if (t.instrutor) instCount[t.instrutor] = (instCount[t.instrutor] || 0) + 1;
  });
  const topInst = Object.entries(instCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  document.getElementById("rank-instrutores").innerHTML =
    topInst
      .map(([name, count], i) => {
        const color = INST_COLORS[i % INST_COLORS.length];
        return `<div class="rank-item"><div class="rank-num ${i < 3 ? "top" : ""}">${i + 1}</div><div class="rank-avatar" style="background:${color}20;color:${color}">${initials(name)}</div><div class="rank-info"><div class="rank-name">${name}</div><div class="rank-detail">${count} treinamento${count > 1 ? "s" : ""}</div></div><div class="rank-val" style="color:${color}">${count}</div></div>`;
      })
      .join("") ||
    '<div style="padding:16px;color:var(--text-faint);font-size:13px">Sem dados</div>';
  document.getElementById("alert-list").innerHTML = alerts
    .map(
      (a) =>
        `<div class="alert-item"><div class="alert-dot ${a.t}"></div><div><div class="alert-text">${a.msg}</div><div class="alert-meta">${a.sub}</div></div></div>`,
    )
    .join("");
  document.getElementById("tbody-treinamentos").innerHTML =
    treinamentos
      .slice(0, 8)
      .map(
        (t) =>
          `<tr><td><div class="t-name">${t.nome}</div><div class="t-sub">${t.area || "—"}</div></td><td class="t-muted">${t.instrutor || "—"}</td><td class="t-small">${t.carga_horaria ? t.carga_horaria + "h" : "—"}</td><td>${pill(t.status)}</td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="4" style="padding:16px;color:var(--text-faint);text-align:center">Nenhum treinamento</td></tr>';
  const recentMat = matriculas.slice(0, 6);
  document.getElementById("rank-colaboradores").innerHTML =
    recentMat
      .map((m, i) => {
        const nome = m.colaboradores?.nome || "—";
        const setor = m.colaboradores?.setor || "—";
        const trein = m.treinamentos?.nome || "—";
        const color = INST_COLORS[i % INST_COLORS.length];
        return `<div class="rank-item"><div class="rank-avatar" style="background:${color}20;color:${color}">${initials(nome)}</div><div class="rank-info"><div class="rank-name">${nome}</div><div class="rank-detail">${setor} · ${trein.length > 28 ? trein.slice(0, 28) + "…" : trein}</div><div class="progress-bar"><div class="progress-fill" style="width:${m.status === "concluido" ? 100 : m.status === "matriculado" ? 20 : 60}%"></div></div></div>${pill(m.status)}</div>`;
      })
      .join("") ||
    '<div style="padding:16px;color:var(--text-faint);font-size:13px">Nenhuma matrícula</div>';
}
function goToCadastro() {
  toast("Módulo de cadastro de treinamentos — em desenvolvimento", "info");
}
initDate();
loadAll();
document.addEventListener("keydown", (e) => {
  if (e.key === "F5") {
    e.preventDefault();
    loadAll();
  }
});
