import { useEffect, useMemo, useState } from "react";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import MarkChatUnreadOutlinedIcon from "@mui/icons-material/MarkChatUnreadOutlined";
import { getCurrentUser } from "../services/auth";
import { fetchNotificacionesEstructura, markAllNotificacionesRead } from "../services/empresas/notificaciones";
import { useTenant } from "../context/TenantContext";

const POLL_MS = 30000;

function canViewNotifications(user) {
  if (user?.is_superuser) return true;
  const groups = Array.isArray(user?.group_names) ? user.group_names.map((name) => String(name).toLowerCase()) : [];
  return groups.includes("admin") || groups.includes("admin organizacional");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR", { hour12: false });
}

export default function NuevoLeadAlert() {
  const { tenantId } = useTenant();
  const [items, setItems] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const user = getCurrentUser();

  const canView = canViewNotifications(user);

  const load = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const data = await fetchNotificacionesEstructura(20);
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) return undefined;
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [canView, tenantId]);

  const unreadCount = useMemo(() => items.filter((item) => !item.leida).length, [items]);

  if (!canView) return null;

  return (
    <div className="flex items-center text-black dark:text-white text-sm mr-2">
      <IconButton size="small" onClick={(event) => setAnchorEl(event.currentTarget)} sx={{ color: "inherit" }}>
        <Badge
          badgeContent={unreadCount}
          sx={{
            "& .MuiBadge-badge": {
              backgroundColor: "#FF3D00",
              color: "#fff",
            },
          }}
        >
          <MarkChatUnreadOutlinedIcon sx={{ fontSize: "1.5rem", color: "inherit" }} />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <div className="w-[340px] max-w-[90vw] bg-zinc-950 text-zinc-100 border border-white/10 rounded-md">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-sm font-semibold">Notificaciones</span>
            <Button
              size="small"
              disabled={marking || unreadCount === 0}
              onClick={async () => {
                setMarking(true);
                try {
                  await markAllNotificacionesRead();
                  await load();
                } finally {
                  setMarking(false);
                }
              }}
            >
              Marcar todas
            </Button>
          </div>

          <div className="max-h-[360px] overflow-auto">
            {loading ? <div className="px-3 py-2 text-xs text-zinc-400">Cargando...</div> : null}
            {!loading && items.length === 0 ? (
              <div className="px-3 py-3 text-xs text-zinc-400">Sin notificaciones.</div>
            ) : null}
            {items.map((item) => (
              <div key={item.id} className="px-3 py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${item.leida ? "bg-zinc-600" : "bg-orange-500"}`} />
                  <span className="text-[11px] uppercase tracking-wide text-zinc-400">{item.tipo}</span>
                </div>
                <div className="text-sm leading-snug mt-1">{item.mensaje}</div>
                <div className="text-[11px] text-zinc-500 mt-1">{formatDateTime(item.creado_en)}</div>
              </div>
            ))}
          </div>
        </div>
      </Popover>
    </div>
  );
}
