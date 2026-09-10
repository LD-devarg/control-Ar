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
    <div className="flex h-screen w-full bg-[#090a0f] overflow-hidden text-zinc-100">
        <Sidebar />
        <div className="flex grow flex-col min-w-0">
            <header className="flex h-13 shrink-0 justify-end items-center gap-2.5 px-6 border-b border-white/[0.06] bg-[#090a0f]/80 backdrop-blur-sm z-20">
                <TenantSelector />
                <NuevoLeadAlert />
                <User />
            </header>
            <main className="flex grow overflow-hidden flex-row p-4 min-w-0 gap-4">
                <div className={`${showNuevosLeads || showEventos ? "flex-[2.7]" : "flex-[3]"} min-w-0 h-full min-h-0`}>
                    <Outlet />
                </div>
                {showNuevosLeads && (
                  <div className="flex-[1.1] min-w-0 h-full min-h-0">
                    <NuevosLeads />
                  </div>
                )}
                {showEventos && (
                  <div className="flex-[1.1] min-w-0 h-full min-h-0">
                    <StatsEventsAside fullHeight />
                  </div>
                )}
            </main>
        </div>
    </div>
  );
}

export default DesktopLayout;
