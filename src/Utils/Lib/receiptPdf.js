import { barcodeBars } from "./barcode";
import { formatDate, formatMoney, formatTime } from "./format";
import { accountLine, receiptTexts } from "./receiptTransaction";

// The receipt as a PDF, laid out like the thermal slip on screen: 80 mm wide,
// as tall as it needs to be, monospaced text, dashed rules, the barcode. jsPDF
// is loaded only when the merchant asks for the download.
const WIDTH = 80;
const MARGIN = 6;
const INNER = WIDTH - MARGIN * 2;
const LINE = 4.4; // mm per 8pt line

// Lays the receipt out on `doc` (measuring text as it goes) and returns the
// height used. Called twice: once on a scratch page to learn the height, then
// on the real page of exactly that height.
function layout(doc, { tx, t, brand, logo }) {
  const words = receiptTexts(tx, t, brand);
  const money = (value) => (value != null && value !== "" ? formatMoney(value, tx.currency) : null);
  const when = tx.dateTime ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(tx.dateTime) ? tx.dateTime : `${tx.dateTime}Z`) : null;
  const dated = when && !Number.isNaN(when.getTime());
  let y = 8;

  doc.setFont("courier", "normal");
  const center = (text, { size = 8, bold = false, gap = LINE } = {}) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.splitTextToSize(String(text), INNER).forEach((part) => {
      doc.text(part, WIDTH / 2, y, { align: "center" });
      y += gap;
    });
  };
  const rule = () => {
    doc.setLineDashPattern([0.6, 0.8], 0);
    doc.setDrawColor(130);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 1.6, WIDTH - MARGIN, y - 1.6);
    doc.setLineDashPattern([], 0);
    y += 1.8;
  };
  const row = (label, value, { bold = false, size = 8 } = {}) => {
    if (value == null || value === "") return;
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const text = String(value);
    const labelWidth = doc.getTextWidth(label);
    if (labelWidth + doc.getTextWidth(text) + 3 <= INNER) {
      doc.setTextColor(110);
      doc.text(label, MARGIN, y);
      doc.setTextColor(35, 32, 27);
      doc.text(text, WIDTH - MARGIN, y, { align: "right" });
      y += LINE;
    } else {
      // A long value drops to the next line, still right-aligned.
      doc.setTextColor(110);
      doc.text(label, MARGIN, y);
      y += LINE;
      doc.setTextColor(35, 32, 27);
      doc.splitTextToSize(text, INNER).forEach((part) => {
        doc.text(part, WIDTH - MARGIN, y, { align: "right" });
        y += LINE;
      });
    }
  };
  const sub = (text) => {
    if (!text) return;
    doc.setFont("courier", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(110);
    doc.text(text, WIDTH - MARGIN, y, { align: "right" });
    doc.setTextColor(35, 32, 27);
    y += LINE - 0.4;
  };

  doc.setTextColor(35, 32, 27);
  if (logo) {
    // The institution's logo, in grey like a thermal print, centred on top.
    const height = Math.min(13, 34 / logo.ratio);
    const width = height * logo.ratio;
    doc.addImage(logo.data, "JPEG", (WIDTH - width) / 2, y - 2, width, height);
    y += height + 3;
  }
  center(words.name.toUpperCase().split("").join(" "), { size: 11, bold: true, gap: 5 });
  doc.setTextColor(110);
  words.header.forEach((line) => center(line, { size: 7 }));
  center(words.subtitle, { size: 7.2 });
  doc.setTextColor(35, 32, 27);
  y += 1;
  rule();
  center(words.heading, { bold: true });
  rule();
  row(t("receipt.amount"), money(tx.amount));
  row(t("receipt.fee"), money(tx.fee ?? 0));
  rule();
  row(t("receipt.from"), tx.from?.name);
  sub(accountLine(tx.from?.account, tx.wallet, t("pos.acc")));
  row(t("receipt.wallet"), tx.wallet);
  row(t("receipt.to"), tx.to?.name);
  sub(accountLine(tx.to?.account, tx.wallet, t("pos.acc")));
  row(t("receipt.card"), tx.card);
  row(t("receipt.reason"), tx.reason);
  rule();
  if (dated) row(t("pos.date"), formatDate(when));
  if (dated) row(t("receipt.time"), formatTime(when));
  row(t("receipt.status"), tx.status);
  row(t("receipt.reference"), tx.reference);
  rule();
  row(t("pos.total"), money(tx.total ?? tx.amount), { bold: true, size: 9.5 });
  row(t("receipt.balance"), money(tx.balanceAfter));
  rule();
  if (tx.reference) {
    const { bars, total } = barcodeBars(tx.reference);
    const width = INNER * 0.78;
    const unit = width / total;
    const left = (WIDTH - width) / 2;
    doc.setFillColor(35, 32, 27);
    bars.forEach((bar) => doc.rect(left + bar.x * unit, y, bar.width * unit, 11, "F"));
    y += 14;
    doc.setTextColor(110);
    center(String(tx.reference).split("").join(" "), { size: 7.2 });
    doc.setTextColor(35, 32, 27);
    y += 1;
  }
  words.footer.forEach((line, index) => {
    doc.setTextColor(index === 0 ? 35 : 110);
    center(line, { size: index === 0 ? 8 : 7 });
  });
  return y + 4;
}

// The logo (an image address) as grey JPEG data and its width/height ratio.
// Nothing is drawn when it cannot be read.
async function loadLogo(url) {
  if (!url) return null;
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 320 / image.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const grey = 0.299 * pixels.data[i] + 0.587 * pixels.data[i + 1] + 0.114 * pixels.data[i + 2];
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = grey;
    }
    context.putImageData(pixels, 0, 0);
    return { data: canvas.toDataURL("image/jpeg", 0.85), ratio: canvas.width / canvas.height };
  } catch {
    return null;
  }
}

export async function downloadReceiptPdf({ tx, t, brand, logoUrl }) {
  const { jsPDF } = await import("jspdf");
  const logo = await loadLogo(logoUrl);
  const scratch = new jsPDF({ unit: "mm", format: [WIDTH, 400] });
  const height = layout(scratch, { tx, t, brand, logo });
  const doc = new jsPDF({ unit: "mm", format: [WIDTH, Math.max(height, 60)] });
  layout(doc, { tx, t, brand, logo });
  doc.setProperties({ title: `${brand} receipt ${tx.reference ?? ""}`.trim() });
  doc.save(`receipt-${tx.reference ?? "payment"}.pdf`);
}
