export function toDateTimeLocalInputValue(date = new Date()) {
  const resolved = date instanceof Date ? date : new Date(date);
  const pad = (value) => String(value).padStart(2, "0");
  return [
    resolved.getFullYear(),
    pad(resolved.getMonth() + 1),
    pad(resolved.getDate()),
  ].join("-") + "T" + [
    pad(resolved.getHours()),
    pad(resolved.getMinutes()),
  ].join(":");
}
