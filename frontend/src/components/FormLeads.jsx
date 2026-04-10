import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import "../assets/css/FormLeads.css";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { markClientesDirty } from "../services/operativo/clientes";
import { getLandingFontStack } from "../constants/landingTypography";

const QUEUE_KEY = "pending_clients";
const RETRY_DELAYS = [2000, 5000, 15000, 30000, 60000, 300000];
const ALERT_THRESHOLD_MS = 5 * 60 * 1000;
const ALERT_INTERVAL_MS = 60 * 1000;
const ALERT_DEDUP_MS = 30 * 60 * 1000;
const PRIMARY_SUBMIT_TIMEOUT_MS = 3000;
const RECENT_QUEUE_GRACE_MS = 8000;

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

function buildUsername(name, code) {
    const cleanName = String(name || "").replace(/\s+/g, "");
    const last3 = String(code || "").slice(-3);
    return `${cleanName || "lead"}${last3}`;
}

function buildWhatsappUrl(number, text) {
    if (!number) return "";
    const digits = String(number).replace(/\D/g, "");
    let normalizedNumber = digits;
    if (digits.length === 10) {
        normalizedNumber = `549${digits}`;
    } else if (digits.startsWith("54") && digits.length === 12) {
        normalizedNumber = `549${digits.slice(2)}`;
    } else if (digits.startsWith("0") && digits.length === 11) {
        normalizedNumber = `549${digits.slice(1)}`;
    }
    const encoded = encodeURIComponent(text || "");
    return `https://wa.me/${normalizedNumber}?text=${encoded}`;
}

function extractWhatsappLaunchData(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        const phone = parsed.pathname.replace(/\//g, "").trim();
        const text = parsed.searchParams.get("text") || "";
        if (!phone) return null;
        return {
            phone,
            text,
            encodedText: encodeURIComponent(text),
        };
    } catch {
        return null;
    }
}

function getWhatsappLaunchUrl(url) {
    const launchData = extractWhatsappLaunchData(url);
    if (!launchData || typeof navigator === "undefined") return url;

    const ua = String(navigator.userAgent || "");
    const isAndroid = /Android/i.test(ua);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    const isInAppBrowser = /FB_IAB|FB4A|Instagram|wv\b|WebView/i.test(ua);
    const apiUrl = `https://api.whatsapp.com/send?phone=${launchData.phone}&text=${launchData.encodedText}`;

    if (isAndroid && isInAppBrowser) {
        return `intent://send?phone=${launchData.phone}&text=${launchData.encodedText}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(apiUrl)};end`;
    }

    if (isMobile) {
        return `whatsapp://send?phone=${launchData.phone}&text=${launchData.encodedText}`;
    }

    return apiUrl;
}

function openReservedWindow() {
    if (typeof window === "undefined" || typeof window.open !== "function") return null;
    const popup = window.open("", "_blank");
    if (!popup) return null;
    try {
        popup.opener = null;
    } catch {
        // ignore opener hardening failures
    }
    try {
        popup.document.write(`
            <!doctype html>
            <html lang="es">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>Redirigiendo a WhatsApp</title>
                    <style>
                        body {
                            margin: 0;
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: linear-gradient(180deg, #09111f 0%, #0f1a2b 100%);
                            color: #fff;
                            font-family: Arial, sans-serif;
                        }
                        .wa-loading {
                            max-width: 320px;
                            padding: 24px 22px;
                            border-radius: 22px;
                            border: 1px solid rgba(255,255,255,0.14);
                            background: rgba(255,255,255,0.06);
                            text-align: center;
                            box-shadow: 0 18px 40px rgba(0,0,0,0.28);
                        }
                        .wa-loading strong {
                            display: block;
                            margin-bottom: 8px;
                            font-size: 18px;
                        }
                        .wa-loading span {
                            display: block;
                            color: rgba(255,255,255,0.78);
                            font-size: 14px;
                            line-height: 1.45;
                        }
                    </style>
                </head>
                <body>
                    <div class="wa-loading">
                        <strong>Redirigiendo a WhatsApp…</strong>
                        <span>Estamos preparando tu acceso. Esta ventana se actualizará automáticamente.</span>
                    </div>
                </body>
            </html>
        `);
        popup.document.close();
    } catch {
        // ignore popup rendering issues
    }
    return popup;
}

