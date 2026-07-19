# Higgins MC — PDF Huisstijl Referentie
## Gebaseerd op: swissfron_us_strategy_v2.pdf

### Typografie
- **Lettertype**: Serif — lijkt op Georgia of Times New Roman (klassiek, professioneel)
- **Titelpagina H1**: Groot, vet, serif — ca. 28-32pt
- **Sectie H2**: Vet, serif — ca. 18-20pt, met horizontale lijn eronder
- **Subsectie H3**: Vet, serif — ca. 14pt
- **Bodytekst**: Serif, 11-12pt, justified (uitgevuld)
- **Citaten/blockquotes**: Cursief, ingesprongen met verticale lijn links
- **Auteurslabel**: Cursief, kleiner — bijv. *Authored by Dr. Nadia Okonkwo*

### Lay-out
- **Paginamarges**: Ruim — ca. 2.5cm links/rechts, 3cm boven/onder
- **Witruimte**: Genereus — veel ademruimte tussen secties
- **Horizontale lijnen**: Dunne scheidingslijnen onder H2 titels en na titelpagina metadata
- **Geen kleur**: Volledig zwart-wit document
- **Geen logo**: Geen header/footer logo — puur tekstueel
- **Paginanummering**: Implied (32 pagina's)

### Structuur titelpagina
1. H1 documenttitel (groot, vet)
2. Horizontale lijn
3. H2 subtitel
4. Horizontale lijn
5. **Confidential Legal & Strategic Advisory Report** (vet label)
6. Metadata: Prepared for, Date, Classification (inline bold labels)
7. Authors lijst met bullet points

### Structuur inhoudspagina's
- H2 sectietitel met horizontale lijn eronder
- Cursief auteurslabel
- H3 subsectietitels (vet)
- Bodytekst justified
- Bold inline labels voor belangrijke termen
- Blockquotes voor wetteksten/citaten

### Stijlprincipes
- Formeel, juridisch/zakelijk karakter
- Geen decoratieve elementen
- Klassieke serif typografie
- Ruime witruimte = professionaliteit
- Justified tekst = formeel document gevoel
- Horizontale lijnen als structuurelement

### Implementatie voor Higgins PDF generator
- Gebruik **PDFKit** met Georgia of Helvetica (fallback)
- Titelpagina: Carpe Diem GmbH branding + Higgins logo
- Kleuraccent: Teal (#0891b2) voor titels — subtiel, past bij app branding
- Footer: "Gegenereerd door Higgins MC · Carpe Diem GmbH · Vertrouwelijk"
- Datum + paginanummer in footer
