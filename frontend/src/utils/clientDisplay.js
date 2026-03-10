export function buildClienteDisplayLabel(cliente) {
  if (!cliente) return "";

  const codigo = String(cliente.codigo || "").trim();
  const nombre = String(cliente.nombre || "").trim();
  const username = String(cliente.username || "").trim();
  const contacto = String(cliente.contacto || "").trim();
  const clienteId = String(cliente.id || "").trim();

  const primaryParts = [codigo ? `#${codigo}` : clienteId ? `Cliente #${clienteId}` : "", nombre, username]
    .filter(Boolean);
  const secondary = contacto || "Sin datos";

  if (!primaryParts.length) {
    return clienteId ? `Cliente #${clienteId} - ${secondary}` : secondary;
  }

  return `${primaryParts.join(" - ")} - ${secondary}`;
}
