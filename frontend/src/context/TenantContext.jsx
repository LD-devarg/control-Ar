import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchEmpresas } from "../services/empresas/empresas";
import {
  getActiveTenantId,
  getUserEmpresa,
  isSuperuser,
  isPauta,
  isAdminOrganizacional,
  setActiveTenantId,
  clearActiveTenant,
} from "../services/tenant";
import { getCurrentUser } from "../services/auth";

const TenantContext = createContext(null);

function resolveUserFeatures(user) {
  const mode = user?.operating_mode || "full";
  const defaultFeatures = {
    bonos: mode === "full",
    retiros: mode === "full",
    net_metrics: mode === "full",
    ftd_only: mode === "ftd_only",
  };
  if (!user?.features || typeof user.features !== "object") {
    return defaultFeatures;
  }
  return {
    ...defaultFeatures,
    ...user.features,
  };
}

function normalizeTenantOptions(items = []) {
  return (items || []).map((item) => ({
    id: Number(item.id),
    nombre: item.nombre || `Empresa #${item.id}`,
    activo: Boolean(item.activo),
    operating_mode: item.operating_mode || "full",
  }));
}

export function TenantProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const [tenantOptions, setTenantOptions] = useState([]);
  const [tenantId, setTenantIdState] = useState(() => {
    const current = getCurrentUser();
    if (!current) return null;
    if (isSuperuser(current) || isPauta(current) || isAdminOrganizacional(current)) {
      return getActiveTenantId() || getUserEmpresa(current);
    }
    return getUserEmpresa(current);
  });
  const [loading, setLoading] = useState(false);

  const isUserSuperuser = Boolean(isSuperuser(user));
  const isUserPauta = Boolean(isPauta(user));
  const isUserAdminOrganizacional = Boolean(isAdminOrganizacional(user));
  const selectedTenant = useMemo(
    () => tenantOptions.find((item) => Number(item.id) === Number(tenantId)) || null,
    [tenantOptions, tenantId]
  );
  const operatingMode = selectedTenant?.operating_mode || "full";
  const features = useMemo(() => resolveUserFeatures({ operating_mode: operatingMode }), [operatingMode]);
  const canSelectTenant = isUserSuperuser || isUserPauta || isUserAdminOrganizacional;

  const setTenantId = useCallback(
    (nextId) => {
      if (!canSelectTenant) return;
      const parsed = Number(nextId);
      if (Number.isNaN(parsed)) return;
      setTenantIdState(parsed);
      setActiveTenantId(parsed);
      window.dispatchEvent(new CustomEvent("tenant:changed", { detail: { tenantId: parsed } }));
    },
    [canSelectTenant]
  );

  useEffect(() => {
    const syncUser = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener("auth:user-changed", syncUser);
    return () => window.removeEventListener("auth:user-changed", syncUser);
  }, []);

  useEffect(() => {
    if (!user) {
      setTenantOptions([]);
      setTenantIdState(null);
      clearActiveTenant();
      return;
    }

    if (!isUserSuperuser && isUserPauta) {
      const allowed = Array.isArray(user?.empresas_permitidas)
        ? user.empresas_permitidas.map((item) => ({
            id: Number(item.id),
            nombre: item.nombre || `Empresa #${item.id}`,
            activo: Boolean(item.activo),
          }))
        : [];
      setTenantOptions(allowed);

      const storedId = getActiveTenantId();
      const userEmpresa = getUserEmpresa(user);
      const fallbackId = storedId || userEmpresa || allowed[0]?.id || null;
      const validId = allowed.some((item) => item.id === fallbackId)
        ? fallbackId
        : allowed[0]?.id || null;

      setTenantIdState(validId);
      if (validId) {
        setActiveTenantId(validId);
        window.dispatchEvent(new CustomEvent("tenant:changed", { detail: { tenantId: validId } }));
      } else {
        clearActiveTenant();
      }
      return;
    }

    if (!isUserSuperuser && isUserAdminOrganizacional) {
      let mounted = true;
      const loadOrgEmpresas = async () => {
        setLoading(true);
        try {
          const empresas = await fetchEmpresas();
          if (!mounted) return;
          const normalized = normalizeTenantOptions(empresas);
          setTenantOptions(normalized);
          const storedId = getActiveTenantId();
          const userEmpresa = getUserEmpresa(user);
          const fallbackId = storedId || userEmpresa || normalized[0]?.id || null;
          const validId = normalized.some((item) => item.id === fallbackId)
            ? fallbackId
            : normalized[0]?.id || null;
          setTenantIdState(validId);
          if (validId) {
            setActiveTenantId(validId);
            window.dispatchEvent(new CustomEvent("tenant:changed", { detail: { tenantId: validId } }));
          } else {
            clearActiveTenant();
          }
        } catch {
          if (!mounted) return;
          setTenantOptions([]);
          setTenantIdState(null);
          clearActiveTenant();
        } finally {
          if (mounted) setLoading(false);
        }
      };
      loadOrgEmpresas();
      return () => {
        mounted = false;
      };
    }

    if (!isUserSuperuser) {
      const fixedEmpresa = getUserEmpresa(user);
      setTenantOptions(
        fixedEmpresa
          ? [{
              id: fixedEmpresa,
              nombre: `Empresa #${fixedEmpresa}`,
              activo: true,
              operating_mode: user?.empresa_operating_mode || "full",
            }]
          : []
      );
      setTenantIdState(fixedEmpresa);
      if (fixedEmpresa) {
        setActiveTenantId(fixedEmpresa);
        window.dispatchEvent(new CustomEvent("tenant:changed", { detail: { tenantId: fixedEmpresa } }));
      } else {
        clearActiveTenant();
      }
      return;
    }

    let mounted = true;
    const loadOptions = async () => {
      setLoading(true);
      try {
        const empresas = await fetchEmpresas();
        if (!mounted) return;
        const normalized = normalizeTenantOptions(empresas);
        setTenantOptions(normalized);

        const storedId = getActiveTenantId();
        const userEmpresa = getUserEmpresa(user);
        const fallbackId = storedId || userEmpresa || normalized[0]?.id || null;
        const validId = normalized.some((item) => item.id === fallbackId)
          ? fallbackId
          : normalized[0]?.id || null;

        setTenantIdState(validId);
        if (validId) {
          setActiveTenantId(validId);
          window.dispatchEvent(new CustomEvent("tenant:changed", { detail: { tenantId: validId } }));
        } else {
          clearActiveTenant();
        }
      } catch {
        if (!mounted) return;
        setTenantOptions([]);
        setTenantIdState(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOptions();
    return () => {
      mounted = false;
    };
  }, [user, isUserSuperuser, isUserPauta, isUserAdminOrganizacional]);

  const value = useMemo(
    () => ({
      tenantId,
      tenantOptions,
      loading,
      isSuperuser: isUserSuperuser,
      canSelectTenant,
      operatingMode,
      features,
      setTenantId,
    }),
    [
      tenantId,
      tenantOptions,
      loading,
      isUserSuperuser,
      canSelectTenant,
      operatingMode,
      features,
      setTenantId,
    ]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant debe usarse dentro de TenantProvider.");
  }
  return context;
}
