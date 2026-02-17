import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import "../assets/css/FormLeads.css";
import { motion } from "motion/react";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { markClientesDirty } from "../services/operativo/clientes";

const QUEUE_KEY = "pending_clients";
const RETRY_DELAYS = [];

function generateIdempotencyKey() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function buildUsername(name, phoneDigits) {
    const cleanName = name.replace(/\s+/g, "");
    const last3 = phoneDigits.slice(-3);
    return `${cleanName}${last3}`;
}

function buildWhatsappUrl(number, text) {
    if (!number) return "";
    const encoded = encodeURIComponent(text || "");
    return `https://wa.me/${number}?text=${encoded}`;
}

function renderWhatsappMessage(template, variables) {
    const fallback = "Hola vengo por el bono del {{bono}} mi username es {{username}}";
    const source = (template || fallback).trim() || fallback;
    return source.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, key) => {
        const value = variables[key];
        return value === undefined || value === null ? "" : String(value);
    });
}

function loadQueue() {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function getCookieValue(name) {
    if (typeof document === "undefined") return "";
    const parts = document.cookie.split("; ");
    for (const part of parts) {
        const [key, ...rest] = part.split("=");
        if (key === name) {
            return decodeURIComponent(rest.join("="));
        }
    }
    return "";
}

function getTrackingParams() {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search || "");
    const read = (key) => params.get(key) || undefined;
    return {
        fbclid: read("fbclid"),
        utm_source: read("utm_source"),
        utm_medium: read("utm_medium"),
        utm_campaign: read("utm_campaign"),
        utm_content: read("utm_content"),
        utm_term: read("utm_term"),
    };
}

