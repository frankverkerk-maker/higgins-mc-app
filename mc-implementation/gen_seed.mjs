// Genereert de SQL VALUES-regels voor de agent_registry seed vanuit constants/team.ts.
// Zo blijven app-roster en installatiescripts gegarandeerd identiek.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../constants/team.ts", import.meta.url), "utf8");

// Extraheer DEPARTMENTS voor de department_id mapping (name -> id).
const deptBlock = src.slice(src.indexOf("DEPARTMENTS: DepartmentMeta[]"), src.indexOf("DEPARTMENT_ORDER"));
const deptMap = {};
for (const m of deptBlock.matchAll(/id:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)) {
  deptMap[m[2]] = m[1];
}

// Extraheer TEAM entries (elke agent staat op één regel { ... }).
const teamBlock = src.slice(src.indexOf("TEAM: Agent[] = ["), src.indexOf("// ─── Whitelab helper"));
const agents = [];
for (const line of teamBlock.split("\n")) {
  const t = line.trim();
  if (!t.startsWith("{ name:")) continue;
  const get = (key) => {
    const mm = t.match(new RegExp(key + ':\\s*"([^"]*)"'));
    return mm ? mm[1] : null;
  };
  const getBool = (key) => new RegExp(key + ":\\s*true").test(t);
  agents.push({
    name: get("name"),
    role: get("role"),
    department: get("department"),
    model: get("model"),
    provider: get("provider"),
    team: get("team"),
    reportsTo: get("reportsTo"),
    isOrchestrator: getBool("isOrchestrator") ? 1 : 0,
    isAddOn: getBool("isAddOn") ? 1 : 0,
    isClassified: getBool("isClassified") ? 1 : 0,
  });
}

const esc = (v) => (v == null ? "NULL" : "'" + String(v).replace(/'/g, "''") + "'");
// Departmentnaam met apostrof gebruikt dubbele quotes zoals in het originele script.
const escDept = (v) => (v.includes("'") ? '"' + v + '"' : "'" + v + "'");

const lines = [];
let lastDept = null;
for (const a of agents) {
  if (a.department !== lastDept) {
    lines.push(`-- ${a.department}`);
    lastDept = a.department;
  }
  const deptId = deptMap[a.department] || "unknown";
  lines.push(
    `(${esc(a.name)},${esc(a.role)},${escDept(a.department)},${esc(deptId)},` +
    `${esc(a.model)},${esc(a.provider)},${esc(a.team)},${esc(a.reportsTo)},` +
    `${a.isOrchestrator},${a.isAddOn},${a.isClassified},1)`
  );
}

// Voeg komma's toe tussen VALUES-regels (niet na comment-regels, niet na de laatste value).
const valueIdx = lines.map((l, i) => (l.startsWith("(") ? i : -1)).filter((i) => i >= 0);
const lastValueIdx = valueIdx[valueIdx.length - 1];
const out = lines
  .map((l, i) => (l.startsWith("(") && i !== lastValueIdx ? l + "," : l))
  .join("\n");

console.log(out);
console.error(`# ${agents.length} agents, ${Object.keys(deptMap).length} departments`);
