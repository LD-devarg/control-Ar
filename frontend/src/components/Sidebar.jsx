import React from "react";
import logo from "../assets/img/controlar_blanco_sin_texto.png";
import "../assets/css/Sidebar.css";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import OtherHousesOutlinedIcon from '@mui/icons-material/OtherHousesOutlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';


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
                <ul className="sidebar-menu">
                    <li>
                        <Stack direction="row" spacing={2}>
                            <Button
                            variant="text"
                            className="Button"
                            color="white"
                            startIcon={<OtherHousesOutlinedIcon />}
                            sx={{
                                '& .MuiButton-startIcon .MuiSvgIcon-root': {
                                fontSize: 30,
                                },
                            }}
                            >
                            Inicio
                            </Button>
                        </Stack>
                    </li>
                    <li>
                        <Stack direction="row" spacing={2}>
                            <Button
                            variant="text"
                            className="Button"
                            color="white"
                            startIcon={<QueryStatsOutlinedIcon />}
                            sx={{
                                '& .MuiButton-startIcon .MuiSvgIcon-root': {
                                fontSize: 30,
                                },
                            }}
                            >
                                Estadisticas
                            </Button>
                        </Stack>
                    </li>
                </ul>
            </div>
            <div className="sidebar-footer">
                <Stack direction="row" spacing={2}>
                    <Button
                    variant="text"
                    className="Button"
                    color="white"
                    startIcon={<LogoutOutlinedIcon />}
                    sx={{
                        '& .MuiButton-startIcon .MuiSvgIcon-root': {
                        fontSize: 30,
                        },
                    }}
                    >
                        Cerrar Sesion
                    </Button>
                </Stack>
            </div>
        </div>
    );
}

export default Sidebar; 
