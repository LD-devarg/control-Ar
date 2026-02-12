import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "../assets/css/Filter.css";
import FilterDatePicker from "./DatePicker";

function Filter({ period, onPeriodChange, desde, hasta, onDesdeChange, onHastaChange }) {
    return (
        <div className="flex flex-col gap-4 items-end w-full"> 
            <div>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <div className="color flex items-center gap-2">
                            <Button
                                variant="outlined"
                                className={period === "day" ? "active" : ""}
                                onClick={() => onPeriodChange?.("day")}
                            >
                                Dia
                            </Button>
                            <Button
                                variant="outlined"
                                className={period === "week" ? "active" : ""}
                                onClick={() => onPeriodChange?.("week")}
                            >
                                Semana
                            </Button>
                            <Button
                                variant="outlined"
                                className={period === "month" ? "active" : ""}
                                onClick={() => onPeriodChange?.("month")}
                            >
                                Mes
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 border-l-2 border-gray-500 ps-2">
                            <FilterDatePicker label="Desde" value={desde} onChange={onDesdeChange} />
                            <FilterDatePicker label="Hasta" value={hasta} onChange={onHastaChange} />
                        </div>
                    </Stack>
                </LocalizationProvider>
            </div>
        </div>
    );
}

export default Filter;
