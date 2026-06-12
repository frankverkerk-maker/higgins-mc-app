/**
 * Higgins MC — PDF Generator
 * Lay-out gebaseerd op Manus-stijl documenten:
 * - Witte pagina, ruime marges, geen aparte titelpagina
 * - Grote donkere titel bovenaan, bedrijfsnaam vet, datum, beschrijving
 * - Rustige sectiekoppen, fijne tabelranden, grijze codeblokken
 * - Nunito typografie — clean, modern, leesbaar
 */
import PDFDocument from "pdfkit";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "fonts");
const FONT_REGULAR  = path.join(FONTS_DIR, "Nunito-Regular.ttf");
const FONT_BOLD     = path.join(FONTS_DIR, "Nunito-Bold.ttf");
const FONT_SEMIBOLD = path.join(FONTS_DIR, "Nunito-SemiBold.ttf");
const FONT_ITALIC   = path.join(FONTS_DIR, "Nunito-Italic.ttf");

// Kleurpalet — Manus-stijl (wit, donker, grijs)
const C = {
  dark:       "#1a1a1a",
  body:       "#333333",
  muted:      "#555555",
  light:      "#888888",
  border:     "#e0e0e0",
  codeBg:     "#f5f5f5",
  codeBorder: "#d0d0d0",
  accent:     "#0891b2",
  white:      "#ffffff",
};

const MARGIN    = 72;
const PAGE_W    = 595.28;
const PAGE_H    = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y  = PAGE_H - MARGIN + 10;

export interface PdfSection {
  heading?:    string;
  subheading?: string;
  author?:     string;
  body:        string;
  isQuote?:    boolean;
  isCode?:     boolean;
}

export interface HigginsPdfOptions {
  title:           string;
  subtitle?:       string;
  classification?: string;
  preparedFor?:    string;
  date?:           string;
  authors?:        string[];
  sections:        PdfSection[];
  language?:       string;
}

let _tableRowIndex = 0;

export async function generateHigginsPdf(options: HigginsPdfOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN + 24, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title:    options.title,
        Author:   "Higgins MC · Carpe Diem GmbH",
        Creator:  "Higgins Mission Control",
        Producer: "Higgins MC",
      },
    });

    doc.registerFont("R",  FONT_REGULAR);
    doc.registerFont("B",  FONT_BOLD);
    doc.registerFont("SB", FONT_SEMIBOLD);
    doc.registerFont("I",  FONT_ITALIC);

    const chunks: Buffer[] = [];
    doc.on("data",  (chunk: Buffer) => chunks.push(chunk));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    _tableRowIndex = 0;
    renderDocumentHeader(doc, options);
    for (const section of options.sections) {
      renderSection(doc, section);
    }

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      renderFooter(doc, i + 1, range.count, options.classification);
    }

    doc.end();
  });
}

function renderDocumentHeader(doc: PDFKit.PDFDocument, options: HigginsPdfOptions) {
  let y = MARGIN;

  // Grote hoofdtitel
  doc.fontSize(26).fillColor(C.dark).font("B")
    .text(options.title, MARGIN, y, { width: CONTENT_W, lineGap: 4 });
  y = doc.y + 10;

  // Bedrijfsnaam vet
  if (options.authors && options.authors.length > 0) {
    doc.fontSize(11).fillColor(C.dark).font("B")
      .text(options.authors[0], MARGIN, y, { width: CONTENT_W });
    y = doc.y + 2;
  }

  // Datum
  if (options.date) {
    doc.fontSize(11).fillColor(C.body).font("R")
      .text(`Datum: ${options.date}`, MARGIN, y, { width: CONTENT_W });
    y = doc.y + 2;
  }

  // Subtitel / beschrijving
  if (options.subtitle) {
    doc.fontSize(11).fillColor(C.body).font("R")
      .text(options.subtitle, MARGIN, y, { width: CONTENT_W, lineGap: 2 });
    y = doc.y + 2;
  }

  // Classificatie klein grijs
  if (options.classification) {
    doc.fontSize(9).fillColor(C.light).font("I")
      .text(options.classification, MARGIN, y, { width: CONTENT_W });
    y = doc.y + 2;
  }

  // Dunne scheidingslijn
  y += 10;
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y)
    .strokeColor(C.border).lineWidth(0.75).stroke();
  doc.y = y + 18;
}

