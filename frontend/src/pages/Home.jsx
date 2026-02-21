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
        <div className="flex justify-center mt-5 w-full">
          <Stack spacing={2} direction="row">
            <Button
              variant="outlined"
              startIcon={<ShoppingCartOutlinedIcon />}
              onClick={() => setActiveForm("compra")}
              sx={{
                color: activeForm === "compra" ? theme.palette.primary.main : undefined,
                borderColor: activeForm === "compra" ? theme.palette.primary.main : undefined,
              }}
            >
              Nueva Compra
            </Button>
            <Button
              variant="outlined"
              startIcon={<PhoneCallbackOutlinedIcon />}
              onClick={() => setActiveForm("contacto")}
              sx={{
                color: activeForm === "contacto" ? theme.palette.primary.main : undefined,
                borderColor: activeForm === "contacto" ? theme.palette.primary.main : undefined,
              }}
            >
              Nuevo Contacto
            </Button>
            {showRetiros ? (
              <Button
                variant="outlined"
                startIcon={<CurrencyExchangeOutlinedIcon />}
                onClick={() => setActiveForm("retiro")}
                sx={{
                  color: activeForm === "retiro" ? theme.palette.primary.main : undefined,
                  borderColor: activeForm === "retiro" ? theme.palette.primary.main : undefined,
                }}
              >
                Nuevo Retiro
              </Button>
            ) : null}
          </Stack>
        </div>
        <div className="mt-8 w-full flex justify-center">
          {activeForm === "compra" && <FormCompra />}
          {activeForm === "contacto" && <FormContacto />}
          {showRetiros && activeForm === "retiro" && <FormRetiro />}
        </div>
      </Page>
  );
}

export default Home;
