export function buildClienteDisplayLabel(cliente) {
  if (!cliente) return "";

  const codigo = String(cliente.codigo || "").trim();
  const nombre = String(cliente.nombre || "").trim();
  const username = String(cliente.username || "").trim();
  const contacto = String(cliente.contacto || "").trim();

  const primaryParts = [codigo ? `#${codigo}` : "", nombre, username]
    .filter(Boolean);
  const secondary = contacto || "Sin contacto";

  if (!primaryParts.length) {
    return codigo ? `#${codigo} - ${secondary}` : secondary;
  }

  return `${primaryParts.join(" - ")} - ${secondary}`;
}
