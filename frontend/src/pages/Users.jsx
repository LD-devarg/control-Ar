import { useEffect, useMemo, useState } from "react";
import Page from "../layouts/Page";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import MenuItem from "@mui/material/MenuItem";
import { fetchUsuarios, createUsuario, updateUsuario, fetchGrupos } from "../services/empresas/usuarios";
import { getCurrentUser } from "../services/auth";

const EMPTY_FORM = {
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    activo: true,
    groupId: "",
};

export default function Users() {
    const [usuarios, setUsuarios] = useState([]);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [grupos, setGrupos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const currentUser = useMemo(() => getCurrentUser(), []);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const [usersData, groupsData] = await Promise.all([fetchUsuarios(), fetchGrupos()]);
            setUsuarios(usersData);
            setGrupos(groupsData);
            if (selected) {
                const updated = usersData.find((item) => item.id === selected.id);
                if (updated) {
                    setSelected(updated);
                    setForm({
                        username: updated.username || "",
                        first_name: updated.first_name || "",
                        last_name: updated.last_name || "",
                        email: updated.email || "",
                        password: "",
                        activo: Boolean(updated.activo),
                        groupId: (updated.groups && updated.groups[0]) || "",
                    });
                }
            }
        } catch {
            setError("No se pudieron cargar los usuarios.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const groupNameById = (id) => grupos.find((g) => g.id === id)?.name;

    const isSuperuser = Boolean(currentUser?.is_superuser);
    const isAdmin = Boolean(currentUser?.groups?.some((id) => groupNameById(id) === "Admin"));

    const allowedGroupNames = isSuperuser
        ? ["Admin", "Operador", "Pauta"]
        : isAdmin
            ? ["Operador", "Pauta"]
            : [];

    const allowedGroups = grupos.filter((g) => allowedGroupNames.includes(g.name));

    const canCreate = isSuperuser || isAdmin;

    const handleSelect = (user) => {
        setSelected(user);
        setForm({
            username: user?.username || "",
            first_name: user?.first_name || "",
            last_name: user?.last_name || "",
            email: user?.email || "",
            password: "",
            activo: Boolean(user?.activo),
            groupId: (user?.groups && user.groups[0]) || "",
        });
        setError("");
    };

    const handleClear = () => {
        setSelected(null);
        setForm(EMPTY_FORM);
        setError("");
    };

    const handleChange = (key) => (event) => {
        const value = key === "activo" ? event.target.checked : event.target.value;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!canCreate) {
            setError("No tenes permisos para crear o editar usuarios.");
            return;
        }
        if (!form.username.trim()) {
            setError("El username es obligatorio.");
            return;
        }
        if (!selected && !form.password.trim()) {
            setError("La contrasena es obligatoria para crear.");
            return;
        }
        if (!form.groupId) {
            setError("Selecciona un grupo.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const payload = {
                username: form.username.trim(),
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim(),
                activo: Boolean(form.activo),
                groups: [Number(form.groupId)],
            };
            if (form.password.trim()) {
                payload.password = form.password.trim();
            }
            if (selected) {
                await updateUsuario(selected.id, payload);
            } else {
                await createUsuario(payload);
            }
            await load();
            if (!selected) {
                setForm(EMPTY_FORM);
            }
        } catch (err) {
            const detail = err?.response?.data?.detail;
            setError(detail || "No se pudo guardar el usuario.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Page title="Usuarios">
            <div className="flex flex-col w-full gap-6 p-6">
                <div className="flex gap-6">
                    <div className="flex-1 rounded-xl bg-black/80 text-white p-4 border border-white/10">
                        <div className="font-semibold text-lg mb-3">Listado</div>
                        <div className="flex flex-col gap-2 max-h-[60vh] overflow-auto">
                            {usuarios.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleSelect(user)}
                                    className={`text-left rounded-lg px-3 py-2 border ${
                                        selected?.id === user.id
                                            ? "border-white bg-white/10"
                                            : "border-white/10 hover:border-white/40"
                                    }`}
                                >
                                    <div className="font-semibold">{user.username}</div>
                                    <div className="text-xs text-white/70">
                                        {user.activo ? "Activo" : "Inactivo"} · #{user.id}
                                    </div>
                                </button>
                            ))}
                            {usuarios.length === 0 ? (
                                <div className="text-sm text-white/60">Sin usuarios.</div>
                            ) : null}
                        </div>
                    </div>
                    <div className="w-[460px] rounded-xl bg-black/80 text-white p-4 border border-white/10">
                        <div className="font-semibold text-lg mb-3">
                            {selected ? "Editar usuario" : "Crear usuario"}
                        </div>
                        <div className="flex flex-col gap-3">
                            <TextField
                                label="Username"
                                value={form.username}
                                onChange={handleChange("username")}
                                fullWidth
                                size="small"
                                sx={{
                                    "& .MuiInputBase-input": { color: "#fff" },
                                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.8)" },
                                    "& .MuiOutlinedInput-root fieldset": {
                                        borderColor: "rgba(255,255,255,0.4)",
                                    },
                                    "& .MuiOutlinedInput-root:hover fieldset": {
                                        borderColor: "rgba(255,255,255,0.7)",
                                    },
                                    "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                                        borderColor: "#fff",
                                    },
                                }}
                                disabled={!canCreate}
                            />
                            <div className="flex gap-2">
                                <TextField
                                    label="Nombre"
                                    value={form.first_name}
                                    onChange={handleChange("first_name")}
                                    fullWidth
                                    size="small"
                                    sx={{
                                        "& .MuiInputBase-input": { color: "#fff" },
                                        "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.8)" },
                                        "& .MuiOutlinedInput-root fieldset": {
                                            borderColor: "rgba(255,255,255,0.4)",
                                        },
                                        "& .MuiOutlinedInput-root:hover fieldset": {
                                            borderColor: "rgba(255,255,255,0.7)",
                                        },
                                        "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                                            borderColor: "#fff",
                                        },
                                    }}
                                    disabled={!canCreate}
                                />
                                <TextField
                                    label="Apellido"
                                    value={form.last_name}
                                    onChange={handleChange("last_name")}
                                    fullWidth
                                    size="small"
                                    sx={{
                                        "& .MuiInputBase-input": { color: "#fff" },
                                        "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.8)" },
                                        "& .MuiOutlinedInput-root fieldset": {
                                            borderColor: "rgba(255,255,255,0.4)",
                                        },
                                        "& .MuiOutlinedInput-root:hover fieldset": {
                                            borderColor: "rgba(255,255,255,0.7)",
                                        },
                                        "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                                            borderColor: "#fff",
                                        },
                                    }}
                                    disabled={!canCreate}
                                />
                            </div>
                            <TextField
                                label="Email"
                                value={form.email}
                                onChange={handleChange("email")}
                                fullWidth
                                size="small"
                                sx={{
                                    "& .MuiInputBase-input": { color: "#fff" },
                                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.8)" },
                                    "& .MuiOutlinedInput-root fieldset": {
                                        borderColor: "rgba(255,255,255,0.4)",
                                    },
                                    "& .MuiOutlinedInput-root:hover fieldset": {
                                        borderColor: "rgba(255,255,255,0.7)",
                                    },
                                    "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                                        borderColor: "#fff",
                                    },
                                }}
                                disabled={!canCreate}
                            />
                            <TextField
                                select
                                label="Grupo"
                                value={form.groupId}
                                onChange={handleChange("groupId")}
                                fullWidth
                                size="small"
                                sx={{
                                    "& .MuiInputBase-input": { color: "#fff" },
                                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.8)" },
                                    "& .MuiOutlinedInput-root fieldset": {
                                        borderColor: "rgba(255,255,255,0.4)",
                                    },
                                    "& .MuiOutlinedInput-root:hover fieldset": {
                                        borderColor: "rgba(255,255,255,0.7)",
                                    },
                                    "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                                        borderColor: "#fff",
                                    },
                                }}
                                disabled={!canCreate}
                            >
                                {allowedGroups.map((group) => (
                                    <MenuItem key={group.id} value={group.id}>
                                        {group.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Password"
                                type="password"
                                value={form.password}
                                onChange={handleChange("password")}
                                fullWidth
                                size="small"
                                helperText={selected ? "Dejar vacio para no cambiar." : ""}
                                sx={{
                                    "& .MuiInputBase-input": { color: "#fff" },
                                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.8)" },
                                    "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.6)" },
                                    "& .MuiOutlinedInput-root fieldset": {
                                        borderColor: "rgba(255,255,255,0.4)",
                                    },
                                    "& .MuiOutlinedInput-root:hover fieldset": {
                                        borderColor: "rgba(255,255,255,0.7)",
                                    },
                                    "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                                        borderColor: "#fff",
                                    },
                                }}
                                disabled={!canCreate}
                            />
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <Checkbox
                                checked={form.activo}
                                onChange={handleChange("activo")}
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    "&.Mui-checked": { color: "#fff" },
                                }}
                                disabled={!canCreate}
                            />
                            <span className="text-sm">Activo</span>
                        </div>
                        {error ? <div className="text-red-400 text-sm mt-2">{error}</div> : null}
                        <div className="flex gap-2 mt-4">
                            <Button
                                variant="contained"
                                onClick={handleSave}
                                disabled={loading || !canCreate}
                                sx={{ backgroundColor: "#22c55e", color: "#0b0b0b", fontWeight: 700 }}
                            >
                                {selected ? "Guardar" : "Crear"}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleClear}
                                disabled={loading}
                                sx={{ borderColor: "#fff", color: "#fff" }}
                            >
                                Limpiar
                            </Button>
                        </div>
                        {!canCreate ? (
                            <div className="text-xs text-white/60 mt-2">
                                Solo Admin o Superusuario pueden crear usuarios.
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </Page>
    );
}