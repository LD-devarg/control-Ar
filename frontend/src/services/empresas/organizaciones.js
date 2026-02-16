import { apiClient } from "../auth";

export async function fetchOrganizaciones() {
  const { data } = await apiClient.get("/organizaciones/");
  return data || [];
}

export async function createOrganizacion(payload) {
  const { data } = await apiClient.post("/organizaciones/", payload);
  return data;
}

export async function updateOrganizacion(id, payload) {
  const { data } = await apiClient.patch(`/organizaciones/${id}/`, payload);
  return data;
}
