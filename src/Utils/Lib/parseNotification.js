// Reads a notification's title and body (plain text, as the institution sends
// it) into what the inbox shows. It is a pure function on purpose: when the
// backend sends these fields already structured, this is the one place to
// replace.
//
// parseNotification(title, body, { brand }) -> {
//   type          "money_in" | "money_out" | "security" | "statement" | "interest" | "generic"
//   displayTitle  a short title for the type (English), or the original title (without the bank's name) when generic
//   amount        { currency, value, text } from the title ("MZN 999999999000.00"), or null; `text` has thousands separators
//   direction     "in" | "out" | null (the sign of the amount)
//   summary       one line for the collapsed card
//   details       [{ key: "from" | "account" | "reference" | "balance", value }] found in the body (empty if none)
// }

// The first rule that matches wins. The title is tried first, then the body.
const RULES = [
  ["money_in", /\breceived\b/i],
  ["money_out", /\b(sent|debited|paid)\b/i],
  ["security", /sign-?\s?in|log-?\s?in|password|\botp\b|security/i],
  ["statement", /\bstatement/i],
  ["interest", /\binterest/i],
];
const detect = (text) => RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? null;

const SHORT_TITLES = {
  money_in: "Money received",
  money_out: "Money sent",
  security: "Security alert",
  statement: "Statement ready",
  interest: "Interest credited",
};

const AMOUNT = /\b([A-Z]{3})\s*(-?[\d,]*\d(?:\.\d+)?)/;
const groupDigits = (value) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(String(value).replace(/,/g, ""));
const maskNumbers = (text) => text.replace(/\*{2,}(\d{4})/g, "****$1");

// "ETAKU: MZN 10 received..." -> "MZN 10 received...": the bank's name in front is dropped.
function stripBank(title, brand) {
  const match = /^\s*([^:]{1,30}):\s*(.+)$/s.exec(title);
  if (!match) return title.trim();
  const prefix = match[1].trim();
  const isBrand = brand && prefix.toLowerCase() === String(brand).toLowerCase();
  return isBrand || /^\S{1,16}$/.test(prefix) ? match[2].trim() : title.trim();
}

function findAmount(text) {
  const match = AMOUNT.exec(text);
  return match ? { currency: match[1], value: match[2].replace(/,/g, ""), text: `${match[1]} ${groupDigits(match[2])}` } : null;
}

function findDetails(body, amount) {
  const details = [];
  const from = /received from (.+?)\.(?:\s|$)/i.exec(body);
  if (from) details.push({ key: "from", value: from[1].trim() });
  const account = /account \*+(\d{4})/i.exec(body);
  if (account) details.push({ key: "account", value: `****${account[1]}` });
  const reference = /Reference:\s*(\d+)/i.exec(body);
  if (reference) details.push({ key: "reference", value: reference[1] });
  const balance = /Available balance:\s*(?:([A-Z]{3})\s*)?(-?[\d,]*\d(?:\.\d+)?)/i.exec(body);
  if (balance) details.push({ key: "balance", value: `${balance[1] ?? amount?.currency ?? ""} ${groupDigits(balance[2])}`.trim() });
  return details;
}

// "From Walter White WW into your account ****0033", else the first line of the
// body after the greeting.
function buildSummary(body, details, type) {
  const from = details.find((detail) => detail.key === "from")?.value;
  const account = details.find((detail) => detail.key === "account")?.value;
  if (type === "money_in" && from) return `From ${from}${account ? ` into your account ${account}` : ""}`;
  const to = /\b(?:sent|paid|transferred) to (.+?)(?:\.(?:\s|$)| from |$)/im.exec(body);
  if (type === "money_out" && to) return `To ${to[1].trim()}${account ? ` from your account ${account}` : ""}`;
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const first = lines.find((line) => !/^dear\b.*,$/i.test(line) && !/^(hi|hello)\b.*,$/i.test(line)) ?? lines[0] ?? "";
  return maskNumbers(first);
}

export function parseNotification(title = "", body = "", { brand } = {}) {
  const cleanTitle = stripBank(String(title), brand);
  const text = String(body);
  const type = detect(cleanTitle) ?? detect(text) ?? "generic";
  const amount = findAmount(cleanTitle) ?? (type === "money_in" || type === "money_out" ? findAmount(text) : null);
  const details = findDetails(text, amount);
  return {
    type,
    displayTitle: type === "generic" ? maskNumbers(cleanTitle) : SHORT_TITLES[type],
    amount,
    direction: type === "money_in" ? "in" : type === "money_out" ? "out" : null,
    summary: buildSummary(text, details, type),
    details,
  };
}
