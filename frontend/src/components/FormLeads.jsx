import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import "../assets/css/FormLeads.css";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { markClientesDirty } from "../services/operativo/clientes";
import { getLandingFontStack } from "../constants/landingTypography";

const QUEUE_KEY = "pending_clients";
const RETRY_DELAYS = [2000, 5000, 15000, 30000, 60000, 300000];
const ALERT_THRESHOLD_MS = 5 * 60 * 1000;
const ALERT_INTERVAL_MS = 60 * 1000;
const ALERT_DEDUP_MS = 30 * 60 * 1000;

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

function toMillis(value) {
    if (!value) return 0;
    const dt = new Date(value);
    const ms = dt.getTime();
    return Number.isFinite(ms) ? ms : 0;
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
    onWhatsappOpened,
    landingToken,
    bonusText,
    whatsappTemplate = "",
    infoColor,
    formBgColor,
    formBgOpacity,
    formFieldBorderColor,
    formTextFontFamily,
    formTextFontSize,
    formTextFontWeight,
    buttonFontFamily,
    buttonFontSize,
    buttonFontWeight,
    infoFontFamily,
    infoFontSize,
    infoFontWeight,
    mostrarFormulario = true,
    imagenReemplazoForm = "",
    isPreview = false,
    pasosNode = null,
    mediosPagoNode = null,
}) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const sendingRef = useRef(false);
    const retryIndexRef = useRef(0);
    const retryTimerRef = useRef(null);
    const healthTimerRef = useRef(null);

    const phoneDigits = useMemo(() => phone.replace(/\D/g, ""), [phone]);
    const trimmedName = useMemo(() => name.trim(), [name]);
    const username = useMemo(() => {
        if (!mostrarFormulario) return "";
        if (!trimmedName || !phoneDigits) return "";
        return buildUsername(trimmedName, phoneDigits);
    }, [mostrarFormulario, trimmedName, phoneDigits]);

    const finalButtonText = buttonText || "JUGÁ AHORA";
    const finalInfoText = infoText || "Atencion personalizada las 24hs.";
    const formTextFontStack = useMemo(() => getLandingFontStack(formTextFontFamily), [formTextFontFamily]);
    const buttonFontStack = useMemo(() => getLandingFontStack(buttonFontFamily), [buttonFontFamily]);
    const infoFontStack = useMemo(() => getLandingFontStack(infoFontFamily), [infoFontFamily]);
    const resolvedFormSize = useMemo(() => {
        const numeric = Number(formTextFontSize || 1);
        if (!Number.isFinite(numeric)) return 1;
        return Math.min(4, Math.max(0.8, numeric));
    }, [formTextFontSize]);
    const resolvedButtonSize = useMemo(() => {
        const numeric = Number(buttonFontSize || 1.2);
        if (!Number.isFinite(numeric)) return 1.2;
        return Math.min(4, Math.max(0.8, numeric));
    }, [buttonFontSize]);
    const resolvedInfoSize = useMemo(() => {
        const numeric = Number(infoFontSize || 1);
        if (!Number.isFinite(numeric)) return 1;
        return Math.min(4, Math.max(0.8, numeric));
    }, [infoFontSize]);
    const resolvedFormWeight = useMemo(() => {
        const numeric = Number(formTextFontWeight || 400);
        if (!Number.isFinite(numeric)) return 400;
        return Math.min(900, Math.max(100, numeric));
    }, [formTextFontWeight]);
    const resolvedButtonWeight = useMemo(() => {
        const numeric = Number(buttonFontWeight || 700);
        if (!Number.isFinite(numeric)) return 700;
        return Math.min(900, Math.max(100, numeric));
    }, [buttonFontWeight]);
    const resolvedInfoWeight = useMemo(() => {
        const numeric = Number(infoFontWeight || 700);
        if (!Number.isFinite(numeric)) return 700;
        return Math.min(900, Math.max(100, numeric));
    }, [infoFontWeight]);
    const resolvedFormOpacity = useMemo(() => {
        const numeric = Number(formBgOpacity ?? 0.7);
        if (!Number.isFinite(numeric)) return 0.7;
        return Math.min(1, Math.max(0, numeric));
    }, [formBgOpacity]);
    const resolvedFormBg = useMemo(() => {
        const cleanHex = String(formBgColor || "#000000");
        const hex = cleanHex.startsWith("#") ? cleanHex.slice(1) : cleanHex;
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) return `rgba(0, 0, 0, ${resolvedFormOpacity})`;
        const r = Number.parseInt(hex.slice(0, 2), 16);
        const g = Number.parseInt(hex.slice(2, 4), 16);
        const b = Number.parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${resolvedFormOpacity})`;
    }, [formBgColor, resolvedFormOpacity]);
    const resolvedFieldBorder = formFieldBorderColor || "#e014ff";
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
    const isPhoneValid = phoneDigits.length === 10;
    const canSubmit =
        Boolean(landingToken) &&
        (mostrarFormulario ? (Boolean(username) && isNameValid && isPhoneValid) : true);

    const scheduleRetry = () => {
        if (retryTimerRef.current) return;
        const delay = RETRY_DELAYS[Math.min(retryIndexRef.current, RETRY_DELAYS.length - 1)] || 300000;
        retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            tryFlushQueue();
        }, delay);
    };

    const sendWithBeacon = (baseUrl, payload) => {
        if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return false;
        try {
            const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
            return navigator.sendBeacon(`${baseUrl}/clientes/`, blob);
        } catch {
            return false;
        }
    };

    const sendWithKeepalive = async (baseUrl, payload) => {
        if (typeof fetch === "undefined") return;
        await fetch(`${baseUrl}/clientes/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
            credentials: "omit",
        });
    };

    const sendQueueAlert = (landingTokenToAlert, queueSize, oldestPendingMs) => {
        if (!landingTokenToAlert) return;
        const now = Date.now();
        const dedupKey = `lead_queue_alert_last_${landingTokenToAlert}`;
        let lastTs = 0;
        try {
            lastTs = Number(localStorage.getItem(dedupKey) || "0");
        } catch {
            lastTs = 0;
        }
        if (now - lastTs < ALERT_DEDUP_MS) return;

        const payload = {
            landing_token: landingTokenToAlert,
            queue_size: queueSize,
            oldest_pending_ms: Math.max(0, Math.round(oldestPendingMs)),
            threshold_ms: ALERT_THRESHOLD_MS,
            source: "landing_form",
        };
        const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        const beaconSent = (() => {
            if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return false;
            try {
                const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
                return navigator.sendBeacon(`${baseUrl}/landings/queue-alert/`, blob);
            } catch {
                return false;
            }
        })();

        if (!beaconSent && typeof fetch !== "undefined") {
            fetch(`${baseUrl}/landings/queue-alert/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true,
                credentials: "omit",
            }).catch(() => {
                // alert is best-effort only
            });
        }

        try {
            localStorage.setItem(dedupKey, String(now));
        } catch {
            // ignore storage errors
        }
    };

    const checkQueueHealth = () => {
        const queue = loadQueue();
        if (!queue.length) return;
        const now = Date.now();
        const statsByLanding = new Map();

        queue.forEach((item) => {
            const lt = item?.landing_token;
            if (!lt) return;
            const current = statsByLanding.get(lt) || { count: 0, oldest: now };
            const queuedAt = toMillis(item?.queued_at) || now;
            current.count += 1;
            current.oldest = Math.min(current.oldest, queuedAt);
            statsByLanding.set(lt, current);
        });

        statsByLanding.forEach((stats, lt) => {
            const oldestPendingMs = now - stats.oldest;
            if (oldestPendingMs >= ALERT_THRESHOLD_MS) {
                sendQueueAlert(lt, stats.count, oldestPendingMs);
            }
        });
    };

    const tryFlushQueue = async () => {
        if (sendingRef.current) return;
        const queue = loadQueue();
        if (!queue.length) {
            retryIndexRef.current = 0;
            return;
        }
        sendingRef.current = true;
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
                if (retryTimerRef.current) {
                    clearTimeout(retryTimerRef.current);
                    retryTimerRef.current = null;
                }
            } else {
                retryIndexRef.current = Math.min(retryIndexRef.current + 1, RETRY_DELAYS.length);
                scheduleRetry();
                checkQueueHealth();
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
            sendingRef.current = false;
        }
    };

    useEffect(() => {
        if (isPreview) return undefined;
        tryFlushQueue();
        checkQueueHealth();
        const handleOnline = () => {
            tryFlushQueue();
        };
        const handleHidden = () => {
            if (document.visibilityState !== "hidden") return;
            const queue = loadQueue();
            if (!queue.length) return;
            const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
            queue.slice(0, 20).forEach((item) => {
                sendWithBeacon(baseUrl, item);
            });
        };
        const handlePageHide = () => {
            const queue = loadQueue();
            if (!queue.length) return;
            const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
            queue.slice(0, 20).forEach((item) => {
                sendWithBeacon(baseUrl, item);
            });
        };
        window.addEventListener("online", handleOnline);
        document.addEventListener("visibilitychange", handleHidden);
        window.addEventListener("pagehide", handlePageHide);
        healthTimerRef.current = setInterval(() => {
            checkQueueHealth();
        }, ALERT_INTERVAL_MS);
        return () => {
            window.removeEventListener("online", handleOnline);
            document.removeEventListener("visibilitychange", handleHidden);
            window.removeEventListener("pagehide", handlePageHide);
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            if (healthTimerRef.current) {
                clearInterval(healthTimerRef.current);
                healthTimerRef.current = null;
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
                setError("Ingresá un número válido de 10 dígitos (sin 0, sin 15).");
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

        const generatedCodigo = Math.random().toString(36).substring(2, 8).toUpperCase();

        const messageWithCodigo = renderWhatsappMessage(whatsappTemplate, {
            bono: bonusText || "100%",
            username,
            nombre: trimmedName,
            contacto: phoneDigits,
            codigo: generatedCodigo,
        });
        const currentWhatsappUrl = buildWhatsappUrl(whatsappNumber, messageWithCodigo);

        const payload = {
            idempotency_key: generateIdempotencyKey(),
            queued_at: new Date().toISOString(),
            landing_token: landingToken,
            nombre: trimmedName,
            contacto: phoneDigits,
            username,
            codigo: generatedCodigo,
            ...(fbp ? { fbp } : {}),
            ...(fbc ? { fbc } : {}),
            ...Object.fromEntries(Object.entries(tracking).filter(([, value]) => Boolean(value))),
            ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
        };
        enqueueClient(payload);
        const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        sendWithBeacon(baseUrl, payload);
        sendWithKeepalive(baseUrl, payload).catch(() => {
            // keepalive is best-effort only
        });
        tryFlushQueue();
        checkQueueHealth();

        window.open(currentWhatsappUrl, "_blank", "noopener,noreferrer");
        if (typeof onWhatsappOpened === "function") {
            onWhatsappOpened();
        }
    };

    const handleNameChange = (event) => {
        const value = event.target.value;
        const onlyLetters = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
        setName(onlyLetters);
        if (error) setError("");
    };

    const handlePhoneChange = (event) => {
        const digitsOnly = String(event.target.value || "").replace(/\D/g, "").slice(0, 10);
        setPhone(digitsOnly);
        if (error) setError("");
    };

    return (
        <div
            className={`flex flex-col items-center rounded-xl backdrop-blur-[2px] shadow-xl w-8/10 lg:w-6/10 p-4 lg:p-1 my-2 transition-all duration-300 ${mostrarFormulario ? "h-6/10 lg:h-7/10" : "h-auto py-8 lg:py-12 justify-center"}`}
            style={{ backgroundColor: resolvedFormBg, fontFamily: formTextFontStack }}
        >
            {mostrarFormulario && (
                <h3
                    className='text-white text-xl lg:text-2xl my-1'
                    style={{ fontFamily: formTextFontStack, fontSize: `${1.5 * resolvedFormSize}rem`, fontWeight: resolvedFormWeight }}
                >
                    Contactanos
                </h3>
            )}

            {mostrarFormulario ? (
                <>
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
                                    borderRadius: "20px",
                                    backgroundColor: "rgba(49, 36, 146, 0.12)",
                                    "& fieldset": { borderColor: resolvedFieldBorder },
                                    "&:hover fieldset": { borderColor: "#fff" },
                                    "&.Mui-focused fieldset": { borderColor: "#fff" },
                                },
                                "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.85)", fontFamily: formTextFontStack, fontWeight: resolvedFormWeight },
                                "& .MuiInputBase-input": { color: "#fff", fontFamily: formTextFontStack, fontSize: `${1 * resolvedFormSize}rem`, fontWeight: resolvedFormWeight },
                            }}
                        />
                        <TextField
                            required
                            id="celular"
                            label="Celular"
                            fullWidth
                            value={phone}
                            onChange={handlePhoneChange}
                            InputProps={{
                                readOnly: isPreview,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Tooltip title="10 dígitos, sin 0, sin 15." arrow>
                                            <InfoOutlinedIcon sx={{ color: "rgba(255,255,255,0.75)", fontSize: 18 }} />
                                        </Tooltip>
                                    </InputAdornment>
                                ),
                            }}
                            inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 10 }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    marginBottom: "0",
                                    borderRadius: "20px",
                                    backgroundColor: "rgba(49, 36, 146, 0.12)",
                                    "& fieldset": { borderColor: resolvedFieldBorder },
                                    "&:hover fieldset": { borderColor: "#fff" },
                                    "&.Mui-focused fieldset": { borderColor: "#fff" },
                                },
                                "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.85)", fontFamily: formTextFontStack, fontWeight: resolvedFormWeight },
                                "& .MuiInputBase-input": { color: "#fff", fontFamily: formTextFontStack, fontSize: `${1 * resolvedFormSize}rem`, fontWeight: resolvedFormWeight },
                                "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.6)" },
                            }}
                        />
                    </Stack>
                    <span className='text-xs mt-1 text-white/70' style={{ fontFamily: formTextFontStack, fontSize: `${0.8 * resolvedFormSize}rem`, fontWeight: resolvedFormWeight }}>No compartiremos tu número con nadie.</span>
                    {error ? <span className='text-red-400 text-xs mt-2' style={{ fontFamily: formTextFontStack, fontSize: `${0.8 * resolvedFormSize}rem`, fontWeight: resolvedFormWeight }}>{error}</span> : null}
                </>
            ) : (
                imagenReemplazoForm ? (
                    <div className="w-full flex justify-center mb-2 px-2">
                        <img src={imagenReemplazoForm} alt="Placeholder" className="w-full max-h-48 object-contain rounded-full" />
                    </div>
                ) : null
            )}
            <div className={`landing-submit-wrap ${canSubmit ? "is-active" : ""}`}>
                <Button variant="contained" startIcon={<WhatsAppIcon />}
                    onClick={handleWhatsappClick}
                    disabled={isPreview || !canSubmit}
                    sx={{
                        backgroundColor: "transparent",
                        marginTop: "10px",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "20px",
                        padding: "10px 20px",
                        fontWeight: resolvedButtonWeight,
                        fontSize: `${resolvedButtonSize}rem`,
                        fontFamily: buttonFontStack,
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
            </div>
            <span className='font-bold text-md mt-4 lg:mt-2' style={{ color: infoColor || "#ffffff", fontFamily: infoFontStack, fontSize: `${resolvedInfoSize}rem`, fontWeight: resolvedInfoWeight }}>{finalInfoText}</span>
            {pasosNode && (
                <div className="w-full mt-2 flex justify-center">
                    {pasosNode}
                </div>
            )}
            {mediosPagoNode && (
                <div className="w-full mt-2 flex justify-center">
                    {mediosPagoNode}
                </div>
            )}
        </div >);
}