function navigateToWhatsapp(url, reservedWindow = null) {
    if (!url || typeof window === "undefined") return;
    const launchUrl = getWhatsappLaunchUrl(url);
    const targetWindow = reservedWindow && !reservedWindow.closed ? reservedWindow : window;
    try {
        targetWindow.location.assign(launchUrl);
    } catch {
        window.location.assign(launchUrl);
    }
}

function randomInt(maxExclusive) {
    const array = new Uint32Array(1);
    const cryptoApi = globalThis.crypto;
    if (cryptoApi?.getRandomValues) {
        cryptoApi.getRandomValues(array);
    } else {
        array[0] = Math.floor(Math.random() * maxExclusive);
    }
    return array[0] % maxExclusive;
}

function normalizeCodePrefix(prefix) {
    return String(prefix || "").replace(/[^a-z]/gi, "").toUpperCase().slice(0, 2);
}

function generateLeadCode(prefix = "CL") {
    const normalizedPrefix = normalizeCodePrefix(prefix) || "CL";
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const body = [];
    for (let i = 0; i < 6; i += 1) {
        body.push(String(randomInt(10)));
    }
    for (let i = 0; i < 2; i += 1) {
        body.push(letters[randomInt(letters.length)]);
    }
    for (let i = body.length - 1; i > 0; i -= 1) {
        const j = randomInt(i + 1);
        [body[i], body[j]] = [body[j], body[i]];
    }
    return `${normalizedPrefix}${body.join("")}`;
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

function buildResponsiveFontSize(maxRem, minFactor = 0.74, vwFactor = 3.2) {
    const numeric = Number(maxRem);
    const safeMax = Number.isFinite(numeric) ? numeric : 1;
    const safeMin = Math.max(0.78, Number((safeMax * minFactor).toFixed(2)));
    return `clamp(${safeMin}rem, ${vwFactor}vw, ${safeMax}rem)`;
}

function saveQueue(queue) {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        return true;
    } catch {
        return false;
    }
}

function removeQueuedClient(idempotencyKey) {
    if (!idempotencyKey) return;
    const queue = loadQueue();
    const remaining = queue.filter((item) => item?.idempotency_key !== idempotencyKey);
    if (remaining.length !== queue.length) {
        saveQueue(remaining);
    }
}

function toMillis(value) {
    if (!value) return 0;
    const dt = new Date(value);
    const ms = dt.getTime();
    return Number.isFinite(ms) ? ms : 0;
}

