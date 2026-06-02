/**
 * patch-css-interop.mjs
 *
 * Fixt een bug in react-native-css-interop@0.2.x waarbij aspectRatio.ratio
 * undefined kan zijn, wat leidt tot een Metro crash:
 * "Cannot read properties of undefined (reading '0')"
 *
 * Wordt automatisch uitgevoerd via postinstall in package.json.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = resolve(
  __dirname,
  "../node_modules/react-native-css-interop/dist/css-to-rn/parseDeclaration.js"
);

try {
  let content = readFileSync(filePath, "utf8");

  // Patch 1: null-check vóór aspectRatio.ratio[0] toegang
  const before1 = `if (aspectRatio.ratio[0] === aspectRatio.ratio[1])`;
  const after1 = `if (aspectRatio.ratio && aspectRatio.ratio[0] === aspectRatio.ratio[1])`;

  // Patch 2: null-check vóór aspectRatio.ratio.join()
  const before2 = `return aspectRatio.ratio.join(" / ");`;
  const after2 = `return aspectRatio.ratio ? aspectRatio.ratio.join(" / ") : "1";`;

  let patched = false;

  if (content.includes(before1)) {
    content = content.replace(before1, after1);
    patched = true;
    console.log("✅ patch-css-interop: Patch 1 toegepast (ratio null-check)");
  } else {
    console.log("ℹ️  patch-css-interop: Patch 1 al aanwezig of niet nodig");
  }

  if (content.includes(before2)) {
    content = content.replace(before2, after2);
    patched = true;
    console.log("✅ patch-css-interop: Patch 2 toegepast (ratio.join null-check)");
  } else {
    console.log("ℹ️  patch-css-interop: Patch 2 al aanwezig of niet nodig");
  }

  if (patched) {
    writeFileSync(filePath, content, "utf8");
    console.log("✅ patch-css-interop: parseDeclaration.js succesvol gepatcht");
  }
} catch (err) {
  // Stil falen als het bestand niet bestaat (andere versie of al gefixt)
  console.warn("⚠️  patch-css-interop: Kon niet patchen:", err.message);
}
