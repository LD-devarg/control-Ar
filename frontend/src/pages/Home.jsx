import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PhoneCallbackOutlinedIcon from "@mui/icons-material/PhoneCallbackOutlined";
import FormCompra from "../components/FormCompra.jsx";
import FormContacto from "../components/FormContacto.jsx";
import Page from "../layouts/Page.jsx";


function Home() {
  const [activeForm, setActiveForm] = useState("contacto");
  const theme = useTheme();

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
          </Stack>
        </div>
        <div className="mt-8 w-full flex justify-center">
          {activeForm === "compra" && <FormCompra />}
          {activeForm === "contacto" && <FormContacto />}
        </div>
      </Page>
  );
}

export default Home;
