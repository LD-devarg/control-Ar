import React from "react";
import logo from "../assets/img/controlar_blanco_sin_texto.png";
import "../assets/css/Sidebar.css";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import OtherHousesOutlinedIcon from '@mui/icons-material/OtherHousesOutlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import WebIcon from '@mui/icons-material/Web';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import AdsClickOutlinedIcon from '@mui/icons-material/AdsClickOutlined';
import ContactPageOutlinedIcon from '@mui/icons-material/ContactPageOutlined';

function Sidebar() {
    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <img src={logo} className="logo" alt="Control-AR Logo" />
                <span className="brand-text">
                    <span className="control">CONTROL</span>
                    <span className="ar">AR</span>
                </span>
            </div>
            <div className="sidebar-body">
                <div>
                    <div className="sidebar-gestion">
                        <h3 className="title">
                            GESTIÓN
                        </h3>
                        <Stack direction="column" spacing={0.5}>
                            <Button
                                variant="text"
                                className="Button"
                                startIcon={<OtherHousesOutlinedIcon />}
                                sx={{
                                    '& .MuiButton-startIcon .MuiSvgIcon-root': {
                                        fontSize: 20,
                                        color:"gray"
                                    },
                                }}
                                >
                                <span className="button-text">Inicio</span>
                            </Button>
                            <Button
                                variant="text"
                                className="Button"
                                startIcon={<QueryStatsOutlinedIcon />}
                                sx={{
                                    '& .MuiButton-startIcon .MuiSvgIcon-root': {
                                        fontSize: 20,
                                        color:"gray"
                                    },
                                }}
                                >
                                <span className="button-text">Análisis</span>
                            </Button>
                            <Button
                                variant="text"
                                className="Button"
                                startIcon={<ContactPageOutlinedIcon />}
                                sx={{
                                    '& .MuiButton-startIcon .MuiSvgIcon-root': {
                                        fontSize: 20,
                                        color:"gray"
                                    },
                                }}
                                >
                                <span className="button-text">Agenda</span>
                            </Button>
                        </Stack>
                    </div>
                    <div className="sidebar-recursos">
                        <h3 className="title">
                            RECURSOS
                        </h3>
                        <Stack>    
                            <Button
                                variant="text"
                                className="Button"
                                startIcon={<WhatsAppIcon />}
                                sx={{
                                    '& .MuiButton-startIcon .MuiSvgIcon-root': {
                                        fontSize: 20,
                                        color:"gray"
                                    },
                                }}
                                >
                                <span className="button-text">Líneas</span>
                            </Button>
                            <Button
                                variant="text"
                                className="Button"
                                startIcon={<CurrencyExchangeIcon />}
                                sx={{
                                    '& .MuiButton-startIcon .MuiSvgIcon-root': {
                                    fontSize: 20,
                                    color: "gray"
                                    },
                                }}
                                >
                                <span className="button-text">Tipo de Cambio</span>
                            </Button>
                            <Button
                                variant="text"
                                className="Button"
                                startIcon={<WebIcon />}
                                sx={{
                                    '& .MuiButton-startIcon .MuiSvgIcon-root': {
                                    fontSize: 20,
                                    color: "gray"
                                    },
                                }}
                                >
                                <span className="button-text">Landing</span>
                            </Button>
                        </Stack>
                    </div>
                    <div className="sidebar-pauta">
                        <h3 className="title">
                            PAUTA
                        </h3>
                        <Stack>
                            <Button
                                variant="text"
                                className="Button"
                                startIcon={<CampaignOutlinedIcon />}
                                color=""
                                sx={{
                                    '& .MuiButton-startIcon .MuiSvgIcon-root': {
                                        fontSize: 20,
                                        color: "gray"
                                    },
                                }}
                                >
                                <span className="button-text">Database</span>
                            </Button>
                            <Button
                                variant="text"
                                className="Button"
                                startIcon={<AdsClickOutlinedIcon />}
                                color=""
                                sx={{
                                    '& .MuiButton-startIcon .MuiSvgIcon-root': {
                                        fontSize: 20,
                                        color:"gray"
                                    },
                                }}
                                >
                                <span className="button-text">Rendimientos</span>
                            </Button>
                        </Stack>
                    </div>
                </div>
            </div>
            <div className="sidebar-footer">
                <Stack direction="column" spacing={2}>
                    <Button
                    variant="text"
                    className="Button"
                    color="white"
                    startIcon={<LogoutOutlinedIcon />}
                    sx={{
                        '& .MuiButton-startIcon .MuiSvgIcon-root': {
                        fontSize: 20,
                        },
                    }}
                    >
                        <span className="button-text">Cerrar Sesion</span>
                    </Button>
                </Stack>
            </div>
        </div>
    );
}

export default Sidebar; 
