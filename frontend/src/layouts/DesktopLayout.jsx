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
  const showEventos = location.pathname === "/stats";

  return (
    <div className="flex h-screen w-full bg-neutral-100 dark:bg-zinc-800 overflow-hidden">
        <Sidebar />
        <div className="flex grow flex-col min-w-0">
            <header className="flex justify-end items-center gap-3 px-4 pb-1 pt-5">
                <TenantSelector />
                <NuevoLeadAlert />
                <User />
            </header>
            <main className="flex grow overflow-hidden flex-row p-5 min-w-0">
                <div className="flex-[3] min-w-0">
                    <Outlet />
                </div>
                {showNuevosLeads && (
                  <div className="flex-[1] min-w-0 ml-4">
                    <NuevosLeads />
                  </div>
                )}
                {showEventos && (
                  <div className="flex-[1] min-w-0 ml-4 h-full">
                    <StatsEventsAside fullHeight />
                  </div>
                )}
            </main>
        </div>
    </div>
  );
}

export default DesktopLayout;
