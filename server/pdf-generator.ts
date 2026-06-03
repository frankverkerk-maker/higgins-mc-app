/**
 * Higgins MC — PDF Generator
 * Huisstijl gebaseerd op Carpe Diem GmbH documenten
 * Nunito typografie (Avenir-equivalent), ruime marges, professioneel zakelijk karakter
 */

import PDFDocument from "pdfkit";
import * as path from "path";
import { fileURLToPath } from "url";

// Font paden — Nunito als Avenir-equivalent (clean, modern, sans-serif)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "fonts");

const FONT_REGULAR = path.join(FONTS_DIR, "Nunito-Regular.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "Nunito-Bold.ttf");
const FONT_SEMIBOLD = path.join(FONTS_DIR, "Nunito-SemiBold.ttf");
const FONT_ITALIC = path.join(FONTS_DIR, "Nunito-Italic.ttf");

// ─── Kleurpalet ───────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#0891b2",      // Higgins teal
  black: "#111111",
  darkGray: "#333333",
  midGray: "#555555",
  lightGray: "#888888",
  border: "#cccccc",
  background: "#ffffff",
};

// ─── Marges & afmetingen ──────────────────────────────────────────────────────
const MARGIN = 72;        // 1 inch = 72pt
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export interface PdfSection {
  heading?: string;
  subheading?: string;
  author?: string;
  body: string;
  isQuote?: boolean;
}

export interface HigginsPdfOptions {
  title: string;
  subtitle?: string;
  classification?: string;
  preparedFor?: string;
  date?: string;
  authors?: string[];
  sections: PdfSection[];
  language?: string;
}

/**
 * Genereert een professionele PDF in Higgins MC huisstijl
 * en geeft de buffer terug als Promise<Buffer>
 */
export async function generateHigginsPdf(options: HigginsPdfOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: options.title,
        Author: "Higgins MC · Carpe Diem GmbH",
        Creator: "Higgins Mission Control",
        Producer: "Higgins MC v3.1",
      },
    });

    // Registreer Nunito fonts (Avenir-equivalent)
    doc.registerFont("Avenir", FONT_REGULAR);
    doc.registerFont("Avenir-Bold", FONT_BOLD);
    doc.registerFont("Avenir-SemiBold", FONT_SEMIBOLD);
    doc.registerFont("Avenir-Italic", FONT_ITALIC);

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Titelpagina ──────────────────────────────────────────────────────────
    renderTitlePage(doc, options);

    // ── Inhoudspagina's ──────────────────────────────────────────────────────
    for (const section of options.sections) {
      renderSection(doc, section);
    }

    // ── Footer op elke pagina ────────────────────────────────────────────────
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      renderFooter(doc, i + 1, pages.count, options.classification);
    }

    doc.end();
  });
}