function renderSection(doc: PDFKit.PDFDocument, section: PdfSection) {
  if (doc.y > PAGE_H - MARGIN - 100) doc.addPage();

  if (section.heading) {
    doc.moveDown(0.6);
    doc.fontSize(17).fillColor(C.dark).font("B")
      .text(section.heading, MARGIN, doc.y, { width: CONTENT_W, lineGap: 3 });
    doc.moveDown(0.25);
  }

  if (section.subheading) {
    doc.moveDown(0.4);
    doc.fontSize(13).fillColor(C.dark).font("SB")
      .text(section.subheading, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
    doc.moveDown(0.2);
  }

  if (section.author) {
    doc.fontSize(9).fillColor(C.light).font("I")
      .text(section.author, MARGIN, doc.y + 2, { width: CONTENT_W });
    doc.moveDown(0.3);
  }

  if (!section.body) return;

  if (section.isCode) {
    renderCodeBlock(doc, section.body);
    return;
  }
  if (section.isQuote) {
    renderBlockquote(doc, section.body);
    return;
  }
  renderBodyText(doc, section.body);
}

function renderCodeBlock(doc: PDFKit.PDFDocument, code: string) {
  const padding = 12;
  const lineH   = 14;
  const lines   = code.split("\n");
  const blockH  = lines.length * lineH + padding * 2;

  const startY = doc.y + 4;
  doc.roundedRect(MARGIN, startY, CONTENT_W, blockH, 4)
    .fillAndStroke(C.codeBg, C.codeBorder);
  doc.fontSize(9.5).fillColor(C.body).font("R")
    .text(code, MARGIN + padding, startY + padding, {
      width: CONTENT_W - padding * 2, lineGap: 2,
    });
  doc.y = startY + blockH + 8;
  doc.moveDown(0.4);
}

function renderBlockquote(doc: PDFKit.PDFDocument, text: string) {
  const startY = doc.y + 6;
  const textH  = estimateTextHeight(doc, text, CONTENT_W - 20) + 16;
  doc.moveTo(MARGIN, startY).lineTo(MARGIN, startY + textH)
    .strokeColor(C.accent).lineWidth(2.5).stroke();
  doc.fontSize(11).fillColor(C.muted).font("I")
    .text(text, MARGIN + 16, startY + 4, { width: CONTENT_W - 20, lineGap: 3 });
  doc.moveDown(0.5);
}

function renderBodyText(doc: PDFKit.PDFDocument, text: string) {
  const lines = text.split("\n");
  for (const line of lines) {
    if (doc.y > PAGE_H - MARGIN - 60) doc.addPage();
    const trimmed = line.trim();

    if (!trimmed) { doc.moveDown(0.3); continue; }

    if (/^[-*]\s/.test(trimmed)) {
      doc.fontSize(11).fillColor(C.body).font("R")
        .text(`•  ${stripBold(trimmed.replace(/^[-*]\s/, ""))}`, MARGIN + 8, doc.y + 2, {
          width: CONTENT_W - 8, lineGap: 2,
        });
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      doc.fontSize(11).fillColor(C.body).font("R")
        .text(stripBold(trimmed), MARGIN + 8, doc.y + 2, { width: CONTENT_W - 8, lineGap: 2 });
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (/^\|[-| :]+\|$/.test(trimmed)) continue;
      renderTableRow(doc, trimmed);
      continue;
    }

    doc.fontSize(11).fillColor(C.body).font("R")
      .text(stripBold(trimmed), MARGIN, doc.y + 2, {
        width: CONTENT_W, lineGap: 3, align: "justify",
      });
  }
  doc.moveDown(0.4);
}

function renderTableRow(doc: PDFKit.PDFDocument, line: string) {
  const cells  = line.split("|").slice(1, -1).map((c) => c.trim());
  if (!cells.length) return;
  const colW   = CONTENT_W / cells.length;
  const rowH   = 20;
  const startX = MARGIN;
  const startY = doc.y + 2;
  const isHeader = _tableRowIndex === 0;

  if (isHeader) {
    doc.rect(startX, startY, CONTENT_W, rowH).fillAndStroke("#f0f0f0", C.border);
  } else {
    doc.rect(startX, startY, CONTENT_W, rowH).stroke(C.border);
  }
  _tableRowIndex++;

  cells.forEach((cell, i) => {
    doc.fontSize(9.5).fillColor(C.dark).font(isHeader ? "SB" : "R")
      .text(stripBold(cell), startX + i * colW + 6, startY + 5, {
        width: colW - 12, lineGap: 1, ellipsis: true,
      });
  });
  doc.y = startY + rowH + 1;
}

function renderFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number, classification?: string) {
  doc.moveTo(MARGIN, FOOTER_Y - 6).lineTo(PAGE_W - MARGIN, FOOTER_Y - 6)
    .strokeColor(C.border).lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor(C.light).font("R")
    .text(
      `Gegenereerd door Higgins MC · Carpe Diem GmbH · ${classification ?? "Vertrouwelijk"}`,
      MARGIN, FOOTER_Y, { width: CONTENT_W - 50, align: "left" }
    )
    .text(`${pageNum} / ${totalPages}`, MARGIN, FOOTER_Y, { width: CONTENT_W, align: "right" });
}

