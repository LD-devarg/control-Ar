import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import SearchIcon from "@mui/icons-material/Search";
import ChatIcon from "@mui/icons-material/Chat";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import { useTenant } from "../context/TenantContext.jsx";
import { fetchClientes, updateCliente } from "../services/operativo/clientes.js";
import { fetchConversations } from "../services/crm/whatsapp.js";
import FormClienteCreate from "../components/FormClienteCreate.jsx";
import CargaMasivaContactos from "../components/CargaMasivaContactos.jsx";

const AVATAR_GRADIENTS = [
  "from-pink-500 to-rose-500",
  "from-purple-500 to-indigo-500",
  "from-blue-500 to-sky-500",
  "from-teal-500 to-emerald-500",
  "from-amber-500 to-orange-500",
];

function getInitials(name, wa_phone) {
  if (!name) return wa_phone ? wa_phone.slice(-4) : "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function getAvatarGradient(phone) {
  const cleanPhone = String(phone || "").replace(/\D/g, "");
  const sum = cleanPhone.split("").reduce((acc, char) => acc + parseInt(char, 10), 0);
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
}

// Custom theme to force dark theme inside MUI dialogs
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#a3e635", // Lime
    },
    background: {
      default: "#111216",
      paper: "#1b1c21",
    },
    text: {
      primary: "#f4f4f5",
      secondary: "#a1a1aa",
    },
  },
});

