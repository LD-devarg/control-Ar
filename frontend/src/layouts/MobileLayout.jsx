import React, { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListSubheader from "@mui/material/ListSubheader";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import OtherHousesOutlinedIcon from "@mui/icons-material/OtherHousesOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import ContactPageOutlinedIcon from "@mui/icons-material/ContactPageOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import WebIcon from "@mui/icons-material/Web";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import AdsClickOutlinedIcon from "@mui/icons-material/AdsClickOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import User from "../components/User";
import NuevosLeads from "../components/NuevosLeads.jsx";
import StatsEventsAside from "../components/StatsEventsAside.jsx";
import NuevoLeadAlert from "../components/NuevoLeadAlert.jsx";
import TenantSelector from "../components/TenantSelector.jsx";
import { canAccessPath } from "../services/access";
import { getCurrentUser, logout } from "../services/auth";

function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentUser = getCurrentUser();

  const showNuevosLeads = location.pathname === "/home";
  const showEventos = location.pathname === "/stats";

  const sections = useMemo(() => {
    const allSections = [
      {
        title: "GESTION",
        items: [
          { label: "Inicio", icon: <OtherHousesOutlinedIcon />, path: "/home" },
          { label: "Analisis", icon: <QueryStatsOutlinedIcon />, path: "/stats" },
          { label: "Agenda", icon: <ContactPageOutlinedIcon />, path: "/contacts" },
        ],
      },
      {
        title: "RECURSOS",
        items: [
          { label: "Lineas", icon: <WhatsAppIcon />, path: "/whatsapp" },
          { label: "Tipo de Cambio", icon: <CurrencyExchangeIcon />, path: "/tipo-cambio" },
          { label: "Landing", icon: <WebIcon />, path: "/landing-config" },
        ],
      },
      {
        title: "PAUTA",
        items: [
          { label: "Database", icon: <CampaignOutlinedIcon />, path: "/pauta-database" },
          { label: "Rendimientos", icon: <AdsClickOutlinedIcon />, path: "/pauta-kpi" },
        ],
      },
      {
        title: "EMPRESA",
        items: [
          { label: "Organizaciones", icon: <ApartmentOutlinedIcon />, path: "/organizaciones" },
          { label: "Empresas", icon: <CampaignOutlinedIcon />, path: "/empresas" },
          { label: "Usuarios", icon: <AdsClickOutlinedIcon />, path: "/usuarios" },
          { label: "Health", icon: <HealthAndSafetyOutlinedIcon />, path: "/health" },
        ],
      },
    ];

    return allSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => canAccessPath(item.path, currentUser)),
      }))
      .filter((section) => section.items.length > 0);
  }, [currentUser]);

  const goTo = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-neutral-100 dark:bg-zinc-800">
      <header className="flex items-center justify-between border-b border-black/10 dark:border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <IconButton
            size="small"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            sx={{ color: "inherit" }}
          >
            <MenuIcon />
          </IconButton>
          <span className="text-sm font-bold tracking-wide text-black dark:text-white">CONTROL AR</span>
        </div>
        <div className="flex items-center gap-1">
          <TenantSelector />
          <NuevoLeadAlert />
          <User />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="min-w-0">
          <Outlet />
        </div>
        {showNuevosLeads ? (
          <div className="mt-3 min-w-0">
            <NuevosLeads />
          </div>
        ) : null}
        {showEventos ? (
          <div className="mt-3 min-w-0">
            <StatsEventsAside />
          </div>
        ) : null}
      </main>

      <Drawer anchor="left" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="flex h-full w-72 flex-col bg-neutral-100 dark:bg-zinc-900 text-black dark:text-white">
          <div className="flex items-center justify-between px-3 py-2 border-b border-black/10 dark:border-white/10">
            <span className="text-sm font-bold tracking-wide">Navegacion</span>
            <IconButton
              size="small"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menu"
              sx={{ color: "inherit" }}
            >
              <CloseIcon />
            </IconButton>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sections.map((section) => (
              <List
                key={section.title}
                dense
                subheader={
                  <ListSubheader
                    component="div"
                    sx={{
                      bgcolor: "transparent",
                      color: "inherit",
                      fontWeight: 700,
                      fontSize: 12,
                      lineHeight: "28px",
                    }}
                  >
                    {section.title}
                  </ListSubheader>
                }
              >
                {section.items.map((item) => {
                  const selected = location.pathname === item.path;
                  return (
                    <ListItemButton key={item.path} selected={selected} onClick={() => goTo(item.path)}>
                      <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  );
                })}
              </List>
            ))}
          </div>

          <Divider />
          <List dense>
            <ListItemButton
              onClick={() => {
                logout();
                navigate("/");
                setMenuOpen(false);
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>
                <LogoutOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Cerrar sesion" />
            </ListItemButton>
          </List>
        </div>
      </Drawer>
    </div>
  );
}

export default MobileLayout;
