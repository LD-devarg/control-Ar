import Page from "../layouts/Page.jsx";
import AndroidIcon from "@mui/icons-material/Android";

export default function CRMBots() {
  return (
    <Page title="Bots Automatizados">
      <div className="w-full flex flex-col items-center justify-center py-20 px-4 text-center select-none">
        <div className="w-20 h-20 bg-zinc-800/40 rounded-3xl border border-zinc-700/50 flex items-center justify-center mb-6 text-[#a3e635] shadow-lg shadow-[#a3e635]/5 animate-pulse">
          <AndroidIcon sx={{ fontSize: 40 }} />
        </div>
        <h2 className="text-xl font-bold text-zinc-100 mb-2">Administrador de Bots</h2>
        <p className="text-sm text-zinc-400 max-w-sm mb-6">
          Configura y entrena agentes conversacionales inteligentes con IA para automatizar las respuestas y el flujo de embudo directamente en WhatsApp.
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#a3e635]/15 px-3 py-1 text-xs font-bold tracking-wider text-[#a3e635] uppercase">
          ⚡ Próximamente
        </span>
      </div>
    </Page>
  );
}
