import "../assets/css/Home.css";
import { useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PhoneCallbackOutlinedIcon from "@mui/icons-material/PhoneCallbackOutlined";
import FormCompra from "../components/FormCompra.jsx";
import FormContacto from "../components/FormContacto.jsx";
import NuevosLeads from "../components/NuevosLeads.jsx";

function Home() {
  const [activeForm, setActiveForm] = useState("compra");

  return (
    <div className="home-layout">
      <section className="home-container">
        <h1>Inicio</h1>
        <div className="button-container">
          <Stack spacing={2} direction="row">
            <Button
              variant="outlined"
              startIcon={<ShoppingCartOutlinedIcon />}
              onClick={() => setActiveForm("compra")}
            >
              Nueva Compra
            </Button>
            <Button
              variant="outlined"
              startIcon={<PhoneCallbackOutlinedIcon />}
              onClick={() => setActiveForm("contacto")}
            >
              Nuevo Contacto
            </Button>
          </Stack>
        </div>
        <div className="form-container">
          {activeForm === "compra" && <FormCompra />}
          {activeForm === "contacto" && <FormContacto />}
        </div>
      </section>
    </div>
  );
}

export default Home;
