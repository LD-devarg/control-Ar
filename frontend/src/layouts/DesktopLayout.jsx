import Sidebar from "../components/Sidebar";
import User from "../components/User";
import NuevosLeads from "../components/NuevosLeads.jsx";
import NuevoLeadAlert from "../components/NuevoLeadAlert.jsx";
import TenantSelector from "../components/TenantSelector.jsx";
import StatsEventsAside from "../components/StatsEventsAside.jsx";
import { Outlet, useLocation } from "react-router-dom";
import React from "react";

function DesktopLayout() {
  const location = useLocation();
  const showNuevosLeads = location.pathname === "/home";
  const showEventos = false;

  return (
    <div className="flex h-screen w-full bg-[#090a0c] overflow-hidden">
        <Sidebar />
        <div className="flex grow flex-col min-w-0">
            <header className="flex justify-end items-center gap-3 px-10 pt-5">
                <TenantSelector />
                <NuevoLeadAlert />
                <User />
            </header>
            <main className="flex grow overflow-hidden flex-row p-5 min-w-0">
                <div className={`${showNuevosLeads || showEventos ? "flex-[2.65]" : "flex-[3]"} min-w-0 h-full min-h-0`}>
                    <Outlet />
                </div>
                {showNuevosLeads && (
                  <div className="flex-[1.18] min-w-0 ml-4">
                    <NuevosLeads />
                  </div>
                )}
                {showEventos && (
                  <div className="flex-[1.18] min-w-0 ml-4 h-full">
                    <StatsEventsAside fullHeight />
                  </div>
                )}
            </main>
        </div>
    </div>
  );
}

export default DesktopLayout;
