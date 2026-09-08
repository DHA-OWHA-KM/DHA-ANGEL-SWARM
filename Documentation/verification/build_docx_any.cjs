const fs = require('fs');
const d = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, PageOrientation, Header, Footer, PageNumber, LevelFormat,
  convertInchesToTwip, TabStopType } = d;

const ACC   = '1F3A5C';  // deep navy
const ACC2  = '3E5C76';
const RULE  = 'B9C4CE';
const HEADBG= 'E8ECF0';
const MUTED = '5A6672';
const RED   = '8C2F27';

const PAGE_W = 12240, PAGE_H = 15840;
const MARGIN = 1080;                 // 0.75"
const CONTENT_W = PAGE_W - 2*MARGIN; // 10080 dxa

const src = fs.readFileSync(process.argv[2],'utf8');
const lines = src.split('\n');

// ---- inline markdown -> TextRun[] ----
function runs(text, base = {}) {
  const out = [];
  // tokenize **bold** and *italic* and `code`
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ ...base, text: text.slice(last, m.index) }));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(new TextRun({ ...base, text: tok.slice(2,-2), bold: true }));
    else if (tok.startsWith('`')) out.push(new TextRun({ ...base, text: tok.slice(1,-1), font: 'Consolas', size: (base.size||21)-2 }));
    else out.push(new TextRun({ ...base, text: tok.slice(1,-1), italics: true }));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun({ ...base, text: text.slice(last) }));
  return out.length ? out : [new TextRun({ ...base, text: '' })];
}

const NOBORDER = { top:{style:BorderStyle.NONE,size:0,color:'FFFFFF'}, bottom:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},
  left:{style:BorderStyle.NONE,size:0,color:'FFFFFF'}, right:{style:BorderStyle.NONE,size:0,color:'FFFFFF'} };

function hr() {
  return new Paragraph({ spacing:{ before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 1 } },
    children: [new TextRun({ text:'' })] });
}

// ---- table builder ----
function buildTable(rowsRaw) {
  let head = rowsRaw[0];
  let body = rowsRaw.slice(1);
  const headerless = head.every(c => c === '');
  const n = head.length;

  // column widths chosen from the shape of the content
  let widths;
  if (n === 2) {
    const avg2 = body.length ? body.reduce((a,r)=>a+(r[1]||'').length,0)/body.length : 0;
    const avg1 = body.length ? body.reduce((a,r)=>a+(r[0]||'').length,0)/body.length : 0;
    const f = avg2 > 45 ? 0.40 : (avg1 > 40 ? 0.72 : 0.66);
    widths = [Math.round(CONTENT_W*f), CONTENT_W - Math.round(CONTENT_W*f)];
  } else if (n === 3) {
    widths = [Math.round(CONTENT_W*0.46), Math.round(CONTENT_W*0.27), CONTENT_W - Math.round(CONTENT_W*0.46) - Math.round(CONTENT_W*0.27)];
  } else { const w = Math.floor(CONTENT_W/n); widths = Array(n).fill(w); widths[0] += CONTENT_W - w*n; }

  /* A markdown table in the wild is not always rectangular -- a row with an
     unescaped pipe in it arrives with more cells than the header declared,
     and widths[i] is then undefined, which docx rejects with an opaque
     slice-of-undefined. Clamp to the last declared column. */
  const cell = (txt, i, isHead, alt) => new TableCell({
    width: { size: widths[Math.min(i, widths.length - 1)] || Math.floor(CONTENT_W / n), type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: isHead ? HEADBG : (alt ? 'F6F8FA' : 'FFFFFF'), color: 'auto' },
    margins: { top: 90, bottom: 90, left: 130, right: 130 },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: isHead ? 6 : 2, color: isHead ? ACC2 : 'DDE3E9' },
      bottom: { style: BorderStyle.SINGLE, size: isHead ? 6 : 2, color: isHead ? ACC2 : 'DDE3E9' },
      left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    children: [ new Paragraph({ spacing: { before: 0, after: 0 }, alignment: AlignmentType.LEFT,
      children: runs(txt, { size: 19, color: isHead ? ACC : '1A1A1A', bold: isHead }) }) ]
  });

  const trs = [];
  if (!headerless) trs.push(new TableRow({ tableHeader: true, cantSplit: true, children: head.map((t,i)=>cell(t,i,true,false)) }));
  body.forEach((r,ri)=> trs.push(new TableRow({ cantSplit: true, children: r.map((t,i)=>cell(t||'',i,false, (headerless?ri:ri)%2===1)) })));

  const tbl = new Table({ columnWidths: widths, width: { size: CONTENT_W, type: WidthType.DXA }, rows: trs });
  if (headerless) {
    // a headerless stat block gets a rule above it so it still reads as a unit
    return [ new Paragraph({ spacing:{ before: 40, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACC2, space: 1 } },
      children:[new TextRun({ text:'', size: 6 })] }), tbl ];
  }
  return [ tbl ];
}

