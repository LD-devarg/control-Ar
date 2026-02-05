import Sidebar from "../components/Sidebar";
import User from "../components/User";
import NuevosLeads from "../components/NuevosLeads.jsx";
import NuevoLeadAlert from "../components/NuevoLeadAlert.jsx";
import { Outlet, useLocation } from "react-router-dom";
import React from "react";


function TabletLayout() {
  const location = useLocation();
  const showNuevosLeads = location.pathname === "/home";

  return (
    <div className="flex w-full h-full h-dvh bg-neutral-100 dark:bg-zinc-800 min-h-svh overflow-hidden">
        <Sidebar />
        <div className="flex grow flex-col min-w-0">
            <header className="flex justify-end items-center px-4 pb-1 pt-5">
                <NuevoLeadAlert />
                <User />
            </header>
            <main className="flex grow overflow-hidden flex-row p-5 min-w-0">
                <div className="flex-[3] min-w-0">
                    <Outlet />
                </div>
                <div>
                </div>
                {showNuevosLeads && (
                  <div className="flex-[1] min-w-0 ml-4">
                    <NuevosLeads />
                  </div>
                )}
            </main>
        </div>
    </div>
  );
}

export default TabletLayout;
