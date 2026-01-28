import Sidebar from "../components/Sidebar";
import User from "../components/User";

import { Outlet } from "react-router-dom";
import React from "react";

import "../assets/css/DesktopLayout.css";

function DesktopLayout() {
  return (
    <div className="desktop-layout-container">
        <Sidebar />
        <div className="content-wrapper">
            <header className="content-header">
                <User />
            </header>
            <main className="content-area">
                <Outlet />
            </main>
        </div>
    </div>
  );
}

export default DesktopLayout;