function shouldBeaconQueueItem(item, blockedKeys) {
    const idempotencyKey = String(item?.idempotency_key || "").trim();
    if (!idempotencyKey) return true;
    if (blockedKeys?.has(idempotencyKey)) return false;
    const queuedAtMs = toMillis(item?.queued_at);
    if (!queuedAtMs) return true;
    return Date.now() - queuedAtMs >= RECENT_QUEUE_GRACE_MS;
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
    mostrarCampoNombre = true,
    mostrarCampoTelefono = false,
    imagenReemplazoForm = "",
    isPreview = false,
    isTestMode = false,
    pasosNode = null,
    mediosPagoNode = null,
    reservedCode = "",
    reservationToken = "",
    codePrefix = "CL",
}) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [retryAttemptNonce, setRetryAttemptNonce] = useState(0);
    const [prefetchedCode, setPrefetchedCode] = useState(() => String(reservedCode || "").trim());
    const [activeReservationToken, setActiveReservationToken] = useState(() => String(reservationToken || "").trim());
    const sendingRef = useRef(false);
    const submittingLeadRef = useRef(false);
    const retryIndexRef = useRef(0);
    const retryTimerRef = useRef(null);
    const healthTimerRef = useRef(null);
    const pendingRetryAttemptRef = useRef(null);
    const inFlightLeadKeysRef = useRef(new Set());

    const trimmedName = useMemo(() => name.trim(), [name]);
    const trimmedPhone = useMemo(() => phone.trim(), [phone]);
    const normalizedPhone = useMemo(() => trimmedPhone.replace(/\D/g, "").slice(0, 15), [trimmedPhone]);
    const showNameField = mostrarFormulario && mostrarCampoNombre !== false;
    const showPhoneField = mostrarFormulario && mostrarCampoTelefono === true;

    useEffect(() => {
        setPrefetchedCode(String(reservedCode || "").trim());
    }, [reservedCode]);

    useEffect(() => {
        setActiveReservationToken(String(reservationToken || "").trim());
    }, [reservationToken]);

    useEffect(() => {
        if (!pendingRetryAttemptRef.current) return;
        clearRetryAttempt();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name, phone]);

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
                username: "",
                nombre: trimmedName,
                contacto: normalizedPhone,
            }),
        [whatsappTemplate, bonusText, trimmedName, normalizedPhone]
    );
    const whatsappUrl = useMemo(() => buildWhatsappUrl(whatsappNumber, messageText), [whatsappNumber, messageText]);

    const isNameValid = trimmedName.length > 1;
    const isPhoneValid = normalizedPhone.length >= 6;
    const canSubmit =
        Boolean(landingToken) &&
        (
            mostrarFormulario
                ? (
                    (showNameField && showPhoneField && (isNameValid || isPhoneValid)) ||
                    (showNameField && !showPhoneField && isNameValid) ||
                    (!showNameField && showPhoneField && isPhoneValid) ||
                    (!showNameField && !showPhoneField)
                )
                : true
        );

    const clearRetryAttempt = () => {
        pendingRetryAttemptRef.current = null;
        setRetryAttemptNonce((value) => value + 1);
    };

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
        if (isPreview || isTestMode) return undefined;
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
            queue.filter((item) => shouldBeaconQueueItem(item, inFlightLeadKeysRef.current)).slice(0, 20).forEach((item) => {
                sendWithBeacon(baseUrl, item);
            });
        };
        const handlePageHide = () => {
            const queue = loadQueue();
            if (!queue.length) return;
            const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
            queue.filter((item) => shouldBeaconQueueItem(item, inFlightLeadKeysRef.current)).slice(0, 20).forEach((item) => {
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
    }, [isPreview, isTestMode]);

    useEffect(() => {
        if (isPreview || isTestMode) return undefined;
        if (!landingToken || prefetchedCode) return undefined;
        let cancelled = false;

        const reserveCode = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
                const { data } = await axios.post(
                    `${baseUrl}/clientes/reservar-codigo/`,
                    { landing_token: landingToken },
                    { timeout: 5000 }
                );
                if (!cancelled) {
                    setPrefetchedCode(String(data?.codigo || "").trim());
                    setActiveReservationToken(String(data?.reservation_token || "").trim());
                }
            } catch {
                // fallback to frontend-generated code on submit
            }
        };

        reserveCode();
        return () => {
            cancelled = true;
        };
    }, [isPreview, isTestMode, landingToken, prefetchedCode]);

    const enqueueClient = (payload) => {
        const queue = loadQueue();
        if (payload?.idempotency_key && queue.some((item) => item?.idempotency_key === payload.idempotency_key)) {
            return true;
        }
        queue.push(payload);
        const stored = saveQueue(queue);
        scheduleRetry();
        return stored;
    };

    const notifyLeadAccepted = () => {
        markClientesDirty();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("leads:refresh"));
            try {
                localStorage.setItem("leads_dirty", "1");
                localStorage.setItem("leads_refresh_ts", String(Date.now()));
            } catch {
                // ignore storage errors
            }
        }
    };

    const showValidationError = () => {
        if (isPreview) return;
        if (!canSubmit) {
            if (showNameField && showPhoneField && !(isNameValid || isPhoneValid)) {
                setError("Ingresá un nombre válido.");
            } else if (showNameField && !showPhoneField && !isNameValid) {
                setError("Ingresa un nombre valido.");
            } else if (!showNameField && showPhoneField && !isPhoneValid) {
                setError("Ingresa un telefono valido.");
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
        clearRetryAttempt();
    };

    const handleWhatsappClick = () => {
        if (isPreview) return;
        if (!canSubmit) {
            if (showNameField && showPhoneField && !(isNameValid || isPhoneValid)) {
                setError("Ingresá un nombre válido.");
            } else if (showNameField && !showPhoneField && !isNameValid) {
                setError("Ingresa un nombre valido.");
            } else if (!showNameField && showPhoneField && !isPhoneValid) {
                setError("Ingresa un telefono valido.");
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
        clearRetryAttempt();

        const fbp = getCookieValue("_fbp") || undefined;
        const fbc = getCookieValue("_fbc") || undefined;
        const tracking = getTrackingParams();
        const eventSourceUrl =
            typeof window !== "undefined"
                ? `${window.location.origin}${window.location.pathname}`
                : undefined;

        const generatedCodigo = generateLeadCode(codePrefix);
        const generatedUsername = buildUsername(trimmedName, generatedCodigo);

        const messageWithCodigo = renderWhatsappMessage(whatsappTemplate, {
            bono: bonusText || "100%",
            username: generatedUsername,
            nombre: trimmedName,
            contacto: normalizedPhone,
            codigo: generatedCodigo,
        });
        const currentWhatsappUrl = buildWhatsappUrl(whatsappNumber, messageWithCodigo);

        if (isTestMode) {
            navigateToWhatsapp(currentWhatsappUrl);
            return;
        }

        const payload = {
            idempotency_key: generateIdempotencyKey(),
            queued_at: new Date().toISOString(),
            landing_token: landingToken,
            nombre: trimmedName,
            contacto: normalizedPhone,
            username: generatedUsername,
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

        navigateToWhatsapp(currentWhatsappUrl);
        if (typeof onWhatsappOpened === "function") {
            onWhatsappOpened();
        }
    };

    const handleWhatsappClickSafe = async () => {
        if (isPreview || submittingLeadRef.current || isSubmitting) return;
        if (!canSubmit) {
            showValidationError();
            return;
        }
        if (!whatsappNumber) {
            showValidationError();
            return;
        }

        submittingLeadRef.current = true;
        setIsSubmitting(true);
        try {
            const fbp = getCookieValue("_fbp") || undefined;
            const fbc = getCookieValue("_fbc") || undefined;
            const tracking = getTrackingParams();
            const eventSourceUrl =
                typeof window !== "undefined"
                    ? `${window.location.origin}${window.location.pathname}`
                    : undefined;

            const generatedCodigo = prefetchedCode || generateLeadCode(codePrefix);
            const generatedUsername = buildUsername(trimmedName, generatedCodigo);
            
            const messageWithCodigo = renderWhatsappMessage(whatsappTemplate, {
                bono: bonusText || "100%",
                username: generatedUsername,
                nombre: trimmedName,
                contacto: normalizedPhone,
                codigo: generatedCodigo,
            });
            const currentWhatsappUrl = buildWhatsappUrl(whatsappNumber, messageWithCodigo);

            if (isTestMode) {
                navigateToWhatsapp(currentWhatsappUrl);
                return;
            }

            const reservedWindow = openReservedWindow();
            const payload = pendingRetryAttemptRef.current?.payload || {
                idempotency_key: generateIdempotencyKey(),
                queued_at: new Date().toISOString(),
                landing_token: landingToken,
                ...(activeReservationToken ? { reservation_token: activeReservationToken } : {}),
                nombre: trimmedName,
                contacto: normalizedPhone,
                username: generatedUsername,
                codigo: generatedCodigo,
                ...(fbp ? { fbp } : {}),
                ...(fbc ? { fbc } : {}),
                ...Object.fromEntries(Object.entries(tracking).filter(([, value]) => Boolean(value))),
                ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
            };

            const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
            inFlightLeadKeysRef.current.add(payload.idempotency_key);

            let shouldEnqueueFallback = false;
            try {
                await axios.post(`${baseUrl}/clientes/`, payload, {
                    timeout: PRIMARY_SUBMIT_TIMEOUT_MS,
                });
                removeQueuedClient(payload.idempotency_key);
                notifyLeadAccepted();
            } catch {
                shouldEnqueueFallback = true;
                enqueueClient(payload);
                checkQueueHealth();
            }

            setPrefetchedCode("");
            setActiveReservationToken("");
            clearRetryAttempt();
            setError("");

            navigateToWhatsapp(currentWhatsappUrl, reservedWindow);

            if (shouldEnqueueFallback) {
                tryFlushQueue();
            }

            if (typeof onWhatsappOpened === "function") {
                onWhatsappOpened();
            }
        } finally {
            inFlightLeadKeysRef.current.clear();
            submittingLeadRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleNameChange = (event) => {
        const value = event.target.value;
        const onlyLetters = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
        setName(onlyLetters);
        if (error) setError("");
    };

    const handlePhoneChange = (event) => {
        const value = event.target.value.replace(/[^\d+\s()-]/g, "");
        setPhone(value);
        if (error) setError("");
    };

    return (
        <div
            className={`form-leads-panel flex flex-col items-center rounded-[28px] backdrop-blur-[2px] shadow-xl my-2 transition-all duration-300 ${mostrarFormulario ? "" : "justify-center"}`}
            style={{ backgroundColor: resolvedFormBg, fontFamily: formTextFontStack, position: "relative", overflow: "hidden" }}
        >
            {mostrarFormulario && (
                <h3
                    className='text-white text-xl lg:text-2xl my-1'
                    style={{ fontFamily: formTextFontStack, fontSize: buildResponsiveFontSize(1.5 * resolvedFormSize, 0.8, 4.6), fontWeight: resolvedFormWeight }}
                >
                    Contactanos
                </h3>
            )}

            {mostrarFormulario ? (
                <>
                    <Stack spacing={0.75} direction="column" className="form-leads-stack">
                        {showNameField ? (
                            <TextField
                                className='textfield'
                                required={!showPhoneField}
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
                                    "& .MuiInputBase-input": { color: "#fff", fontFamily: formTextFontStack, fontSize: buildResponsiveFontSize(resolvedFormSize, 0.82, 3.8), fontWeight: resolvedFormWeight },
                                }}
                            />
                        ) : null}
                        {showPhoneField ? (
                            <TextField
                                className='textfield'
                                required={!showNameField}
                                id="telefono"
                                label="Telefono"
                                variant="outlined"
                                fullWidth
                                value={phone}
                                onChange={handlePhoneChange}
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
                                    "& .MuiInputBase-input": { color: "#fff", fontFamily: formTextFontStack, fontSize: buildResponsiveFontSize(resolvedFormSize, 0.82, 3.8), fontWeight: resolvedFormWeight },
                                }}
                            />
                        ) : null}
                    </Stack>
                    {error ? (
                        pendingRetryAttemptRef.current ? (
                            <button
                                key={retryAttemptNonce}
                                type="button"
                                onClick={handleWhatsappClickSafe}
                                className='text-amber-300 text-xs mt-2 underline decoration-dotted underline-offset-4'
                                style={{ fontFamily: formTextFontStack, fontSize: `${0.8 * resolvedFormSize}rem`, fontWeight: resolvedFormWeight }}
                            >
                                {error}
                            </button>
                        ) : (
                            <span className='text-red-400 text-xs mt-2' style={{ fontFamily: formTextFontStack, fontSize: `${0.8 * resolvedFormSize}rem`, fontWeight: resolvedFormWeight }}>{error}</span>
                        )
                    ) : null}
                </>
            ) : (
                imagenReemplazoForm ? (
                    <div className="w-full flex justify-center mb-2 px-2">
                        <img src={imagenReemplazoForm} alt="Placeholder" className="form-leads-replacement-image" />
                    </div>
                ) : null
            )}
            <div className={`landing-submit-wrap ${canSubmit ? "is-active" : ""}`}>
                <Button variant="contained" startIcon={<WhatsAppIcon />}
                    onClick={handleWhatsappClickSafe}
                    disabled={isPreview || !canSubmit || isSubmitting}
                    sx={{
                        backgroundColor: "transparent",
                        marginTop: "14px",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "20px",
                        padding: "12px 26px",
                        fontWeight: resolvedButtonWeight,
                        fontSize: buildResponsiveFontSize(resolvedButtonSize, 0.78, 4.1),
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
                    {isSubmitting ? "Redirigiendo..." : finalButtonText}
                </Button>
            </div>
            <span className='font-bold text-md mt-4 text-center' style={{ color: infoColor || "#ffffff", fontFamily: infoFontStack, fontSize: buildResponsiveFontSize(resolvedInfoSize, 0.8, 3.6), fontWeight: resolvedInfoWeight }}>{finalInfoText}</span>
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
