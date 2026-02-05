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
import ButtonSidebar from "./ButtonSidebar";

function Sidebar() {
  const navigate = useNavigate();
  const theme = useTheme();
  const logoSrc = theme.palette.mode === "dark" ? logoLight : logoDark;

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
          <div className="sidebar-gestion">
            <h3 className="title">GESTIÓN</h3>
            <Stack direction="column" spacing={0.5}>
              <ButtonSidebar
                className="flex items-center justify-start"
                onClick={() => navigate("/home")}
                startIcon={<OtherHousesOutlinedIcon />}
                label="Inicio"
              />
              <ButtonSidebar
                onClick={() => navigate("/stats")}
                startIcon={<QueryStatsOutlinedIcon />}
                label="Análisis"
              />
              <ButtonSidebar
                onClick={() => navigate("/contacts")}
                startIcon={<ContactPageOutlinedIcon />}
                label="Agenda"
              />
            </Stack>
          </div>

          <div className="sidebar-recursos">
            <h3 className="title">RECURSOS</h3>
            <Stack>
              <ButtonSidebar
                onClick={() => navigate("/whatsapp")}
                startIcon={<WhatsAppIcon />}
                label="Líneas"
              />
              <ButtonSidebar
                onClick={() => navigate("/tipo-cambio")}
                startIcon={<CurrencyExchangeIcon />}
                label="Tipo de Cambio"
              />
              <ButtonSidebar
                onClick={() => navigate("/landing-config")}
                startIcon={<WebIcon />}
                label="Landing"
              />
            </Stack>
          </div>

          <div className="sidebar-pauta">
            <h3 className="title">PAUTA</h3>
            <Stack>
              <ButtonSidebar startIcon={<CampaignOutlinedIcon />} label="Database" />
              <ButtonSidebar startIcon={<AdsClickOutlinedIcon />} label="Rendimientos" />
            </Stack>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <Stack direction="column" spacing={2}>
          <ButtonSidebar
            onClick={() => navigate("/")}
            startIcon={<LogoutOutlinedIcon />}
            label="Cerrar Sesion"
          />
        </Stack>
      </div>
    </div>
  );
}

export default Sidebar;
