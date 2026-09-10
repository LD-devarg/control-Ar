import { useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PhoneCallbackOutlinedIcon from "@mui/icons-material/PhoneCallbackOutlined";
import CurrencyExchangeOutlinedIcon from "@mui/icons-material/CurrencyExchangeOutlined";
import FormCompra from "../components/FormCompra.jsx";
import FormContacto from "../components/FormContacto.jsx";
import FormRetiro from "../components/FormRetiro.jsx";
import Page from "../layouts/Page.jsx";
import { useTenant } from "../context/TenantContext";


function Home() {
  const [activeForm, setActiveForm] = useState("contacto");
  const theme = useTheme();
  const { features } = useTenant();
  const showRetiros = Boolean(features?.retiros);

  useEffect(() => {
    if (!showRetiros && activeForm === "retiro") {
      setActiveForm("contacto");
    }
  }, [showRetiros, activeForm]);

  return (
    <Page title="Inicio">
        <div className="flex justify-center mt-2 w-full">
          <div className="inline-flex p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-sm gap-1">
            <button
              type="button"
              onClick={() => setActiveForm("compra")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeForm === "compra"
                  ? "bg-white/[0.08] text-white shadow-sm border border-white/[0.08]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
              }`}
            >
              <ShoppingCartOutlinedIcon sx={{ fontSize: 16 }} className={activeForm === "compra" ? "text-blue-400" : "text-zinc-400"} />
              <span>Nueva Compra</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveForm("contacto")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeForm === "contacto"
                  ? "bg-white/[0.08] text-white shadow-sm border border-white/[0.08]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
              }`}
            >
              <PhoneCallbackOutlinedIcon sx={{ fontSize: 16 }} className={activeForm === "contacto" ? "text-blue-400" : "text-zinc-400"} />
              <span>Nuevo Contacto</span>
            </button>
            {showRetiros ? (
              <button
                type="button"
                onClick={() => setActiveForm("retiro")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeForm === "retiro"
                    ? "bg-white/[0.08] text-white shadow-sm border border-white/[0.08]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                }`}
              >
                <CurrencyExchangeOutlinedIcon sx={{ fontSize: 16 }} className={activeForm === "retiro" ? "text-blue-400" : "text-zinc-400"} />
                <span>Nuevo Retiro</span>
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-6 w-full flex justify-center">
          <div className="mx-auto w-full max-w-[420px] max-h-[calc(100vh-210px)] overflow-y-auto no-scrollbar px-1 flex justify-center">
            {activeForm === "compra" && <FormCompra />}
            {activeForm === "contacto" && <FormContacto />}
            {showRetiros && activeForm === "retiro" && <FormRetiro />}
          </div>
        </div>
      </Page>
  );
}

export default Home;
