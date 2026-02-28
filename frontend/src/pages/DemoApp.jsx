import { useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Page from "../layouts/Page.jsx";
import Card from "../components/Card.jsx";
import CardWhatsapp from "../components/CardWhatsapp.jsx";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PhoneCallbackOutlinedIcon from "@mui/icons-material/PhoneCallbackOutlined";
import OtherHousesOutlinedIcon from "@mui/icons-material/OtherHousesOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import WebIcon from "@mui/icons-material/Web";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import PreviewOutlinedIcon from "@mui/icons-material/PreviewOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import Autocomplete from "@mui/material/Autocomplete";

const DEMO_USER_KEY = "controlar_demo_user";

function generateRandomDemoContact() {
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, "0");
  return `11${suffix}`;
}

function buildInitialLeads() {
  const names = [
    "sofia123",
    "mateo345",
    "valentina678",
    "juan901",
    "camila234",
    "lucas567",
    "martina890",
    "nicolas123",
    "agustina456",
    "franco789",
    "lucia012",
    "tomas345",
    "julieta678",
    "benjamin901",
    "renata234",
  ];

  return names.map((name, index) => ({
    id: index + 1,
    name,
    phone: `11${String(41230000 + index * 139).slice(0, 8)}`,
    source: index % 2 === 0 ? "Meta Ads" : "Google Ads",
    status: index % 3 === 0 ? "Contactado" : "Nuevo",
  }));
}

function buildWhatsappLines() {
  return [
    { id: 1, number: "11 5000 1001", active: true },
    { id: 2, number: "11 5000 1002", active: true },
    { id: 3, number: "11 5000 1003", active: true },
  ];
}

function DemoLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex flex-col justify-start items-center min-h-screen h-full bg-white dark:bg-black">
      <img src="/controlar_fondo_negro.png" className="text-center mb-5 h-50 w-50" alt="Logo Control-AR" />
      <div className="form-login flex flex-col justify-center items-center bg-neutral-100 dark:bg-zinc-900 p-6 rounded-2xl shadow-lg w-80">
        <form
          className="w-full flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!username.trim() || !password.trim()) return;
            onLogin(username);
          }}
        >
          <TextField
            required
            label="Ingrese su usuario"
            variant="standard"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <TextField
            required
            label="Ingrese su contrasena"
            variant="standard"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" variant="outlined" disabled={!username.trim() || !password.trim()}>
            Iniciar sesion demo
          </Button>
        </form>
      </div>
    </div>
  );
}