export default function CRMContactos() {
  const navigate = useNavigate();
  const { tenantId } = useTenant();

  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [openCreate, setOpenCreate] = useState(false);
  const [openCargaMasiva, setOpenCargaMasiva] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // Edit fields
  const [editForm, setEditForm] = useState({ nombre: "", contacto: "", username: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Toast
  const [toast, setToast] = useState({ open: false, severity: "success", message: "" });

  const showToast = (severity, message) => {
    setToast({ open: true, severity, message });
  };

  // Load Contacts and Conversations
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [contactsData, conversationsData] = await Promise.all([
          fetchClientes(),
          fetchConversations(),
        ]);
        if (mounted) {
          setContacts(contactsData || []);
          setConversations(conversationsData || []);
        }
      } catch (err) {
        if (mounted) {
          showToast("error", "Error al cargar los contactos o conversaciones.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [tenantId, refreshKey]);

  // Map contacts to their corresponding conversations
  const contactsWithChats = useMemo(() => {
    return contacts.map((contact) => {
      // Find a matching conversation by wa_phone or matching phone/contacto
      const waPhone = contact.wa_phone || contact.contacto;
      const matched = conversations.find(
        (conv) =>
          String(conv.wa_phone) === String(waPhone) ||
          String(conv.cliente_id) === String(contact.id)
      );
      return {
        ...contact,
        conversation: matched || null,
      };
    });
  }, [contacts, conversations]);

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contactsWithChats;
    return contactsWithChats.filter((c) => {
      const name = (c.nombre || "").toLowerCase();
      const code = (c.codigo || "").toLowerCase();
      const user = (c.username || "").toLowerCase();
      const phone = (c.contacto || c.wa_phone || "").toLowerCase();
      return name.includes(query) || code.includes(query) || user.includes(query) || phone.includes(query);
    });
  }, [contactsWithChats, searchQuery]);

  const handleChat = (contact) => {
    if (contact.conversation) {
      navigate(`/crm?conversation_id=${contact.conversation.id}`);
    } else {
      const phone = contact.wa_phone || contact.contacto;
      if (phone) {
        navigate(`/crm?phone=${phone}`);
      } else {
        showToast("warning", "El contacto no tiene número de teléfono asignado.");
      }
    }
  };

  const handleOpenEdit = (contact) => {
    setEditingContact(contact);
    setEditForm({
      nombre: contact.nombre || "",
      contacto: contact.contacto || "",
      username: contact.username || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingContact) return;
    setSavingEdit(true);
    try {
      await updateCliente(editingContact.id, {
        nombre: editForm.nombre.trim(),
        contacto: editForm.contacto.trim(),
        username: editForm.username.trim(),
      });
      showToast("success", "Contacto actualizado correctamente.");
      setEditingContact(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        Object.values(err?.response?.data || {}).flat().find((value) => typeof value === "string") ||
        "Error al actualizar el contacto.";
      showToast("error", detail);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="flex flex-col flex-1 h-full w-full bg-[#090a0c] text-zinc-100 overflow-hidden">
        
        {/* Header Topbar */}
        <header className="flex shrink-0 items-center justify-between border-b border-[#1f2128] px-6 py-4 bg-[#111216]">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white tracking-tight">Contactos CRM</h1>
            <p className="text-xs text-zinc-400 mt-1">
              {loading ? "Cargando..." : `${filteredContacts.length} contactos de la empresa`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                <SearchIcon fontSize="small" />
              </span>
              <input
                type="text"
                placeholder="Buscar contactos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1b1c21] border border-[#2d3039] rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#a3e635] transition-colors"
              />
            </div>

            {/* Refresh Button */}
            <IconButton
              size="small"
              onClick={() => setRefreshKey((prev) => prev + 1)}
              sx={{ color: "rgba(255,255,255,0.4)", "&:hover": { color: "white" } }}
              title="Recargar contactos"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>

            {/* Carga Masiva Button */}
            <button
              onClick={() => setOpenCargaMasiva(true)}
              className="flex items-center gap-1.5 border border-[#2d3039] hover:border-[#a3e635]/40 hover:text-[#a3e635] rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-400 bg-transparent transition"
            >
              <CloudUploadIcon sx={{ fontSize: 15 }} />
              <span>Carga Masiva</span>
            </button>

            {/* Nuevo Contacto Button */}
            <button
              onClick={() => setOpenCreate(true)}
              className="flex items-center gap-1 bg-[#a3e635] text-black font-bold text-xs rounded-xl px-3 py-1.5 hover:bg-[#84cc16] transition"
            >
              <AddIcon sx={{ fontSize: 16 }} />
              <span>Nuevo Contacto</span>
            </button>
          </div>
        </header>

        {/* Contacts Grid/List view */}
        <main className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <CircularProgress size={36} sx={{ color: "#a3e635" }} />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-12 text-zinc-500 h-64">
              <span className="text-4xl mb-2">👤</span>
              <p className="text-sm font-semibold">No se encontraron contactos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredContacts.map((contact) => {
                const phone = contact.contacto || contact.wa_phone;
                const hasChat = Boolean(contact.conversation);
                return (
                  <div
                    key={contact.id}
                    className="bg-[#111216] border border-[#1f2128] hover:border-zinc-700/60 rounded-2xl p-4 flex items-center justify-between transition duration-200 shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar with initials and phone gradient */}
                      <div className="relative shrink-0">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(phone)} text-sm font-bold text-white shadow-sm`}>
                          {getInitials(contact.nombre, phone)}
                        </div>
                      </div>

                      {/* Details text */}
                      <div className="min-w-0 leading-tight">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-zinc-100">
                            {contact.nombre || "Sin nombre"}
                          </span>
                          {contact.origen === "whatsapp" && (
                            <span className="inline-flex items-center rounded-full bg-emerald-950/40 px-1.5 py-0.2 text-[8px] font-bold text-emerald-400 uppercase">
                              WA
                            </span>
                          )}
                          {(contact.ctwa_clid || contact.source_ad_id) && (
                            <span className="inline-flex items-center rounded-full bg-[#a3e635]/15 px-1.5 py-0.2 text-[8px] font-bold text-[#a3e635] uppercase">
                              Pauta
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-mono mt-1">{phone || "Sin teléfono"}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500">
                          <span className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                            {contact.codigo}
                          </span>
                          {contact.username && (
                            <span className="truncate">
                              @{contact.username}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions on the right side */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Edit Button */}
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(contact)}
                        sx={{
                          color: "rgba(255,255,255,0.35)",
                          backgroundColor: "rgba(255,255,255,0.03)",
                          border: "1px solid #1f2128",
                          "&:hover": {
                            color: "white",
                            backgroundColor: "rgba(255,255,255,0.08)",
                          },
                        }}
                        title="Editar datos"
                      >
                        <EditIcon sx={{ fontSize: 13 }} />
                      </IconButton>

                      {/* Chat redirect action button */}
                      {hasChat ? (
                        <button
                          onClick={() => handleChat(contact)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 bg-[#a3e635] text-black hover:bg-[#84cc16]"
                          title="Ir al chat"
                        >
                          <ChatIcon sx={{ fontSize: 12 }} />
                          <span>Chat</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleChat(contact)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 bg-zinc-800 text-zinc-400 hover:bg-zinc-700/60 hover:text-white"
                          title="Iniciar conversación con este número"
                        >
                          <ChatIcon sx={{ fontSize: 12 }} />
                          <span>Chat</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Modal: Crear cliente */}
        <Dialog
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              backgroundColor: "#1b1c21",
              backgroundImage: "none",
              border: "1px solid #2d3039",
              borderRadius: "16px",
            },
          }}
        >
          <DialogTitle sx={{ color: "white", fontWeight: "bold", borderBottom: "1px solid #2d3039", pb: 2 }}>
            Crear Nuevo Contacto
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <FormClienteCreate
              empresaId={tenantId}
              onCreated={() => {
                setOpenCreate(false);
                setRefreshKey((prev) => prev + 1);
                showToast("success", "Contacto creado correctamente.");
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Modal: Editar cliente */}
        <Dialog
          open={Boolean(editingContact)}
          onClose={() => setEditingContact(null)}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: {
              backgroundColor: "#1b1c21",
              backgroundImage: "none",
              border: "1px solid #2d3039",
              borderRadius: "16px",
            },
          }}
        >
          <DialogTitle sx={{ color: "white", fontWeight: "bold", borderBottom: "1px solid #2d3039", pb: 2 }}>
            Editar Contacto
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <div className="flex flex-col gap-4">
              <TextField
                label="Nombre"
                fullWidth
                size="small"
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                sx={{
                  "& .MuiInputBase-input": { color: "white" },
                  "& .MuiInputLabel-root": { color: "rgba(148,163,184,0.7)" },
                  "& .MuiOutlinedInput-root fieldset": { borderColor: "rgba(148,163,184,0.25)" },
                  "& .MuiOutlinedInput-root:hover fieldset": { borderColor: "rgba(148,163,184,0.5)" },
                  "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#a3e635" },
                }}
              />
              <TextField
                label="Contacto / Teléfono"
                fullWidth
                size="small"
                value={editForm.contacto}
                onChange={(e) => setEditForm({ ...editForm, contacto: e.target.value })}
                sx={{
                  "& .MuiInputBase-input": { color: "white" },
                  "& .MuiInputLabel-root": { color: "rgba(148,163,184,0.7)" },
                  "& .MuiOutlinedInput-root fieldset": { borderColor: "rgba(148,163,184,0.25)" },
                  "& .MuiOutlinedInput-root:hover fieldset": { borderColor: "rgba(148,163,184,0.5)" },
                  "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#a3e635" },
                }}
              />
              <TextField
                label="Username"
                fullWidth
                size="small"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                sx={{
                  "& .MuiInputBase-input": { color: "white" },
                  "& .MuiInputLabel-root": { color: "rgba(148,163,184,0.7)" },
                  "& .MuiOutlinedInput-root fieldset": { borderColor: "rgba(148,163,184,0.25)" },
                  "& .MuiOutlinedInput-root:hover fieldset": { borderColor: "rgba(148,163,184,0.5)" },
                  "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#a3e635" },
                }}
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
            <Button
              onClick={() => setEditingContact(null)}
              variant="outlined"
              sx={{
                color: "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.15)",
                "&:hover": { borderColor: "white" },
              }}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              variant="contained"
              sx={{
                backgroundColor: "#a3e635",
                color: "black",
                fontWeight: "bold",
                "&:hover": { backgroundColor: "#84cc16" },
              }}
              disabled={savingEdit || !editForm.contacto.trim()}
            >
              {savingEdit ? "Guardando..." : "Guardar"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal: Carga masiva */}
        <CargaMasivaContactos
          open={openCargaMasiva}
          onClose={() => setOpenCargaMasiva(false)}
          onProcessed={() => {
            setRefreshKey((prev) => prev + 1);
            showToast("success", "Carga masiva procesada con éxito.");
          }}
        />

        {/* Feedback Snackbar toast */}
        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setToast((prev) => ({ ...prev, open: false }))}
            severity={toast.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </div>
    </ThemeProvider>
  );
}
