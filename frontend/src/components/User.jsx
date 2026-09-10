import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../services/auth";
import { setEmpresaMetaTestMode } from "../services/empresas/empresas";
import { useTenant } from "../context/TenantContext";
import { getUISettings, saveUISettings, subscribeUISettings } from "../services/uiSettings";

function User() {
    const [username, setUsername] = useState("Usuario");
    const [isSuperuser, setIsSuperuser] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
    const [settings, setSettings] = useState(() => getUISettings());
    const { tenantId, tenantOptions, setTenantMetaTestMode } = useTenant();

    const selectedTenant = (tenantOptions || []).find((item) => Number(item.id) === Number(tenantId)) || null;
    const metaTestMode = Boolean(selectedTenant?.meta_test_mode);

    useEffect(() => {
        const syncFromStorage = () => {
            const user = getCurrentUser();
            setUsername(user?.username || "Usuario");
            setIsSuperuser(Boolean(user?.is_superuser));
        };
        syncFromStorage();
        window.addEventListener("auth:user-changed", syncFromStorage);
        return () => window.removeEventListener("auth:user-changed", syncFromStorage);
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeUISettings((next) => setSettings(next));
        return unsubscribe;
    }, []);

    const settingsOpen = Boolean(settingsAnchorEl);
    return (
        <div className="flex items-center text-xs text-zinc-300 gap-1.5">
            <IconButton
                size="small"
                onClick={(event) => setSettingsAnchorEl(event.currentTarget)}
                sx={{
                    color: "rgba(255, 255, 255, 0.65)",
                    p: "6px",
                    borderRadius: "8px",
                    "&:hover": {
                        color: "#ffffff",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                }}
                aria-label="Abrir configuracion"
            >
                <SettingsOutlinedIcon sx={{ fontSize: "1.15rem" }} />
            </IconButton>
            <Popover
                open={settingsOpen}
                anchorEl={settingsAnchorEl}
                onClose={() => setSettingsAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: "12px",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            backgroundColor: "#11141c",
                            boxShadow: "0 16px 36px -4px rgba(0, 0, 0, 0.6)",
                            p: "14px",
                            width: "280px",
                        },
                    },
                }}
            >
                <div className="text-zinc-100">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                        Configuración
                    </div>
                    <div className="flex flex-col gap-3">
                        <FormControl fullWidth size="small">
                            <InputLabel id="ui-currency-label" sx={{ fontSize: "0.8rem" }}>Moneda</InputLabel>
                            <Select
                                labelId="ui-currency-label"
                                value={settings.currency}
                                label="Moneda"
                                onChange={(event) => saveUISettings({ currency: event.target.value })}
                                sx={{ height: 34, fontSize: "0.8125rem", borderRadius: "8px" }}
                            >
                                <MenuItem value="USD" sx={{ fontSize: "0.8125rem" }}>US$</MenuItem>
                                <MenuItem value="ARS" sx={{ fontSize: "0.8125rem" }}>AR$</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel id="ui-theme-label" sx={{ fontSize: "0.8rem" }}>Tema</InputLabel>
                            <Select
                                labelId="ui-theme-label"
                                value={settings.theme === "light" ? "light" : "dark"}
                                label="Tema"
                                onChange={(event) => saveUISettings({ theme: event.target.value })}
                                sx={{ height: 34, fontSize: "0.8125rem", borderRadius: "8px" }}
                            >
                                <MenuItem value="light" sx={{ fontSize: "0.8125rem" }}>Light</MenuItem>
                                <MenuItem value="dark" sx={{ fontSize: "0.8125rem" }}>Dark</MenuItem>
                            </Select>
                        </FormControl>

                        {isSuperuser ? (
                            <>
                                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }} />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            size="small"
                                            checked={Boolean(settings.statsMockMode)}
                                            onChange={(_, checked) => saveUISettings({ statsMockMode: checked })}
                                        />
                                    }
                                    label={<span className="text-xs text-zinc-300">Modo mock (Stats)</span>}
                                />
                            </>
                        ) : null}

                        {isSuperuser && tenantId ? (
                            <FormControlLabel
                                control={
                                    <Switch
                                        size="small"
                                        checked={metaTestMode}
                                        disabled={saving}
                                        onChange={async (_, checked) => {
                                            setSaving(true);
                                            try {
                                                await setEmpresaMetaTestMode(tenantId, checked);
                                                setTenantMetaTestMode(tenantId, checked);
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                    />
                                }
                                label={<span className="text-xs text-zinc-300">Test Mode Meta</span>}
                            />
                        ) : null}
                    </div>
                </div>
            </Popover>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors cursor-default">
                <AccountCircleOutlinedIcon sx={{ fontSize: "1.15rem", color: "rgba(255, 255, 255, 0.6)" }} />
                <span className="font-medium text-zinc-200 tracking-tight">{username}</span>
            </div>
        </div>
    );
}

export default User;