// ---- parse ----
const children = [];
let i = 0;
let inTitle = true;

function push(p){ children.push(p); }

while (i < lines.length) {
  let L = lines[i];

  // horizontal rule
  if (/^---\s*$/.test(L)) { push(hr()); i++; continue; }

  // blank
  if (/^\s*$/.test(L)) { i++; continue; }

  // code fence
  if (/^```/.test(L)) {
    i++;
    const buf = [];
    while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
    i++;
    const cells = buf.map(t => new Paragraph({ spacing:{before:0,after:0},
      children:[new TextRun({ text: t.replace(/\t/g,'    '), font:'Consolas', size:17, color:'23303B' })] }));
    push(new Table({ columnWidths:[CONTENT_W], width:{size:CONTENT_W,type:WidthType.DXA}, rows:[
      new TableRow({ children:[ new TableCell({ width:{size:CONTENT_W,type:WidthType.DXA},
        shading:{type:ShadingType.CLEAR, fill:'F2F5F8', color:'auto'},
        margins:{top:140,bottom:140,left:180,right:180},
        borders:{ top:{style:BorderStyle.SINGLE,size:2,color:'DDE3E9'}, bottom:{style:BorderStyle.SINGLE,size:2,color:'DDE3E9'},
                  left:{style:BorderStyle.SINGLE,size:12,color:ACC2}, right:{style:BorderStyle.SINGLE,size:2,color:'DDE3E9'} },
        children: cells }) ]}) ]}));
    push(new Paragraph({ spacing:{after:160}, children:[new TextRun('')] }));
    continue;
  }

  // table
  if (/^\|/.test(L) && i+1 < lines.length && /^\|[\s:\-|]+\|$/.test(lines[i+1].trim())) {
    const rowsRaw = [];
    const parse = s => s.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim());
    rowsRaw.push(parse(L)); i += 2;
    while (i < lines.length && /^\|/.test(lines[i])) { rowsRaw.push(parse(lines[i])); i++; }
    buildTable(rowsRaw).forEach(push);
    push(new Paragraph({ spacing:{after:200}, children:[new TextRun('')] }));
    continue;
  }

  // headings
  let hm = L.match(/^(#{1,4})\s+(.*)$/);
  if (hm) {
    const lvl = hm[1].length, txt = hm[2];
    if (lvl === 1) {
      push(new Paragraph({ heading: HeadingLevel.TITLE, spacing:{ before: 0, after: 80 },
        children: runs(txt, { size: 56, bold: true, color: ACC, font:'Calibri' }) }));
    } else if (lvl === 2) {
      if (inTitle) {
        // subtitle line under the main title
        push(new Paragraph({ spacing:{ before: 0, after: 240 },
          children: runs(txt, { size: 26, color: ACC2, font:'Calibri' }) }));
        inTitle = false;
      } else {
        push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: false,
          spacing:{ before: 380, after: 140 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACC2, space: 4 } },
          children: runs(txt, { size: 28, bold: true, color: ACC, font:'Calibri' }) }));
      }
    } else if (lvl === 3) {
      push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing:{ before: 280, after: 100 },
        children: runs(txt, { size: 23, bold: true, color: ACC2, font:'Calibri' }) }));
    } else {
      push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing:{ before: 220, after: 80 },
        children: runs(txt, { size: 21, bold: true, color: '2E3B47', font:'Calibri' }) }));
    }
    inTitle = (lvl === 1) ? true : inTitle;
    i++; continue;
  }

  // blockquote (possibly multi-line)
  if (/^>\s?/.test(L)) {
    const buf = [];
    while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/,'')); i++; }
    const paras = buf.filter(t=>t.trim()).map(t => new Paragraph({ spacing:{before:0,after:0},
      children: runs(t, { size: 24, bold:true, color: ACC, font:'Calibri' }) }));
    push(new Table({ columnWidths:[CONTENT_W], width:{size:CONTENT_W,type:WidthType.DXA}, rows:[
      new TableRow({ children:[ new TableCell({ width:{size:CONTENT_W,type:WidthType.DXA},
        shading:{type:ShadingType.CLEAR, fill:'EEF2F6', color:'auto'},
        margins:{top:180,bottom:180,left:220,right:200},
        borders:{ top:{style:BorderStyle.NONE,size:0,color:'FFFFFF'}, bottom:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},
                  left:{style:BorderStyle.SINGLE,size:18,color:ACC}, right:{style:BorderStyle.NONE,size:0,color:'FFFFFF'} },
        children: paras }) ]}) ]}));
    push(new Paragraph({ spacing:{after:200}, children:[new TextRun('')] }));
    continue;
  }

  // numbered list
  let nm = L.match(/^(\d+)\.\s+(.*)$/);
  if (nm) {
    push(new Paragraph({ numbering: { reference: 'as-num', level: 0 },
      spacing:{ before: 60, after: 60 }, children: runs(nm[2], { size: 21 }) }));
    i++; continue;
  }

  // bullet
  if (/^[-*]\s+/.test(L)) {
    push(new Paragraph({ numbering: { reference: 'as-bul', level: 0 },
      spacing:{ before: 50, after: 50 }, children: runs(L.replace(/^[-*]\s+/,''), { size: 21 }) }));
    i++; continue;
  }

  // plain paragraph — gather continuation lines
  const buf = [L]; i++;
  while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^[#>|\-*`]/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) { buf.push(lines[i]); i++; }
  const txt = buf.join(' ');
  const t0 = txt.trim();
  const isMeta = /^\*[^*][\s\S]*[^*]\*$/.test(t0) && !t0.startsWith('**');
  push(new Paragraph({ spacing:{ before: 60, after: 140 }, alignment: AlignmentType.LEFT,
    children: runs(txt, { size: 21, color: isMeta ? MUTED : '1A1A1A' }) }));
}

