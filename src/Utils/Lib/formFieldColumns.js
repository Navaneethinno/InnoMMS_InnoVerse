// Tuple shape: [key, translationKey, type, lookupKey?]. Keep booleans separate.
export function splitFieldsIntoColumns(fields) {
  return {
    inputs: fields.filter((field) => field[2] !== "boolean"),
    booleans: fields.filter((field) => field[2] === "boolean"),
  };
}
export const orderedFields = (fields) => {
  const { inputs, booleans } = splitFieldsIntoColumns(fields);
  return [...inputs, ...booleans];
};