export default function NuevoLead({
    buttonText,
    infoText,
    whatsappNumber,
    landingToken,
    bonusText,
    whatsappTemplate = "",
    infoColor,
    isPreview = false,
}) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const retryIndexRef = useRef(0);
    const retryTimerRef = useRef(null);

    const phoneDigits = useMemo(() => phone.replace(/\D/g, ""), [phone]);
    const trimmedName = useMemo(() => name.trim(), [name]);
    const username = useMemo(() => {
        if (!trimmedName || !phoneDigits) return "";
        return buildUsername(trimmedName, phoneDigits);
    }, [trimmedName, phoneDigits]);

    const finalButtonText = buttonText || "JUGÁ AHORA";
    const finalInfoText = infoText || "🤳Atención personalizada las 24hs.";
    const messageText = useMemo(
        () =>
            renderWhatsappMessage(whatsappTemplate, {
                bono: bonusText || "100%",
                username,
                nombre: trimmedName,
                contacto: phoneDigits,
            }),
        [whatsappTemplate, bonusText, username, trimmedName, phoneDigits]
    );
    const whatsappUrl = useMemo(() => buildWhatsappUrl(whatsappNumber, messageText), [whatsappNumber, messageText]);

    const isNameValid = trimmedName.length > 1;
    const isPhoneValid = phoneDigits.length >= 10;
    const canSubmit =
        Boolean(landingToken) &&
        Boolean(username) &&
        isNameValid &&
        isPhoneValid;

    const scheduleRetry = () => {
        return;
    };

    const tryFlushQueue = async () => {
        if (sending) return;
        const queue = loadQueue();
        if (!queue.length) {
            retryIndexRef.current = 0;
            return;
        }
        setSending(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
            const remaining = [];
            let lastError = null;
            let anySuccess = false;
            for (const item of queue) {
                try {
                    await axios.post(`${baseUrl}/clientes/`, item);
                    markClientesDirty();
                    anySuccess = true;
                } catch (err) {
                    lastError = err;
                    remaining.push(item);
                }
            }
            saveQueue(remaining);
            if (remaining.length === 0) {
                retryIndexRef.current = 0;
            } else {
                retryIndexRef.current = Math.min(retryIndexRef.current + 1, RETRY_DELAYS.length);
                scheduleRetry();
            }
            if (anySuccess && typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("leads:refresh"));
                try {
                    localStorage.setItem("leads_dirty", "1");
                    localStorage.setItem("leads_refresh_ts", String(Date.now()));
                } catch {
                    // ignore storage errors
                }
            }
            if (lastError) {
                throw lastError;
            }
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        if (isPreview) return undefined;
        tryFlushQueue();
        return () => {
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
        };
    }, [isPreview]);

    const enqueueClient = (payload) => {
        const queue = loadQueue();
        queue.push(payload);
        saveQueue(queue);
        scheduleRetry();
    };

    const handleWhatsappClick = () => {
        if (isPreview) return;
        if (!canSubmit) {
            if (!isNameValid) {
                setError("Ingresá un nombre válido.");
            } else if (!isPhoneValid) {
                setError("Ingresá un número válido (mínimo 10 dígitos).");
            } else if (!landingToken) {
                setError("Landing inválida o sin token.");
            }
            return;
        }
        if (!whatsappNumber) {
            setError("No hay líneas de WhatsApp activas para esta empresa.");
            return;
        }
        setError("");

        const fbp = getCookieValue("_fbp") || undefined;
        const fbc = getCookieValue("_fbc") || undefined;
        const tracking = getTrackingParams();
        const eventSourceUrl =
            typeof window !== "undefined"
                ? `${window.location.origin}${window.location.pathname}`
                : undefined;

        const payload = {
            idempotency_key: generateIdempotencyKey(),
            landing_token: landingToken,
            nombre: trimmedName,
            contacto: phoneDigits,
            username,
            ...(fbp ? { fbp } : {}),
            ...(fbc ? { fbc } : {}),
            ...Object.fromEntries(Object.entries(tracking).filter(([, value]) => Boolean(value))),
            ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
        };
        enqueueClient(payload);
        tryFlushQueue();

        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    };

    const handleNameChange = (event) => {
        const value = event.target.value;
        const onlyLetters = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
        setName(onlyLetters);
        if (error) setError("");
    };

    const handlePhoneChange = (event) => {
        setPhone(event.target.value);
        if (error) setError("");
    };

    return (
        <div className="flex flex-col items-center rounded-2xl shadow-xl bg-black/50 w-8/10 lg:w-3/10 h-5/10 pt-2 m-4">
            <h3 className='text-white text-xl lg:text-2xl mb-2'>Contactanos</h3>
            <Stack spacing={0.5} direction="column" className="form-leads-stack">
                <TextField
                className='textfield'
                required
                id="nombre"
                label="Nombre"
                variant="outlined"
                fullWidth
                value={name}
                onChange={handleNameChange}
                InputProps={{ readOnly: isPreview }}
                sx={{
                    "& .MuiOutlinedInput-root": {
                        marginBottom: "10px",
                    borderRadius: "50px",
                    backgroundColor: "rgba(217, 221, 88, 0.12)",
                    "& fieldset": { borderColor: "rgba(251, 255, 20, 0.8)" },
                    "&:hover fieldset": { borderColor: "#fff" },
                    "&.Mui-focused fieldset": { borderColor: "#fff" },
                    },
                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.85)" },
                    "& .MuiInputBase-input": { color: "#fff" },
                }}
                />
                <TextField
                    required
                    helperText="No compartiremos tu número con nadie."
                    id="celular"
                    label="Celular"
                    fullWidth
                    value={phone}
                    onChange={handlePhoneChange}
                    InputProps={{ readOnly: isPreview }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                        marginBottom: "0",
                            borderRadius: "50px",
                            backgroundColor: "rgba(217, 221, 88, 0.12)",
                            "& fieldset": { borderColor: "rgba(251, 255, 20, 0.8)",
                             },
                        "&:hover fieldset": { borderColor: "#fff" },
                        "&.Mui-focused fieldset": { borderColor: "#fff" },
                        },
                        "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.85)" },
                        "& .MuiInputBase-input": { color: "#fff" },
                        "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.6)" },
                    }}
                    />
            </Stack>
            {error ? <span className='text-red-400 text-xs mt-2'>{error}</span> : null}
            <motion.div
                className=""
                animate={{ 
                    scale: [1.2, 1.7, 1.2], }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                >
                <Button variant="contained" startIcon={<WhatsAppIcon />}
                onClick={handleWhatsappClick}
                disabled={isPreview || !canSubmit}
                sx={{
                    backgroundColor: "transparent",
                    marginTop: "30px",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "50px",
                    padding: "10px 20px",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    background: "linear-gradient(135deg, #2bd528 0%, #038f0c 100%)",
                    boxShadow: "0 4px 15px rgba(255, 203, 13, 0.4), 0 2px 5px rgba(0, 0, 0, 0.2)",
                    "&:hover": {
                        backgroundColor: "transparent",
                    },
                    "&.Mui-disabled": {
                        background: "linear-gradient(135deg, rgba(43, 213, 40, 0.35) 0%, rgba(3, 143, 12, 0.35) 100%)",
                        color: "rgba(255,255,255,0.7)",
                        boxShadow: "none",
                    },
                }}
                >
                    {finalButtonText}
                </Button>
            </motion.div>
            <span className='font-bold text-md mt-10' style={{ color: infoColor || "#ffffff" }}>{finalInfoText}</span>
        </div>);
}
