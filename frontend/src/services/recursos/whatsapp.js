import { apiClient, getCurrentUser } from "../auth";

export async function fetchWhatsapps() {
  const { data } = await apiClient.get(`/whatsapps/`);
  return data;
}

export async function createWhatsapp(numero) {
  const user = getCurrentUser();
  if (!user?.empresa) {
    throw new Error("Empresa no disponible en el usuario actual.");
  }
  const payload = {
    numero,
    activo: true,
    empresa: user.empresa,
  };
  const { data } = await apiClient.post(`/whatsapps/`, payload);
  return data;
}

export async function deactivateWhatsapp(line) {
  const payload = {
    id: line.id,
    numero: line.numero,
    empresa: line.empresa,
    activo: false,
    ultimo_uso: line.ultimo_uso ?? null,
  };
  const { data } = await apiClient.put(`/whatsapps/${line.id}/`, payload);
  return data;
}
