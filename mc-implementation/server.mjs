import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const HOME = process.env.HOME;
const DIR = path.join(HOME, ".higgins");
const REG = path.join(DIR, "agent-registry.json");
const EDF = path.join(DIR, "edition.json");
const TOK = path.join(DIR, "agent-edition.token");
const PORT = parseInt(process.env.AE_PORT || "3007", 10);
fs.mkdirSync(DIR, { recursive: true });

if (!fs.existsSync(TOK)) fs.writeFileSync(TOK, crypto.randomBytes(24).toString("hex"), { mode: 0o600 });
const TOKEN = fs.readFileSync(TOK, "utf8").trim();
if (!fs.existsSync(EDF)) fs.writeFileSync(EDF, JSON.stringify({ edition: "internal" }, null, 2));
if (!fs.existsSync(REG)) fs.writeFileSync(REG, JSON.stringify(SEED(), null, 2));

function SEED() {
  const A = (name, role, department, departmentId, classified = 0) =>
    ({ name, role, department, departmentId, isClassified: classified, isActive: 1, status: "standby", currentTask: null });
  return [
    A("Higgins","COO / Chief of Staff","Higgins Mission Control","higgins-mc"),
    A("Elena","Office Manager","Higgins Mission Control","higgins-mc"),
    A("Elon","CTO","Technology & Engineering","engineering"),
    A("Jenkins","Backend Engineer","Technology & Engineering","engineering"),
    A("Forge","Frontend Engineer","Technology & Engineering","engineering"),
    A("Nexus","DevOps & Infra","Technology & Engineering","engineering"),
    A("Quinn","QA Engineer","Technology & Engineering","engineering"),
    A("Sid","Security Engineer","Technology & Engineering","engineering"),
    A("Gary","CMO","Gary's Marketing Department","gmd"),
    A("Bard","Content Creator","Gary's Marketing Department","gmd"),
    A("Picasso","Visual Designer","Gary's Marketing Department","gmd"),
    A("Echo","Social Media Manager","Gary's Marketing Department","gmd"),
    A("Anna","SEO & Intelligence","Gary's Marketing Department","gmd"),
    A("Larry","Viral Marketing","Gary's Marketing Department","gmd"),
    A("Brando","Brand Manager","Gary's Marketing Department","gmd"),
    A("Flash","Content Scaling","Gary's Marketing Department","gmd"),
    A("Vita","Head of Health & Wellbeing","Functional Medicine Center","fmc"),
    A("Sophia","Chief Medical Therapist","Functional Medicine Center","fmc"),
    A("Prof. David Sinclair","Director Longevity Science","Functional Medicine Center","fmc"),
    A("Prof. Vladimir Khavinson","Director Peptide Bioregulation","Functional Medicine Center","fmc"),
    A("Prof. Rosalind Franklin","Director Molecular Diagnostics","Functional Medicine Center","fmc"),
    A("Prof. Samuel Hahnemann","Director Integrative Medicine","Functional Medicine Center","fmc"),
    A("Prof. Maria Blasco","Director Telomere Research","Functional Medicine Center","fmc"),
    A("Catharina","Head of Research / CRO","Einstein Research Lab","erl"),
    A("Oracle","Market Intelligence Analyst","Einstein Research Lab","erl"),
    A("Atlas","Data Scientist","Einstein Research Lab","erl"),
    A("Justitia","Head of Legal / CLO","Justitia Legal Council","jlc"),
    A("Vera","Compliance Officer","Justitia Legal Council","jlc"),
    A("Hugo","HR Manager","Operations & Finance","operations"),
    A("Oscar","Project Manager","Operations & Finance","operations"),
    A("Flora","Sustainability Officer","Operations & Finance","operations"),
    A("Mentor","Training & Development","Operations & Finance","operations"),
    A("WebArchitect","Website & Solution Specialist","Shared Services & Specialists","shared-services"),
    A("Barbara","Translator","Shared Services & Specialists","shared-services"),
    A("Rosi","Community Bot","Shared Services & Specialists","shared-services"),
    A("Victoria","Head of Trust & Estate Planning","United Trust Agency","uta",1),
    A("Warren","CRO","Warren Trading Desk","wtd",1),
    A("Abacus","Financial Analyst","Warren Trading Desk","wtd",1),
    A("Closer","Sales Agent","Warren Trading Desk","wtd",1),
    A("Carson","Lead Generation","Warren Trading Desk","wtd",1),
    A("Strategos","Business Strategy Architect","Warren Trading Desk","wtd",1),
  ];
}

const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJSON = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2));
const send = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type,x-operator-token", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" }); res.end(JSON.stringify(obj)); };
const body = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { try { r(JSON.parse(d || "{}")); } catch { r({}); } }); });

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const u = new URL(req.url, "http://x");
  if (req.method === "GET" && u.pathname === "/api/app/team-feed") {
    const edition = readJSON(EDF).edition;
    let agents = readJSON(REG).filter((a) => a.isActive);
    if (edition === "whitelab") agents = agents.filter((a) => !a.isClassified);
    return send(res, 200, { edition, count: agents.length, agents });
  }
  if (req.method === "GET" && u.pathname === "/api/app/health") {
    return send(res, 200, { ok: true, service: "agent-edition-runtime" });
  }
  const op = req.headers["x-operator-token"];
  if (req.method === "POST" && u.pathname === "/api/mc/agent/toggle") {
    if (op !== TOKEN) return send(res, 403, { error: "operator_token_required" });
    const { name, isActive } = await body(req);
    const reg = readJSON(REG); const a = reg.find((x) => x.name === name);
    if (!a) return send(res, 404, { error: "agent_not_found" });
    a.isActive = isActive ? 1 : 0; writeJSON(REG, reg);
    return send(res, 200, { ok: true, name, isActive });
  }
  if (req.method === "POST" && u.pathname === "/api/mc/edition") {
    if (op !== TOKEN) return send(res, 403, { error: "operator_token_required" });
    const { edition } = await body(req);
    if (edition !== "internal" && edition !== "whitelab") return send(res, 400, { error: "edition_invalid" });
    writeJSON(EDF, { edition }); return send(res, 200, { ok: true, edition });
  }
  send(res, 404, { error: "not_found" });
}).listen(PORT, () => {
  console.log("Agent & Edition runtime op poort " + PORT);
  console.log("Operator-token staat in: " + TOK);
});
