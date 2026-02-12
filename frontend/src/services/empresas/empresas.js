import { apiClient } from "../auth";

export async function fetchEmpresas() {
  const { data } = await apiClient.get("/empresas/");
  return data || [];
}

export async function createEmpresa(payload) {
  const { data } = await apiClient.post("/empresas/", payload);
  return data;
}

export async function updateEmpresa(id, payload) {
  const { data } = await apiClient.patch(`/empresas/${id}/`, payload);
  return data;
}