function estimateTextHeight(_doc: PDFKit.PDFDocument, text: string, width: number): number {
  const avgCharsPerLine = width / 6.5;
  return Math.ceil(text.length / avgCharsPerLine) * 15;
}

function stripBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1");
}

export async function generateResponsePdf(
  title: string,
  content: string,
  userName?: string,
  language?: string
): Promise<Buffer> {
  const now    = new Date();
  const locale = language === "de" ? "de-DE" : language === "en" ? "en-GB" : "nl-NL";
  const dateStr = now.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });

  const subtitleMap: Record<string, string> = {
    de: "Erstellt von Higgins, Chief of Staff",
    en: "Prepared by Higgins, Chief of Staff",
    nl: "Opgesteld door Higgins, Chief of Staff",
  };
  const classMap: Record<string, string> = {
    de: "Vertraulich — Nur für den internen Gebrauch",
    en: "Confidential — Internal Use Only",
    nl: "Vertrouwelijk — Uitsluitend voor intern gebruik",
  };
  const lang = language ?? "nl";

  _tableRowIndex = 0;
  const sections: PdfSection[] = [];
  const lines = content.split("\n");
  let currentSection: PdfSection | null = null;
  let bodyLines: string[] = [];
  let inCode = false;

  const flush = () => {
    if (currentSection) {
      currentSection.body = bodyLines.join("\n").trim();
      if (currentSection.body || currentSection.heading || currentSection.subheading) {
        sections.push(currentSection);
      }
    } else if (bodyLines.length > 0) {
      const b = bodyLines.join("\n").trim();
      if (b) sections.push({ body: b });
    }
    bodyLines = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        flush(); currentSection = null; inCode = false;
      } else {
        flush(); currentSection = { body: "", isCode: true }; inCode = true;
      }
      continue;
    }
    if (inCode) { bodyLines.push(line); continue; }

    if (line.startsWith("## ")) {
      flush();
      currentSection = { heading: line.replace(/^## /, "").trim(), body: "" };
    } else if (line.startsWith("### ")) {
      flush();
      currentSection = { subheading: line.replace(/^### /, "").trim(), body: "" };
    } else if (line.startsWith("> ")) {
      flush();
      sections.push({ body: line.replace(/^> /, "").trim(), isQuote: true });
      currentSection = null;
    } else {
      bodyLines.push(line);
    }
  }
  flush();

  if (sections.length === 0) sections.push({ body: content });

  return generateHigginsPdf({
    title,
    subtitle:       subtitleMap[lang] ?? subtitleMap.nl,
    classification: classMap[lang]    ?? classMap.nl,
    preparedFor:    userName ?? "Frank Verkerk",
    date:           dateStr,
    authors:        ["Carpe Diem GmbH — Higgins Mission Control"],
    sections,
    language,
  });
}
