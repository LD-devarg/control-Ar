import { useState } from "react";
import dayjs from "dayjs";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "../assets/css/Filter.css";
import FilterDatePicker from "./DatePicker";

function Filter() {
    const [desde, setDesde] = useState(dayjs());
    const [hasta, setHasta] = useState(dayjs());

    return (
        <div className="flex flex-col gap-4 p-2 align-center items-center border-b-1 dark:border-zinc-500 w-full"> 
            <div>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <div className="color flex items-center gap-2">
                            <Button variant="outlined">Dia</Button>
                            <Button variant="outlined">Semana</Button>
                            <Button variant="outlined">Mes</Button>
                        </div>
                        <div className="flex items-center gap-2 border-l-2 border-gray-500 ps-2">
                            <FilterDatePicker label="Desde" value={desde} onChange={setDesde} />
                            <FilterDatePicker label="Hasta" value={hasta} onChange={setHasta} />
                        </div>
                    </Stack>
                </LocalizationProvider>
            </div>
        </div>
    );
}

export default Filter;
