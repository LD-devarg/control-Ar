import { useEffect, useState } from "react";
import Page from "../layouts/Page.jsx";
import Card from "../components/Card";
import { apiClient } from "../services/auth";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";

const POLL_MS = 15000;

function formatStatus(value) {
  if (value === true) return "OK";
  if (value === false) return "FAIL";
  return "N/A";
}

function Health() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: response } = await apiClient.get("/health/");
        if (mounted) setData(response);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Page title="Health">
      <div className="flex gap-5 w-9/10 border-b-1 justify-between border-t-1 dark:border-zinc-500 pb-4 pt-4">
        <Card
          title="Backend"
          value={loading ? "..." : formatStatus(true)}
          sizeHeight={"h-20"}
          sizeWidth={"w-45 lg:w-70"}
          icon={<HealthAndSafetyOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Base de Datos"
          value={loading ? "..." : formatStatus(data?.database?.ok)}
          sizeHeight={"h-20"}
          sizeWidth={"w-45 lg:w-70"}
          icon={<StorageOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Celery Broker"
          value={loading ? "..." : formatStatus(data?.celery?.ok)}
          sizeHeight={"h-20"}
          sizeWidth={"w-45 lg:w-70"}
          icon={<HubOutlinedIcon fontSize="small" />}
        />
        <Card
          title="Worker"
          value={loading ? "..." : formatStatus(data?.worker?.ok)}
          sizeHeight={"h-20"}
          sizeWidth={"w-45 lg:w-70"}
          icon={<DnsOutlinedIcon fontSize="small" />}
        />
      </div>
      <div className="flex gap-5 w-9/10 border-b-1 justify-evenly border-t-1 dark:border-zinc-500 pb-4 pt-4">
        <Card
          title="Beat"
          value={loading ? "..." : formatStatus(data?.beat?.ok)}
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-50"}
          icon={<ScheduleOutlinedIcon fontSize="small" />}
        />
        <Card
          title="React"
          value="OK"
          sizeHeight={"h-20"}
          sizeWidth={"w-40 lg:w-50"}
          icon={<HealthAndSafetyOutlinedIcon fontSize="small" />}
        />
      </div>
    </Page>
  );
}

export default Health;
