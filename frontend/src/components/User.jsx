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
        <div className="flex items-center text-sm text-black dark:text-white gap-2">
            <IconButton
                size="small"
                onClick={(event) => setSettingsAnchorEl(event.currentTarget)}
                sx={{ color: "inherit" }}
                aria-label="Abrir configuracion"
            >
                <SettingsOutlinedIcon fontSize="small" />
            </IconButton>
            <Popover
                open={settingsOpen}
                anchorEl={settingsAnchorEl}
                onClose={() => setSettingsAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <div className="w-[290px] p-3 bg-white dark:bg-zinc-900 text-black dark:text-white">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
                        Configuracion
                    </div>
                    <div className="flex flex-col gap-3">
                        <FormControl fullWidth size="small">
                            <InputLabel id="ui-currency-label">Moneda</InputLabel>
                            <Select
                                labelId="ui-currency-label"
                                value={settings.currency}
                                label="Moneda"
                                onChange={(event) => saveUISettings({ currency: event.target.value })}
                            >
                                <MenuItem value="USD">US$</MenuItem>
                                <MenuItem value="ARS">AR$</MenuItem>
                            </Select>
                        </FormControl>

                        {isSuperuser ? (
                            <>
                                <Divider />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            size="small"
                                            checked={Boolean(settings.statsMockMode)}
                                            onChange={(_, checked) => saveUISettings({ statsMockMode: checked })}
                                        />
                                    }
                                    label="Modo mock (Stats)"
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
                                label="Test Mode Meta"
                            />
                        ) : null}
                    </div>
                </div>
            </Popover>
            <div className="flex items-center cursor-pointer gap-2">
                <AccountCircleOutlinedIcon />
                <span>{username}</span>
            </div>
        </div>
    );
}

export default User;
