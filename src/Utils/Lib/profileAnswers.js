// Turns the profile's sections (the sign-up questions with the merchant's
// answers) into rows to show. Pure.

const FILE_TYPES = /FILE|PHOTO|IMAGE|CAMERA|SELFIE|SIGNATURE/i;
const isBlank = (value) => value == null || value === "" || (Array.isArray(value) && value.length === 0);

export const humanize = (key) => String(key).replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());

// One answer as text: a dropdown or radio value shows its choice's label, a
// list its items, and "" when nothing was answered. Masked document numbers
// are shown as they come.
export function answerText(field, value, { yes = "Yes", no = "No" } = {}) {
  if (isBlank(value)) return "";
  if (Array.isArray(value)) return value.map((item) => answerText(field, item, { yes, no })).filter(Boolean).join(", ");
  if (typeof value === "boolean") return value ? yes : no;
  if (typeof value === "object") return Object.values(value).filter((item) => !isBlank(item)).map(String).join(", ");
  const choice = field?.choices?.find((item) => String(item.value) === String(value));
  return choice ? choice.label : String(value);
}

// A section as blocks of { key, label, text } rows: one block, or one per item
// when the section repeats (`values` is a list). Photo fields are left out (they
// are the documents). With no field list, the answers' own keys are used.
export function sectionBlocks(section, options) {
  const fields = (section.fields ?? []).filter((field) => !FILE_TYPES.test(field.field_type ?? ""));
  const list = Array.isArray(section.values) ? section.values : [section.values ?? {}];
  return list
    .map((values) => {
      const shown = fields.length ? fields : Object.keys(values ?? {}).map((key) => ({ key, label: humanize(key) }));
      return shown.map((field) => ({ key: field.key, label: field.label ?? humanize(field.key), text: answerText(field, values?.[field.key], options) }));
    })
    .filter((rows) => rows.length);
}