function DemoSidebar({ onNavigate, onLogout }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const logoSrc = "/controlar_azul_sin_texto.png";

  const sections = [
    {
      title: "GESTION",
      items: [
        { path: "/demo/home", label: "Inicio", Icon: OtherHousesOutlinedIcon },
        { path: "/demo/stats", label: "Analisis", Icon: QueryStatsOutlinedIcon },
      ],
    },
    {
      title: "RECURSOS",
      items: [
        { path: "/demo/whatsapp", label: "Lineas", Icon: WhatsAppIcon },
        { path: "/demo/landing", label: "Landing", Icon: WebIcon },
      ],
    },
  ];

  const renderNavButton = ({ path, label, Icon }) => {
    const active = location.pathname === path;
    return (
      <button
        key={path}
        type="button"
        onClick={() => onNavigate(path)}
        className={[
          "group relative flex h-9 items-center overflow-hidden rounded-[10px] text-left transition-all duration-200",
          expanded ? "w-full justify-start px-2.5" : "mx-auto w-11 justify-center px-0",
          active
            ? "bg-neutral-900 shadow-[inset_-2px_0_0_rgba(45,124,255,0.9),inset_-20px_0_24px_rgba(45,124,255,0.25)]"
            : "hover:bg-neutral-900 hover:shadow-[inset_-2px_0_0_rgba(45,124,255,0.9),inset_-20px_0_24px_rgba(45,124,255,0.25)]",
        ].join(" ")}
      >
        <Icon
          sx={{ fontSize: 20 }}
          className={active ? "shrink-0 text-white" : "shrink-0 text-black dark:text-slate-400 group-hover:text-white"}
        />
        <span
          className={[
            "ml-2 whitespace-nowrap font-['Roboto'] text-[15px] font-medium leading-none transition-all duration-200",
            active ? "text-white" : "text-black dark:text-slate-400 group-hover:text-white",
            expanded ? "max-w-[165px] opacity-100" : "max-w-0 opacity-0",
          ].join(" ")}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={[
        "flex h-dvh min-h-svh shrink-0 flex-col overflow-hidden border-r border-zinc-700/70 bg-neutral-100 px-2 py-2 text-white transition-[width] duration-200 dark:bg-neutral-900",
        expanded ? "w-[188px]" : "w-20",
      ].join(" ")}
    >
      <div className={["flex items-center border-b border-zinc-600/70 pb-1.5", expanded ? "justify-start" : "justify-center"].join(" ")}>
        <img src={logoSrc} className={["h-9 w-9 shrink-0 transition-all duration-200", expanded ? "mr-2" : "mr-0"].join(" ")} alt="Control-AR Logo" />
        <span
          className={[
            "inline-flex items-start overflow-hidden whitespace-nowrap font-['Inter'] transition-all duration-200",
            expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0",
          ].join(" ")}
        >
          <span className="text-base font-bold leading-none font-['Roboto'] tracking-[0.5px]">CONTROL</span>
          <span className="ml-0.5 self-start text-xs font-light leading-none font-['Roboto']">AR</span>
        </span>
      </div>

      <div className="mt-1 flex h-full min-h-0 flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pl-2 pr-1">
          {sections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <h3
                className={[
                  "h-4 overflow-hidden whitespace-nowrap font-['Roboto'] text-xs font-normal text-black/80 dark:text-zinc-500 transition-all duration-200",
                  expanded ? "max-w-[165px] opacity-100" : "max-w-[165px] opacity-0 pointer-events-none",
                ].join(" ")}
              >
                {section.title}
              </h3>
              <div className="space-y-0.5">{section.items.map((item) => renderNavButton(item))}</div>
            </div>
          ))}
        </div>

        <div className="mt-1 border-t border-zinc-600/70 pt-1.5">
          <button
            type="button"
            onClick={onLogout}
            className={[
              "group relative flex h-9 w-full items-center font-['Roboto'] overflow-hidden rounded-[10px] transition-all duration-200",
              expanded ? "justify-start px-2.5" : "justify-center px-0",
              "hover:bg-neutral-900 hover:shadow-[inset_-2px_0_0_rgba(45,124,255,0.9),inset_-20px_0_24px_rgba(45,124,255,0.25)]",
            ].join(" ")}
          >
            <LogoutOutlinedIcon sx={{ fontSize: 20 }} className="shrink-0 text-black dark:text-slate-400 group-hover:text-white" />
            <span
              className={[
                "ml-2 whitespace-nowrap font-['Roboto'] text-[15px] font-medium leading-none text-black dark:text-slate-400 group-hover:text-white transition-all duration-200",
                expanded ? "max-w-[165px] opacity-100" : "max-w-0 opacity-0",
              ].join(" ")}
            >
              Cerrar Sesion
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function DemoNuevosLeads({ leads }) {
  return (
    <aside className="w-full rounded-2xl shadow-xl shadow-black bg-white dark:bg-neutral-900 p-4 text-white h-full flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base text-black dark:text-white font-semibold">Nuevos Leads</h3>
        <span className="text-xs text-black/80 dark:text-white/60">Demo</span>
      </div>
      <div className="recent-compras-scroll space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
        {leads.slice(0, 8).map((lead) => (
          <div
            key={lead.id}
            className="w-full rounded-[18px] border border-white/10 bg-gradient-to-r from-black to-black/80 px-4 py-2"
          >
            <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-white/65">
              <div className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-none bg-sky-500/10 text-sky-300 border-sky-400/60">
                <PendingActionsOutlinedIcon sx={{ fontSize: 14 }} />
                <span>Lead</span>
              </div>
              <span>{lead.source}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm xl:text-lg font-semibold text-white">{lead.name}</span>
              <span className="shrink-0 text-base font-semibold text-cyan-300">{lead.phone}</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function DemoStatsAside() {
  const events = [
    { id: 1, type: "lead", username: "SofiaR", detail: "Lead nuevo" },
    { id: 2, type: "contacto", username: "MateoP", detail: "Contacto guardado" },
    { id: 3, type: "compra", username: "CamilaR", detail: "Compra de US$ 95" },
  ];

  return (
    <aside className="w-full rounded-2xl shadow-xl shadow-black bg-white dark:bg-neutral-900 p-4 text-white h-full flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base text-black dark:text-white font-semibold">Eventos</h3>
        <span className="text-xs text-black/80 dark:text-white/60">Demo</span>
      </div>
      <div className="recent-compras-scroll space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
        {events.map((event) => (
          <div key={event.id} className="w-full rounded-[18px] border border-white/10 bg-gradient-to-r from-black to-black/80 px-4 py-2">
            <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-white/65">
              <div className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-none bg-sky-500/10 text-sky-300 border-sky-400/60">
                {event.type === "compra" ? <ShoppingCartOutlinedIcon sx={{ fontSize: 14 }} /> : <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 14 }} />}
                <span>{event.type}</span>
              </div>
              <span>{event.username}</span>
            </div>
            <div className="text-sm text-white">{event.detail}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function DemoHome({ leads, onCreateContact, onCreatePurchase }) {
  const [activeForm, setActiveForm] = useState("contacto");
  const [contactName, setContactName] = useState(null);
  const [contactPhone, setContactPhone] = useState(() => generateRandomDemoContact());
  const [purchaseLeadId, setPurchaseLeadId] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [contactSavedOpen, setContactSavedOpen] = useState(false);
  const [purchaseSavedOpen, setPurchaseSavedOpen] = useState(false);

  return (
    <Page title="Inicio">
      <div className="flex justify-center mt-5 w-full">
        <Stack spacing={2} direction="row">
          <Button variant="outlined" startIcon={<ShoppingCartOutlinedIcon />} onClick={() => setActiveForm("compra")}>
            Nueva Compra
          </Button>
          <Button variant="outlined" startIcon={<PhoneCallbackOutlinedIcon />} onClick={() => setActiveForm("contacto")}>
            Nuevo Contacto
          </Button>
        </Stack>
      </div>

      <div className="mt-8 w-full flex justify-center">
        {activeForm === "contacto" ? (
          <form
            className="w-5/10 max-w-3xl rounded-2xl bg-black/40 p-4 text-white flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (contactName === null) return;
              onCreateContact({ name: contactName, phone: contactPhone });
              setContactName(null);
              setContactPhone(generateRandomDemoContact());
              setContactSavedOpen(true);
            }}
          >
            <div className="flex flex-col gap-4 justify-center w-full items-center">
              <Autocomplete
                options={[...new Set(leads.map((lead) => lead.name))]}
                renderInput={(params) => <TextField {...params} label="Nombre" />}
                value={contactName}
                onChange={(event, newValue) => setContactName(newValue)}
                fullWidth
              />
              <TextField
                label="Contacto (auto demo)"
                value={contactPhone}
                fullWidth
                InputProps={{ readOnly: true }}
              />
              <Button type="submit" variant="contained">Guardar contacto</Button>
            </div>
          </form>
        ) : (
          <form
            className="w-full max-w-3xl rounded-2xl bg-black/40 p-4 text-white flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!purchaseLeadId || !purchaseAmount) return;
              onCreatePurchase({ leadId: Number(purchaseLeadId), amount: Number(purchaseAmount) });
              setPurchaseLeadId("");
              setPurchaseAmount("");
              setPurchaseSavedOpen(true);
            }}
          >
            <Autocomplete
              options={leads.map((lead) => ({ label: lead.name, value: lead.id }))}
              renderInput={(params) => <TextField {...params} label="Cliente" />}
              value={purchaseLeadId ? { label: leads.find((lead) => lead.id === Number(purchaseLeadId))?.name || "", value: purchaseLeadId } : null}
              onChange={(event, newValue) => setPurchaseLeadId(newValue ? String(newValue.value) : "")}
              fullWidth
            />
            <TextField
              type="number"
              label="Monto"
              value={purchaseAmount}
              onChange={(event) => setPurchaseAmount(event.target.value)}
              size="small"
            />
            <Button type="submit" variant="contained">Registrar compra</Button>
          </form>
        )}
      </div>
      <Snackbar
        open={contactSavedOpen}
        autoHideDuration={2200}
        onClose={() => setContactSavedOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setContactSavedOpen(false)} severity="success" variant="filled">
          Contacto guardado
        </Alert>
      </Snackbar>
      <Snackbar
        open={purchaseSavedOpen}
        autoHideDuration={2200}
        onClose={() => setPurchaseSavedOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setPurchaseSavedOpen(false)} severity="success" variant="filled">
          Compra guardada
        </Alert>
      </Snackbar>
    </Page>
  );
}

function DemoStats({ leads, purchases }) {
  const totalLeads = leads.length;
  const totalCompras = purchases.length;
  const contactos = leads.filter((lead) => lead.status === "Contactado").length;
  const revenue = purchases.reduce((acc, purchase) => acc + purchase.amount, 0);
  const conversion = totalLeads > 0 ? (totalCompras / totalLeads) * 100 : 0;

  const cards = useMemo(
    () => [
      {
        title: "Web Visitors",
        value: String(totalLeads * 3),
        sizeHeight: "h-18",
        sizeWidth: "w-full",
        textSize: "text-sm lg:text-md",
        icon: <PreviewOutlinedIcon fontSize="extra-small" />,
      },
      {
        title: "Leads",
        value: String(totalLeads),
        sizeHeight: "h-18",
        sizeWidth: "w-full",
        textSize: "text-sm lg:text-md",
        icon: <PendingActionsOutlinedIcon fontSize="extra-small" />,
      },
      {
        title: "Contactos",
        value: String(contactos),
        sizeHeight: "h-18",
        sizeWidth: "w-full",
        textSize: "text-sm lg:text-md",
        icon: <ChatBubbleOutlineOutlinedIcon fontSize="extra-small" />,
      },
      {
        title: "Compras",
        value: String(totalCompras),
        sizeHeight: "h-22",
        sizeWidth: "w-full",
        textSize: "text-lg lg:text-2xl",
        icon: <ShoppingCartOutlinedIcon fontSize="extra-small" />,
      },
      {
        title: "Facturacion",
        value: `$ ${revenue.toLocaleString("es-AR")}`,
        sizeHeight: "h-22",
        sizeWidth: "w-full",
        textSize: "text-lg lg:text-2xl",
        icon: <AttachMoneyOutlinedIcon fontSize="extra-small" />,
      },
      {
        title: "Efectividad",
        value: `${conversion.toFixed(1)}%`,
        sizeHeight: "h-22",
        sizeWidth: "w-full",
        textSize: "text-lg lg:text-2xl",
        icon: <PercentOutlinedIcon fontSize="extra-small" />,
      },
    ],
    [contactos, conversion, revenue, totalCompras, totalLeads]
  );

  return (
    <Page title="Estadisticas">
      <div className="mt-2 w-full md:w-[95%]">
        <section className="min-w-0 space-y-4">
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
            {cards.map((card) => (
              <Card key={card.title} {...card} variant="kpi" />
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}

function DemoWhatsapp({ lines, onToggleLine }) {
  const activeLines = lines.filter((line) => line.active);

  return (
    <Page title="Gestion de Lineas de WhatsApp">
      <div className="whatsapp-cards w-full">
        {activeLines.map((line, index) => (
          <CardWhatsapp
            key={line.id}
            line={{ ...line, label: `LINEA ${index + 1}` }}
            onStatusClick={onToggleLine}
          />
        ))}
      </div>
    </Page>
  );
}

function DemoLanding() {
  const [endpoint, setEndpoint] = useState("https://example.com");
  const [iframeSrc, setIframeSrc] = useState("https://example.com");

  return (
    <Page title="Landing">
      <div className="w-full flex flex-col gap-3">
        <div className="flex gap-2">
          <TextField
            fullWidth
            size="small"
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            label="Endpoint iframe"
          />
          <Button variant="outlined" onClick={() => setIframeSrc(endpoint)}>Cargar</Button>
        </div>
        <div className="w-full h-[68vh] rounded-xl overflow-hidden border border-slate-300/50 dark:border-zinc-700">
          <iframe title="Landing demo" src={iframeSrc} className="h-full w-full" />
        </div>
      </div>
    </Page>
  );
}

function DemoShell({ username, onLogout, leads, purchases, lines, onCreateContact, onCreatePurchase, onToggleLine }) {
  const navigate = useNavigate();
  const location = useLocation();
  const showNuevosLeads = location.pathname === "/demo/home";
  const showEventos = location.pathname === "/demo/stats";

  return (
    <div className="flex h-screen w-full bg-neutral-100 dark:bg-zinc-800 overflow-hidden">
      <DemoSidebar onNavigate={navigate} onLogout={onLogout} />
      <div className="flex grow flex-col min-w-0">
        <header className="flex justify-end items-center gap-3 px-10 pt-5">
          <div className="text-sm text-black dark:text-white">{username}</div>
        </header>

        <main className="flex grow overflow-hidden flex-row p-5 min-w-0">
          <div className="flex-[3] min-w-0">
            <Routes>
              <Route path="/home" element={<DemoHome leads={leads} onCreateContact={onCreateContact} onCreatePurchase={onCreatePurchase} />} />
              <Route path="/stats" element={<DemoStats leads={leads} purchases={purchases} />} />
              <Route path="/whatsapp" element={<DemoWhatsapp lines={lines} onToggleLine={onToggleLine} />} />
              <Route path="/landing" element={<DemoLanding />} />
              <Route path="*" element={<Navigate to="/demo/home" replace />} />
            </Routes>
          </div>

          {showNuevosLeads && (
            <div className="flex-[1] min-w-0 ml-4">
              <DemoNuevosLeads leads={leads} />
            </div>
          )}

          {showEventos && (
            <div className="flex-[1] min-w-0 ml-4 h-full">
              <DemoStatsAside />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DemoApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [demoUser, setDemoUser] = useState(() => localStorage.getItem(DEMO_USER_KEY) || "");
  const [leads, setLeads] = useState(() => buildInitialLeads());
  const [purchases, setPurchases] = useState([]);
  const [lines, setLines] = useState(() => buildWhatsappLines());

  const handleLogin = (username) => {
    localStorage.setItem(DEMO_USER_KEY, username);
    setDemoUser(username);
    navigate("/demo/home", { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem(DEMO_USER_KEY);
    setDemoUser("");
    navigate("/demo", { replace: true });
  };

  const handleCreateContact = ({ name, phone }) => {
    setLeads((prev) => [{ id: prev.length + 1, name, phone, source: "Demo manual", status: "Nuevo" }, ...prev]);
  };

  const handleCreatePurchase = ({ leadId, amount }) => {
    if (!leadId || !amount) return;
    setPurchases((prev) => [{ id: prev.length + 1, leadId, amount }, ...prev]);
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status: "Contactado" } : lead)));
  };

  const handleToggleLine = (lineId) => {
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, active: !line.active } : line)));
  };

  if (!demoUser) {
    if (location.pathname !== "/demo") {
      return <Navigate to="/demo" replace />;
    }
    return <DemoLogin onLogin={handleLogin} />;
  }

  return (
    <DemoShell
      username={demoUser}
      onLogout={handleLogout}
      leads={leads}
      purchases={purchases}
      lines={lines}
      onCreateContact={handleCreateContact}
      onCreatePurchase={handleCreatePurchase}
      onToggleLine={handleToggleLine}
    />
  );
}
