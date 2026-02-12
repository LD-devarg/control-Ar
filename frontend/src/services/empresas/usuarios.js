import { apiClient } from "../auth";

export async function fetchUsuarios() {
  const { data } = await apiClient.get("/usuarios/");
  return data || [];
}

export async function fetchGrupos() {
  const { data } = await apiClient.get("/grupos/");
  return data || [];
}

export async function createUsuario(payload) {
  const { data } = await apiClient.post("/usuarios/", payload);
  return data;
}

export async function updateUsuario(id, payload) {
  const { data } = await apiClient.patch(`/usuarios/${id}/`, payload);
  return data;
}