// classification band helpers
const CLASS_TEXT = 'UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY';

const header = new Header({ children: [ new Paragraph({
  alignment: AlignmentType.CENTER, spacing:{ after: 120 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 3 } },
  children: [ new TextRun({ text: CLASS_TEXT, bold: true, size: 15, color: RED, font:'Calibri' }) ] }) ] });

const footer = new Footer({ children: [ new Paragraph({
  spacing:{ before: 100 },
  border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
  tabStops: [ { type: TabStopType.RIGHT, position: CONTENT_W } ],
  children: [
    new TextRun({ text: CLASS_TEXT, bold: true, size: 14, color: RED, font:'Calibri' }),
    new TextRun({ text: '\t', size: 14 }),
    new TextRun({ text: 'ANGEL SWARM  ·  Page ', size: 15, color: MUTED, font:'Calibri' }),
    new TextRun({ children: [PageNumber.CURRENT], size: 15, color: MUTED, font:'Calibri' }),
    new TextRun({ text: ' of ', size: 15, color: MUTED, font:'Calibri' }),
    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: MUTED, font:'Calibri' }),
  ] }) ] });

const doc = new Document({
  creator: 'ANGEL SWARM',
  title: (src.split('\n').find(l=>l.startsWith('# '))||'# ANGEL SWARM').slice(2).trim(),
  description: 'NDIA Global Defense Hackathon 2026 — Military Health System combat support use case',
  styles: { default: {
    document: { run: { font: 'Calibri', size: 21, color: '1A1A1A' }, paragraph: { spacing: { line: 276, after: 120 } } },
  } },
  numbering: { config: [
    { reference: 'as-bul', levels: [
      { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.18) } },
                 run: { color: ACC2 } } } ] },
    { reference: 'as-num', levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: convertInchesToTwip(0.34), hanging: convertInchesToTwip(0.24) } },
                 run: { bold: true, color: ACC } } } ] },
  ] },
  sections: [ {
    properties: { page: { size: { width: PAGE_W, height: PAGE_H, orientation: PageOrientation.PORTRAIT },
                          margin: { top: 1080, right: MARGIN, bottom: 1000, left: MARGIN, header: 560, footer: 480 } } },
    headers: { default: header },
    footers: { default: footer },
    children,
  } ],
});

Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[3], b); console.log('OK', b.length, 'bytes'); });
