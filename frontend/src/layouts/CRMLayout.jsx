import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import ChatIcon from "@mui/icons-material/Chat";
import PeopleIcon from "@mui/icons-material/People";
import AndroidIcon from "@mui/icons-material/Android";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import RefreshIcon from "@mui/icons-material/Refresh";

import { useTenant } from "../context/TenantContext.jsx";
import { getCurrentUser } from "../services/auth.js";
import { resolveUserRole } from "../services/access.js";

const CONFIG_ROLES = new Set(["superuser", "admin", "admin_organizacional"]);

export default function CRMLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const userRole = resolveUserRole(currentUser);
  const canManageConfig = CONFIG_ROLES.has(userRole);

  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getInitials = () => {
    if (!currentUser) return "U";
    const first = currentUser.first_name ? currentUser.first_name[0] : "";
    const last = currentUser.last_name ? currentUser.last_name[0] : "";
    if (first || last) return `${first}${last}`.toUpperCase();
    return currentUser.username ? currentUser.username.substring(0, 2).toUpperCase() : "U";
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleToggleConfig = () => {
    window.dispatchEvent(new CustomEvent("crm:toggle-config"));
  };

  const handleRefreshChats = () => {
    window.dispatchEvent(new CustomEvent("crm:refresh-chats"));
  };

  return (
    <div className="dark flex h-screen w-screen bg-[#090a0c] text-white overflow-hidden font-sans" id="waba-crm-root">
      {/* 1. Far-Left Navigation Icon Bar (Hidden on Mobile) */}
      {!isMobile && (
        <aside className="w-16 shrink-0 bg-[#090a0c] border-r border-[#1f2128] flex flex-col items-center py-4 justify-between" id="waba-aside-nav">
          <div className="flex flex-col items-center gap-6 w-full">
            {/* Hexagonal brand logo with CA */}
            <div className="p-0.5 cursor-pointer" title="Control-Ar Messenger" onClick={() => navigate("/crm")}>
              <svg className="h-9 w-9 text-[#a3e635] hover:scale-105 transition-transform" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
                <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" />
                <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="currentColor" fontSize="24" fontWeight="bold">CA</text>
              </svg>
            </div>

            {/* Navigation Icons list */}
            <div className="flex flex-col gap-3 w-full items-center">
              <button 
                type="button" 
                onClick={() => navigate("/crm")}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  isActive("/crm") 
                    ? "bg-zinc-800/60 text-[#a3e635]" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
                }`} 
                title="Chats"
              >
                <ChatIcon fontSize="small" />
              </button>
              <button 
                type="button" 
                onClick={() => navigate("/crm/contactos")}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  isActive("/crm/contactos") 
                    ? "bg-zinc-800/60 text-[#a3e635]" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
                }`} 
                title="Contactos"
              >
                <PeopleIcon fontSize="small" />
              </button>
              <button 
                type="button" 
                onClick={() => navigate("/crm/bots")}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  isActive("/crm/bots") 
                    ? "bg-zinc-800/60 text-[#a3e635]" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
                }`} 
                title="Bots"
              >
                <AndroidIcon fontSize="small" />
              </button>
              <button 
                type="button" 
                onClick={() => navigate("/crm/stats")}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  isActive("/crm/stats") 
                    ? "bg-zinc-800/60 text-[#a3e635]" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
                }`} 
                title="Estadísticas"
              >
                <BarChartIcon fontSize="small" />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            {/* Toggle Config (only shown on active Chats view) */}
            {canManageConfig && isActive("/crm") && (
              <IconButton
                color="inherit"
                onClick={handleToggleConfig}
                size="small"
                id="btn-settings-aside"
                sx={{ 
                  color: "rgba(255,255,255,0.4)",
                  "&:hover": { color: "white", backgroundColor: "rgba(255,255,255,0.05)" }
                }}
                title="Configuración de Credenciales WABA"
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            )}

            {/* Refresh (only shown on active Chats view) */}
            {isActive("/crm") && (
              <IconButton
                color="inherit"
                onClick={handleRefreshChats}
                size="small"
                sx={{ 
                  color: "rgba(255,255,255,0.4)",
                  "&:hover": { color: "white", backgroundColor: "rgba(255,255,255,0.05)" }
                }}
                title="Actualizar chats"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            )}

            {/* User Initials Circle */}
            <div 
              onClick={() => navigate("/home")}
              className="h-8 w-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white cursor-pointer hover:ring-2 hover:ring-[#a3e635] transition" 
              title="Volver a Control-Ar Dashboard"
            >
              {getInitials()}
            </div>
          </div>
        </aside>
      )}

      {/* Main Container Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" id="waba-main-viewport">
        <Outlet />
      </div>
    </div>
  );
}
