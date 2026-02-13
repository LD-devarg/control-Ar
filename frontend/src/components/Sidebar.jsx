import React from "react";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import logoLight from "/controlar_blanco_sin_texto.png";
import logoDark from "/controlar_azul_sin_texto.png";
import "../assets/css/Sidebar.css";
import Stack from "@mui/material/Stack";
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
import ButtonSidebar from "./ButtonSidebar";
import { getCurrentUser, logout } from "../services/auth";
import { canAccessPath } from "../services/access";

function Sidebar() {
  const navigate = useNavigate();
  const theme = useTheme();
  const logoSrc = theme.palette.mode === "dark" ? logoLight : logoDark;
  const currentUser = getCurrentUser();

  const sections = [
    {
      className: "sidebar-gestion",
      title: "GESTIÓN",
      items: [
        {
          path: "/home",
          label: "Inicio",
          startIcon: <OtherHousesOutlinedIcon />,
          className: "flex items-center justify-start",
        },
        {
          path: "/stats",
          label: "Análisis",
          startIcon: <QueryStatsOutlinedIcon />,
        },
        {
          path: "/contacts",
          label: "Agenda",
          startIcon: <ContactPageOutlinedIcon />,
        },
      ],
    },
    {
      className: "sidebar-recursos",
      title: "RECURSOS",
      items: [
        {
          path: "/whatsapp",
          label: "Líneas",
          startIcon: <WhatsAppIcon />,
        },
        {
          path: "/tipo-cambio",
          label: "Tipo de Cambio",
          startIcon: <CurrencyExchangeIcon />,
        },
        {
          path: "/landing-config",
          label: "Landing",
          startIcon: <WebIcon />,
        },
      ],
    },
    {
      className: "sidebar-pauta",
      title: "PAUTA",
      items: [
        {
          path: "/pauta-database",
          label: "Database",
          startIcon: <CampaignOutlinedIcon />,
        },
        {
          path: "/pauta-kpi",
          label: "Rendimientos",
          startIcon: <AdsClickOutlinedIcon />,
        },
      ],
    },
    {
      className: "sidebar-empresa",
      title: "EMPRESA",
      items: [
        {
          path: "/empresas",
          label: "Empresas",
          startIcon: <CampaignOutlinedIcon />,
        },
        {
          path: "/usuarios",
          label: "Usuarios",
          startIcon: <AdsClickOutlinedIcon />,
        },
        {
          path: "/health",
          label: "Health",
          startIcon: <HealthAndSafetyOutlinedIcon />,
        },
      ],
    },
  ]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessPath(item.path, currentUser)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="sidebar bg-neutral-200 dark:bg-neutral-900">
      <div className="sidebar-logo">
        <img src={logoSrc} className="logo" alt="Control-AR Logo" />
        <span className="brand-text">
          <span className="control">CONTROL</span>
          <span className="ar">AR</span>
        </span>
      </div>

      <div className="sidebar-body flex h-full flex-col justify-between">
        <div>
          {sections.map((section) => (
            <div key={section.title} className={section.className}>
              <h3 className="title">{section.title}</h3>
              <Stack direction="column" spacing={0.5}>
                {section.items.map((item) => (
                  <ButtonSidebar
                    key={item.path}
                    className={item.className || ""}
                    onClick={() => navigate(item.path)}
                    startIcon={item.startIcon}
                    label={item.label}
                  />
                ))}
              </Stack>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <Stack direction="column" spacing={2}>
          <ButtonSidebar
            onClick={() => {
              logout();
              navigate("/");
            }}
            startIcon={<LogoutOutlinedIcon />}
            label="Cerrar Sesion"
          />
        </Stack>
      </div>
    </div>
  );
}

export default Sidebar;