// ─── Titelpagina ─────────────────────────────────────────────────────────────
function renderTitlePage(doc: PDFKit.PDFDocument, options: HigginsPdfOptions) {
  const y0 = MARGIN + 40;

  // Higgins MC branding label
  doc
    .fontSize(9)
    .fillColor(COLORS.primary)
    .font("Avenir-Bold")
    .text("HIGGINS MC · CARPE DIEM GMBH", MARGIN, y0, { characterSpacing: 1.5 });

  // Horizontale lijn
  doc
    .moveTo(MARGIN, y0 + 18)
    .lineTo(PAGE_WIDTH - MARGIN, y0 + 18)
    .strokeColor(COLORS.primary)
    .lineWidth(1.5)
    .stroke();

  // Hoofdtitel
  doc
    .fontSize(28)
    .fillColor(COLORS.black)
    .font("Avenir-Bold")
    .text(options.title, MARGIN, y0 + 36, {
      width: CONTENT_WIDTH,
      lineGap: 6,
    });

  const titleBottom = doc.y + 16;

  // Horizontale lijn
  doc
    .moveTo(MARGIN, titleBottom)
    .lineTo(PAGE_WIDTH - MARGIN, titleBottom)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  // Subtitel
  if (options.subtitle) {
    doc
      .fontSize(16)
      .fillColor(COLORS.darkGray)
      .font("Avenir-SemiBold")
      .text(options.subtitle, MARGIN, titleBottom + 16, {
        width: CONTENT_WIDTH,
        lineGap: 4,
      });
  }

  const metaY = doc.y + 24;

  // Horizontale lijn
  doc
    .moveTo(MARGIN, metaY)
    .lineTo(PAGE_WIDTH - MARGIN, metaY)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  // Classificatie label
  if (options.classification) {
    doc
      .fontSize(10)
      .fillColor(COLORS.black)
      .font("Avenir-Bold")
      .text(options.classification, MARGIN, metaY + 14);
  }

  // Metadata
  const metaItems: [string, string][] = [];
  if (options.preparedFor) metaItems.push(["Prepared for:", options.preparedFor]);
  if (options.date) metaItems.push(["Date:", options.date]);
  if (options.classification) metaItems.push(["Classification:", "Confidential — Internal Use Only"]);

  for (const [label, value] of metaItems) {
    const lineY = doc.y + 4;
    doc
      .fontSize(10)
      .fillColor(COLORS.black)
      .font("Avenir-Bold")
      .text(label + " ", MARGIN, lineY, { continued: true })
      .font("Avenir")
      .fillColor(COLORS.darkGray)
      .text(value);
  }

  // Authors
  if (options.authors && options.authors.length > 0) {
    doc
      .fontSize(10)
      .fillColor(COLORS.black)
      .font("Avenir-Bold")
      .text("Authors:", MARGIN, doc.y + 10);

    for (const author of options.authors) {
      doc
        .fontSize(10)
        .fillColor(COLORS.darkGray)
        .font("Avenir")
        .text(`• ${author}`, MARGIN + 12, doc.y + 2);
    }
  }

  // Voeg nieuwe pagina toe voor inhoud
  doc.addPage();
}

// ─── Sectie renderen ──────────────────────────────────────────────────────────
function renderSection(doc: PDFKit.PDFDocument, section: PdfSection) {
  // Controleer of er genoeg ruimte is op de huidige pagina
  if (doc.y > PAGE_HEIGHT - MARGIN - 120) {
    doc.addPage();
  }

  // H2 sectietitel
  if (section.heading) {
    const headY = doc.y + (doc.y > MARGIN + 20 ? 24 : 0);

    doc
      .fontSize(18)
      .fillColor(COLORS.black)
      .font("Avenir-Bold")
      .text(section.heading, MARGIN, headY, { width: CONTENT_WIDTH });

    // Lijn onder H2
    doc
      .moveTo(MARGIN, doc.y + 4)
      .lineTo(PAGE_WIDTH - MARGIN, doc.y + 4)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();

    // Auteurslabel
    if (section.author) {
      doc
        .fontSize(10)
        .fillColor(COLORS.midGray)
        .font("Avenir-Italic")
        .text(`Authored by ${section.author}`, MARGIN, doc.y + 10);
    }

    doc.moveDown(0.5);
  }

  // H3 subsectietitel
  if (section.subheading) {
    if (doc.y > PAGE_HEIGHT - MARGIN - 80) doc.addPage();
    doc
      .fontSize(13)
      .fillColor(COLORS.black)
      .font("Avenir-SemiBold")
      .text(section.subheading, MARGIN, doc.y + 12, { width: CONTENT_WIDTH });
    doc.moveDown(0.3);
  }

  // Bodytekst of blockquote
  if (section.body) {
    if (section.isQuote) {
      // Blockquote stijl: verticale lijn links, cursief
      const quoteY = doc.y + 8;
      doc
        .moveTo(MARGIN, quoteY)
        .lineTo(MARGIN, quoteY + estimateTextHeight(doc, section.body, CONTENT_WIDTH - 20) + 16)
        .strokeColor(COLORS.primary)
        .lineWidth(2)
        .stroke();

      doc
        .fontSize(11)
        .fillColor(COLORS.midGray)
        .font("Avenir-Italic")
        .text(section.body, MARGIN + 16, quoteY + 4, {
          width: CONTENT_WIDTH - 20,
          align: "left",
          lineGap: 3,
        });
    } else {
      doc
        .fontSize(11)
        .fillColor(COLORS.darkGray)
        .font("Avenir")
        .text(section.body, MARGIN, doc.y + 6, {
          width: CONTENT_WIDTH,
          align: "justify",
          lineGap: 3,
        });
    }
    doc.moveDown(0.5);
  }
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function renderFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number, classification?: string) {
  const footerY = PAGE_HEIGHT - MARGIN + 16;

  doc
    .moveTo(MARGIN, footerY - 8)
    .lineTo(PAGE_WIDTH - MARGIN, footerY - 8)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  doc
    .fontSize(8)
    .fillColor(COLORS.lightGray)
    .font("Avenir")
    .text(
      `Gegenereerd door Higgins MC · Carpe Diem GmbH · ${classification ?? "Vertrouwelijk"}`,
      MARGIN,
      footerY,
      { width: CONTENT_WIDTH - 60, align: "left" }
    )
    .text(`${pageNum} / ${totalPages}`, MARGIN, footerY, {
      width: CONTENT_WIDTH,
      align: "right",
    });
}

