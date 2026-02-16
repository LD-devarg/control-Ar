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
        className={[
          "relative flex h-9 w-full items-center overflow-hidden rounded-[10px] text-left transition-all duration-200",
          expanded ? "justify-start px-2.5" : "justify-center px-0",
          active
            ? "bg-neutral-900 shadow-[inset_-2px_0_0_rgba(45,124,255,0.9),inset_-20px_0_24px_rgba(45,124,255,0.25)]"
            : "hover:bg-neutral-900 hover:shadow-[inset_-2px_0_0_rgba(45,124,255,0.9),inset_-20px_0_24px_rgba(45,124,255,0.25)]",
        ].join(" ")}
      >
        <Icon
          sx={{ fontSize: 20 }}
          className={active ? "shrink-0 text-white" : "shrink-0 text-slate-500 dark:text-slate-400"}
        />
        <span
          className={[
            "ml-2 whitespace-nowrap font-['Roboto'] text-[15px] font-medium leading-none transition-all duration-200",
            active ? "text-white" : "text-slate-500 dark:text-slate-400",
            expanded ? "max-w-[165px] opacity-100" : "max-w-0 opacity-0",
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
        "flex h-dvh min-h-svh shrink-0 flex-col overflow-hidden border-r border-zinc-700/70 bg-neutral-200 px-2 py-2 text-white transition-[width] duration-200 dark:bg-neutral-900",
        expanded ? "w-[188px]" : "w-20",
      ].join(" ")}
    >
      <div className={["flex items-center border-b border-zinc-600/70 pb-1.5", expanded ? "justify-start" : "justify-center"].join(" ")}>
        <img
          src={logoSrc}
          className={["h-9 w-9 shrink-0 transition-all duration-200", expanded ? "mr-2" : "mr-0"].join(" ")}
          alt="Control-AR Logo"
        />
        <span
          className={[
            "inline-flex items-start overflow-hidden whitespace-nowrap font-['Inter'] transition-all duration-200",
            expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0",
          ].join(" ")}
        >
          <span className="text-base font-bold leading-none tracking-[0.5px]">CONTROL</span>
          <span className="ml-0.5 self-start text-xs font-light leading-none">AR</span>
        </span>
      </div>

      <div className="mt-1 flex h-full min-h-0 flex-col">
        <div className="flex-1 min-h-0 space-y-1.5 overflow-y-auto pr-1">
          {sections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <h3
                className={[
                  "h-4 overflow-hidden whitespace-nowrap font-['Roboto'] text-xs font-normal text-zinc-500 transition-all duration-200",
                  expanded ? "max-w-[165px] opacity-100" : "max-w-0 opacity-0",
                ].join(" ")}
              >
                {section.title}
              </h3>
              <div className="space-y-0.5">{section.items.map((item) => renderNavButton(item))}</div>
            </div>
          ))}
        </div>

        <div className="mt-1 border-t border-zinc-600/70 pt-1.5">
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/");
            }}
            className={[
              "relative flex h-9 w-full items-center overflow-hidden rounded-[10px] transition-all duration-200",
              expanded ? "justify-start px-2.5" : "justify-center px-0",
              "hover:bg-neutral-900 hover:shadow-[inset_-2px_0_0_rgba(45,124,255,0.9),inset_-20px_0_24px_rgba(45,124,255,0.25)]",
            ].join(" ")}
          >
            <LogoutOutlinedIcon sx={{ fontSize: 20 }} className="shrink-0 text-slate-500 dark:text-slate-400" />
            <span
              className={[
                "ml-2 whitespace-nowrap font-['Roboto'] text-[15px] font-medium leading-none text-slate-500 dark:text-slate-400 transition-all duration-200",
                expanded ? "max-w-[165px] opacity-100" : "max-w-0 opacity-0",
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
