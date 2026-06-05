import { apiClient } from "../auth";

export async function fetchConversations(params = {}) {
  const { data } = await apiClient.get("/crm/conversations/", { params });
  return Array.isArray(data) ? data : data?.results || [];
}

export async function fetchMessages(conversationId) {
  const { data } = await apiClient.get("/crm/messages/", {
    params: { conversation: conversationId },
  });
  return Array.isArray(data) ? data : data?.results || [];
}

export async function updateConversation(conversationId, payload) {
  const { data } = await apiClient.patch(`/crm/conversations/${conversationId}/`, payload);
  return data;
}

export async function replyConversation(conversationId, body) {
  const { data } = await apiClient.post(`/crm/conversations/${conversationId}/responder/`, { body });
  return data;
}

export async function fetchWhatsappConfigs(params = {}) {
  const { data } = await apiClient.get("/crm/whatsapp-configs/", { params });
  return Array.isArray(data) ? data : data?.results || [];
}

export async function createWhatsappConfig(payload) {
  const { data } = await apiClient.post("/crm/whatsapp-configs/", payload);
  return data;
}

export async function updateWhatsappConfig(configId, payload) {
  const { data } = await apiClient.patch(`/crm/whatsapp-configs/${configId}/`, payload);
  return data;
}
