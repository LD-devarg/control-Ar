import { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import MarkChatUnreadOutlinedIcon from "@mui/icons-material/MarkChatUnreadOutlined";
import { getCurrentUser } from "../services/auth";
import { fetchNotificacionesEstructura, markAllNotificacionesRead } from "../services/empresas/notificaciones";
import { useTenant } from "../context/TenantContext";
import { subscribeRealtimeEvents } from "../services/realtime";

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

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const data = await fetchNotificacionesEstructura(20);
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (!canView) return undefined;
    load();
    const unsubscribe = subscribeRealtimeEvents((message) => {
      const type = message?.type;
      if (type === "notificacion_estructural_created") {
        load();
      }
    });
    return () => unsubscribe();
  }, [canView, load, tenantId]);

  const unreadCount = useMemo(() => items.filter((item) => !item.leida).length, [items]);

  if (!canView) return null;

  return (
    <div className="flex items-center text-zinc-300 text-sm">
      <IconButton
        size="small"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          color: "rgba(255, 255, 255, 0.65)",
          p: "6px",
          borderRadius: "8px",
          "&:hover": {
            color: "#ffffff",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          max={99}
          sx={{
            "& .MuiBadge-badge": {
              backgroundColor: "#ef4444",
              color: "#fff",
              fontSize: "0.65rem",
              height: "16px",
              minWidth: "16px",
              fontWeight: 600,
              px: "4px",
            },
          }}
        >
          <MarkChatUnreadOutlinedIcon sx={{ fontSize: "1.2rem" }} />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backgroundColor: "#11141c",
              boxShadow: "0 16px 36px -4px rgba(0, 0, 0, 0.6)",
              overflow: "hidden",
            },
          },
        }}
      >
        <div className="w-[320px] max-w-[90vw] text-zinc-100">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.06]">
            <span className="text-xs font-semibold text-zinc-200">Notificaciones</span>
            <Button
              size="small"
              disabled={marking || unreadCount === 0}
              sx={{ fontSize: "0.72rem", py: "2px", px: "8px", minWidth: 0 }}
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

          <div className="max-h-[320px] overflow-y-auto delicate-scrollbar">
            {loading ? <div className="px-3.5 py-3 text-xs text-zinc-400">Cargando...</div> : null}
            {!loading && items.length === 0 ? (
              <div className="px-3.5 py-4 text-xs text-zinc-400 text-center">Sin notificaciones nuevas.</div>
            ) : null}
            {items.map((item) => (
              <div key={item.id} className="px-3.5 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${item.leida ? "bg-zinc-600" : "bg-rose-500"}`} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">{item.tipo}</span>
                </div>
                <div className="text-[13px] leading-snug text-zinc-200 mt-1">{item.mensaje}</div>
                <div className="text-[11px] text-zinc-500 font-mono mt-1">{formatDateTime(item.creado_en)}</div>
              </div>
            ))}
          </div>
        </div>
      </Popover>
    </div>
  );
}
