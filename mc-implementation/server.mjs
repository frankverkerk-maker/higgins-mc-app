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
    // Executive Office
    A("Higgins","Chief Operating Officer","Executive Office","executive"),
    A("Nathalie","Executive Assistant","Executive Office","executive"),
    A("Rosi","Community Manager","Executive Office","executive"),
    // Technology Division
    A("Elon","Chief Technology Officer","Technology Division","technology"),
    A("Jenkins","Backend Engineer","Technology Division","technology"),
    A("Sid","Security Engineer","Technology Division","technology"),
    A("Forge","Creative Engineer","Technology Division","technology"),
    A("Nexus","Integration Architect","Technology Division","technology"),
    A("Da Vinci","Digital Architect (DVDA)","Technology Division","technology"),
    // Marketing & Creative
    A("Gary","Chief Marketing Officer","Marketing & Creative","marketing"),
    A("Bard","Content Writer","Marketing & Creative","marketing"),
    A("Picasso","Visual Designer","Marketing & Creative","marketing"),
    A("Echo","Social Media Manager","Marketing & Creative","marketing"),
    A("Anna","Market Analyst","Marketing & Creative","marketing"),
    A("Larry","SEO Specialist","Marketing & Creative","marketing"),
    // Functional Medicine Center
    A("David","Director Longevity Science","Functional Medicine Center","fmc"),
    A("Vladimir","Director Bioregulation","Functional Medicine Center","fmc"),
    A("Samuel","Director Integrative Medicine","Functional Medicine Center","fmc"),
    A("Rosalind","Director Molecular Diagnostics","Functional Medicine Center","fmc"),
    A("Maria","Director Telomere Biology","Functional Medicine Center","fmc"),
    // Justitia Legal Council
    A("Justitia","Chief Legal Officer","Justitia Legal Council","jlc"),
    A("Adrian","Corporate Law","Justitia Legal Council","jlc"),
    A("Elena V.","International Law","Justitia Legal Council","jlc"),
    A("Isabelle","Contract Review","Justitia Legal Council","jlc"),
    A("Matteo","IP & Technology Law","Justitia Legal Council","jlc"),
    A("Nadia","Data Protection (GDPR)","Justitia Legal Council","jlc"),
    // Sales & Revenue
    A("Closer","Head of Sales","Sales & Revenue","sales"),
    A("Carson","Product Intelligence","Sales & Revenue","sales"),
    A("Strategos","Revenue Strategy","Sales & Revenue","sales"),
    // Enterprise Operations
    A("Atlas","Operations Director","Enterprise Operations","enterprise"),
    A("Bridge","Integration Coordinator","Enterprise Operations","enterprise"),
    A("Felix","Quality Assurance","Enterprise Operations","enterprise"),
    A("Flora","Wellness Programs","Enterprise Operations","enterprise"),
    A("Herald","Communications","Enterprise Operations","enterprise"),
    A("Hugo","HR & Talent","Enterprise Operations","enterprise"),
    A("Iris","Patient Experience","Enterprise Operations","enterprise"),
    A("Max","Facility Operations","Enterprise Operations","enterprise"),
    A("Mentor","Training & Development","Enterprise Operations","enterprise"),
    A("Nova","Innovation & R&D","Enterprise Operations","enterprise"),
    A("Oscar","Supply Chain","Enterprise Operations","enterprise"),
    A("Quinn","Data Analytics","Enterprise Operations","enterprise"),
    A("Vera","Regulatory Affairs","Enterprise Operations","enterprise"),
    A("Vita","Vitality Programs","Enterprise Operations","enterprise"),
    // Cross-Functional Specialists
    A("Sophia","Chief Medical Officer","Cross-Functional Specialists","specialists"),
    A("Catharina","Research Director","Cross-Functional Specialists","specialists"),
    A("Barbara","International Relations","Cross-Functional Specialists","specialists"),
    A("Susi","Customer Success","Cross-Functional Specialists","specialists"),
    // Warren Trading Desk (CLASSIFIED)
    A("Warren","Head of Trading","Warren Trading Desk","wtd",1),
    A("Abacus","Financial Analyst","Warren Trading Desk","wtd",1),
    // Ultra Trust Agency (CLASSIFIED)
    A("Victoria","Head of Trust & Estate","Ultra Trust Agency","uta",1),
    A("Alexander","Senior Trust Counsel","Ultra Trust Agency","uta",1),
    A("Arabella","International Tax","Ultra Trust Agency","uta",1),
    A("Benedict","Corporate Structuring","Ultra Trust Agency","uta",1),
    A("Charlotte","Family Governance","Ultra Trust Agency","uta",1),
    A("Eleanor","Wealth Transfer","Ultra Trust Agency","uta",1),
    A("Helena","Private Banking","Ultra Trust Agency","uta",1),
    A("Isabelle R.","Compliance & Regulatory","Ultra Trust Agency","uta",1),
    A("James","Real Estate Trust","Ultra Trust Agency","uta",1),
    A("Lukas","Cross-Border Benelux","Ultra Trust Agency","uta",1),
    A("Margaret","Liechtenstein Foundation","Ultra Trust Agency","uta",1),
    A("Maximilian","German Tax & Succession","Ultra Trust Agency","uta",1),
    A("Oliver","Swiss Holding Structures","Ultra Trust Agency","uta",1),
    A("Philippa","Art & Collectibles Trust","Ultra Trust Agency","uta",1),
    A("Raphael","Digital Assets & Crypto","Ultra Trust Agency","uta",1),
    A("Sebastian","Insurance & Risk","Ultra Trust Agency","uta",1),
    A("Theodore","Philanthropic Structures","Ultra Trust Agency","uta",1),
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
