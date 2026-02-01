import Sidebar from "../components/Sidebar";
import User from "../components/User";
import NuevosLeads from "../components/NuevosLeads.jsx";
import NuevoLeadAlert from "../components/NuevoLeadAlert.jsx";
import { Outlet, useLocation } from "react-router-dom";
import React from "react";

import "../assets/css/DesktopLayout.css";

function DesktopLayout() {
  const location = useLocation();
  const showNuevosLeads = location.pathname === "/home";

  return (
    <div className="desktop-layout-container">
        <Sidebar />
        <div className="content-wrapper">
            <header className="content-header">
                <NuevoLeadAlert />
                <User />
            </header>
            <main className="content-area">
                <div className="main-content">
                    <Outlet />
                </div>
                {showNuevosLeads && (
                  <div className="main-aside">
                    <NuevosLeads />
                  </div>
                )}
            </main>
        </div>
    </div>
  );
}

export default DesktopLayout;