// ─── Hulpfunctie: schat texthoogte ───────────────────────────────────────────
function estimateTextHeight(doc: PDFKit.PDFDocument, text: string, width: number): number {
  const avgCharsPerLine = width / 6.5;
  const lines = Math.ceil(text.length / avgCharsPerLine);
  return lines * 15;
}

// ─── Snelle helper: genereer een eenvoudige Higgins response PDF ─────────────
export async function generateResponsePdf(
  title: string,
  content: string,
  userName?: string,
  language?: string
): Promise<Buffer> {
  const now = new Date();
  const dateStr = now.toLocaleDateString(language === "de" ? "de-DE" : language === "en" ? "en-GB" : "nl-NL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Splits content in secties op basis van markdown headers
  const sections: PdfSection[] = [];
  const lines = content.split("\n");
  let currentSection: PdfSection | null = null;
  let bodyLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentSection) {
        currentSection.body = bodyLines.join("\n").trim();
        sections.push(currentSection);
      }
      currentSection = { heading: line.replace("## ", "").trim(), body: "" };
      bodyLines = [];
    } else if (line.startsWith("### ")) {
      if (bodyLines.length > 0 && currentSection) {
        currentSection.body = bodyLines.join("\n").trim();
        sections.push(currentSection);
      }
      currentSection = { subheading: line.replace("### ", "").trim(), body: "" };
      bodyLines = [];
    } else if (line.startsWith("> ")) {
      if (bodyLines.length > 0 && currentSection) {
        currentSection.body = bodyLines.join("\n").trim();
        sections.push(currentSection);
        bodyLines = [];
      }
      sections.push({ body: line.replace("> ", "").trim(), isQuote: true });
      currentSection = null;
    } else {
      bodyLines.push(line);
    }
  }

  // Voeg laatste sectie toe
  if (bodyLines.length > 0) {
    if (currentSection) {
      currentSection.body = bodyLines.join("\n").trim();
      sections.push(currentSection);
    } else {
      sections.push({ body: bodyLines.join("\n").trim() });
    }
  }

  // Als er geen secties zijn, maak één grote sectie
  if (sections.length === 0) {
    sections.push({ body: content });
  }

  return generateHigginsPdf({
    title,
    subtitle: language === "de" ? "Erstellt von Higgins, Chief of Staff" :
              language === "en" ? "Prepared by Higgins, Chief of Staff" :
              "Opgesteld door Higgins, Chief of Staff",
    classification: language === "de" ? "Vertraulich — Nur für den internen Gebrauch" :
                    language === "en" ? "Confidential — Internal Use Only" :
                    "Vertrouwelijk — Uitsluitend voor intern gebruik",
    preparedFor: userName ?? "Frank Verkerk",
    date: dateStr,
    authors: ["Higgins (Chief of Staff, Carpe Diem GmbH)"],
    sections,
    language,
  });
}
