#!/usr/bin/env node
/** Release gate: node scripts/check-team-directory.mjs [https://command-center.example] */
const base = (process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
let data;
for (let attempt = 0; attempt < 7; attempt++) {
  const response = await fetch(`${base}/api/app/team-feed`, { signal: AbortSignal.timeout(37_000) });
  if (!response.ok) throw new Error(`directory HTTP ${response.status} at ${base}`);
  data = await response.json();
  if (data.source === "live") break;
  if (attempt < 6) await new Promise(resolve => setTimeout(resolve, 5_000));
}
if (data.contractVersion !== 2 || data.source !== "live" || !Array.isArray(data.agents)) {
  throw new Error(`not a live v2 directory: contract=${data.contractVersion}, source=${data.source}`);
}
const team = data.agents;
if (team.length !== data.count || team.length < 2) throw new Error("invalid roster count");
const managers = team.filter(agent => agent.department_id === "executive" && /office manager/i.test(agent.role));
if (managers.length !== 1 || managers[0].name !== "Nathalie" || managers[0].department !== "Executive Office") {
  throw new Error(`incorrect Executive Office Manager: ${JSON.stringify(managers.map(({ name, department }) => ({ name, department })))}`);
}
for (const name of ["Elena Vasquez", "Nathalie Vasquez"]) {
  if (!team.some(agent => agent.name === name && agent.department_id === "jlc")) {
    throw new Error(`separate JLC agent missing: ${name}`);
  }
}
if (team.some(agent => agent.name === "Elena" && agent.department_id === "executive")) {
  throw new Error("legacy Executive Office Elena still visible");
}
if (team.some(agent => ["Executive", "Technology", "Jlc", "Functional Medicine Council"].includes(agent.department))) {
  throw new Error("noncanonical department still visible");
}
console.log(`PASS ${base} · ${team.length} canonical agents · Nathalie is sole Office Manager · JLC Elena Vasquez intact`);
