// ====================================================================
// 1. CONFIGURAÇÕES E IMPORTAÇÕES
// ====================================================================
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3030;

// MIDDLEWARES
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

// CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE)
// Use .env para as chaves e URL
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Erro: SUPABASE_URL e SUPABASE_ANON_KEY devem estar definidas no arquivo .env");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SAFE_TABLES = new Set([
  "perfis",
  "colaboradores",
  "treinamentos",
  "matriculas",
  "certificados",
  "presencas",
]);

function tableAllowed(table) {
  return SAFE_TABLES.has(table);
}

function parseBoolean(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  return String(value).toLowerCase() === "true";
}

// Utilitário central para respostas de erro
function handleError(res, error) {
  console.error(error);
  const message = error?.message || "Erro interno no servidor";
  return res.status(500).json({ message });
}

// ====================================================================
// 2. ROTAS DE AUTENTICAÇÃO
// ====================================================================
app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    // Tenta autenticar no serviço de AUTH do Supabase
    const { data: authData, error: authError } = await db.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (authError) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    // Se autenticou, buscamos os dados complementares na tabela 'perfis'
    const { data: perfil, error: perfilError } = await db
      .from("perfis")
      .select("id, nome, perfil, department")
      .eq("id", authData.user.id)
      .single();

    if (perfilError) {
      console.log(error);
      return res.status(404).json({ message: "Perfil não encontrado para este usuário." });
    }

    // Retorna os dados do perfil + o token (opcional)
    res.json({ 
      user: perfil, 
      session: authData.session 
    });

  } catch (error) {
    return handleError(res, error);
  }
});
// ====================================================================
// 3. ROTAS API CRUD GERAIS
// ====================================================================
app.get("/api/:table", async (req, res) => {
  const table = req.params.table;
  if (!tableAllowed(table)) return res.status(404).json({ message: "Tabela não suportada" });

  try {
    const select = req.query.select || "*";
    const order = req.query.order;
    const asc = parseBoolean(req.query.asc, false);
    const limit = req.query.limit ? Number(req.query.limit) : null;
    const offset = req.query.offset ? Number(req.query.offset) : null;

    let query = db.from(table).select(select);
    if (order) query = query.order(order, { ascending: asc });
    if (limit) query = query.limit(limit);
    if (offset) query = query.range(offset, offset + (limit || 0) - 1);

    const { data, error } = await query;
    if (error) return res.status(400).json({ message: error.message });

    res.json(data);
  } catch (error) {
    return handleError(res, error);
  }
});

app.get("/api/:table/:id", async (req, res) => {
  const table = req.params.table;
  if (!tableAllowed(table)) return res.status(404).json({ message: "Tabela não suportada" });

  try {
    const select = req.query.select || "*";
    const { data, error } = await db
      .from(table)
      .select(select)
      .eq("id", req.params.id)
      .single();

    if (error) return res.status(404).json({ message: "Registro não encontrado" });
    res.json(data);
  } catch (error) {
    return handleError(res, error);
  }
});

app.post("/api/:table", async (req, res) => {
  const table = req.params.table;
  if (!tableAllowed(table)) return res.status(404).json({ message: "Tabela não suportada" });

  try {
    const payload = req.body;
    const { data, error } = await db.from(table).insert(payload).select("*");
    if (error) return res.status(400).json({ message: error.message });
    res.status(201).json(data);
  } catch (error) {
    return handleError(res, error);
  }
});

app.put("/api/:table/:id", async (req, res) => {
  const table = req.params.table;
  if (!tableAllowed(table)) return res.status(404).json({ message: "Tabela não suportada" });

  try {
    const payload = req.body;
    const { data, error } = await db
      .from(table)
      .update(payload)
      .eq("id", req.params.id)
      .select("*");

    if (error) return res.status(400).json({ message: error.message });
    res.json(data);
  } catch (error) {
    return handleError(res, error);
  }
});

app.delete("/api/:table/:id", async (req, res) => {
  const table = req.params.table;
  if (!tableAllowed(table)) return res.status(404).json({ message: "Tabela não suportada" });

  try {
    const { data, error } = await db.from(table).delete().eq("id", req.params.id).select("*");
    if (error) return res.status(400).json({ message: error.message });
    res.json(data);
  } catch (error) {
    return handleError(res, error);
  }
});

// ====================================================================
// 5. INICIALIZAÇÃO
// ====================================================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});