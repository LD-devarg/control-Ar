import React from "react";
import { useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";
import logoLight from "/controlar_blanco_sin_texto.png";
import logoDark from "/controlar_azul_sin_texto.png";
import OtherHousesOutlinedIcon from "@mui/icons-material/OtherHousesOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import WebIcon from "@mui/icons-material/Web";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import AdsClickOutlinedIcon from "@mui/icons-material/AdsClickOutlined";
import ContactPageOutlinedIcon from "@mui/icons-material/ContactPageOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import { getCurrentUser, logout } from "../services/auth";
import { canAccessPath } from "../services/access";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const logoSrc = theme.palette.mode === "dark" ? logoLight : logoDark;
  const currentUser = getCurrentUser();
  const [expanded, setExpanded] = React.useState(false);

  const sections = [
    {
      title: "GESTION",
      items: [
        { path: "/home", label: "Inicio", Icon: OtherHousesOutlinedIcon },
        { path: "/stats", label: "Analisis", Icon: QueryStatsOutlinedIcon },
        { path: "/contacts", label: "Agenda", Icon: ContactPageOutlinedIcon },
        { path: "/crm", label: "CRM", Icon: WhatsAppIcon },
      ],
    },
    {
      title: "RECURSOS",
      items: [
        { path: "/whatsapp", label: "Lineas", Icon: WhatsAppIcon },
        { path: "/tipo-cambio", label: "Tipo de Cambio", Icon: CurrencyExchangeIcon },
        { path: "/landing-config", label: "Landing", Icon: WebIcon },
      ],
    },
    {
      title: "PAUTA",
      items: [
        { path: "/pauta-database", label: "Database", Icon: CampaignOutlinedIcon },
        { path: "/pauta-kpi", label: "Rendimientos", Icon: AdsClickOutlinedIcon },
        { path: "/meta-events", label: "Eventos Meta", Icon: HubOutlinedIcon },
      ],
    },
    {
      title: "EMPRESA",
      items: [
        { path: "/organizaciones", label: "Organizaciones", Icon: ApartmentOutlinedIcon },
        { path: "/empresas", label: "Empresas", Icon: CampaignOutlinedIcon },
        { path: "/usuarios", label: "Usuarios", Icon: AdsClickOutlinedIcon },
        { path: "/health", label: "Health", Icon: HealthAndSafetyOutlinedIcon },
      ],
    },
  ]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessPath(item.path, currentUser)),
    }))
    .filter((section) => section.items.length > 0);

  const renderNavButton = ({ path, label, Icon }) => {
    const active = location.pathname === path;

    return (
      <button
        key={path}
        type="button"
        onClick={() => navigate(path)}
        title={!expanded ? label : undefined}
        className={[
          "group relative flex h-9 items-center overflow-hidden rounded-lg text-left transition-all duration-150",
          expanded ? "w-full justify-start px-2.5" : "mx-auto w-10 justify-center px-0",
          active
            ? "bg-white/[0.08] text-white shadow-sm border border-white/[0.06] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-blue-500"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]",
        ].join(" ")}
      >
        <Icon
          sx={{ fontSize: 19 }}
          className={active ? "shrink-0 text-blue-400" : "shrink-0 text-zinc-400 group-hover:text-zinc-200 transition-colors"}
        />
        <span
          className={[
            "ml-2.5 whitespace-nowrap text-[13.5px] font-medium leading-none tracking-tight transition-all duration-150",
            active ? "text-white" : "text-zinc-400 group-hover:text-zinc-200",
            expanded ? "max-w-[150px] opacity-100" : "max-w-0 opacity-0 pointer-events-none",
          ].join(" ")}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={[
        "flex h-dvh min-h-svh shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#090b10] px-2 py-3 text-zinc-100 transition-[width] duration-200 z-30",
        expanded ? "w-[192px]" : "w-[64px]",
      ].join(" ")}
    >
      <div className={["flex items-center border-b border-white/[0.06] pb-2.5 mb-1 px-1", expanded ? "justify-start" : "justify-center"].join(" ")}>
        <img
          src={logoSrc}
          className={["h-8 w-8 shrink-0 transition-all duration-200", expanded ? "mr-2.5" : "mr-0"].join(" ")}
          alt="Control-AR Logo"
        />
        <span
          className={[
            "inline-flex items-baseline overflow-hidden whitespace-nowrap transition-all duration-150",
            expanded ? "max-w-[150px] opacity-100" : "max-w-0 opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <span className="text-[14px] font-semibold tracking-tight text-white">Control</span>
          <span className="ml-0.5 text-[11px] font-medium text-blue-400 tracking-wider">AR</span>
        </span>
      </div>

      <div className="mt-1 flex h-full min-h-0 flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar space-y-3 py-1">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <h3
                className={[
                  "h-3.5 overflow-hidden whitespace-nowrap px-2.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase transition-all duration-150",
                  expanded ? "max-w-[150px] opacity-100" : "max-w-0 opacity-0 pointer-events-none",
                ].join(" ")}
              >
                {section.title}
              </h3>
              <div className="space-y-0.5">{section.items.map((item) => renderNavButton(item))}</div>
            </div>
          ))}
        </div>

        <div className="mt-1 border-t border-white/[0.06] pt-2">
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            title={!expanded ? "Cerrar Sesion" : undefined}
            className={[
              "group relative flex h-9 w-full items-center overflow-hidden rounded-lg text-left transition-all duration-150 text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10",
              expanded ? "justify-start px-2.5" : "justify-center px-0",
            ].join(" ")}
          >
            <LogoutOutlinedIcon sx={{ fontSize: 19 }} className="shrink-0 text-zinc-400 group-hover:text-rose-400 transition-colors" />
            <span
              className={[
                "ml-2.5 whitespace-nowrap text-[13px] font-medium leading-none tracking-tight transition-all duration-150",
                expanded ? "max-w-[150px] opacity-100" : "max-w-0 opacity-0 pointer-events-none",
              ].join(" ")}
            >
              Cerrar Sesion
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
