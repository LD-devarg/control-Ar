import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "../assets/css/Filter.css";
import FilterDatePicker from "./DatePicker";

function Filter({ period, usePeriod = true, onPeriodChange, desde, hasta, onDesdeChange, onHastaChange }) {
    const periodButtonSx = (active) => ({
        minWidth: 80,
        fontWeight: 700,
        borderColor: active ? "#3b82f6" : "rgba(59,130,246,0.5)",
        color: active ? "#fff" : "#60a5fa",
        backgroundColor: active ? "rgba(37, 99, 235, 0.85)" : "transparent",
        "&:hover": {
            borderColor: "#60a5fa",
            backgroundColor: active ? "rgba(37, 99, 235, 0.95)" : "rgba(59,130,246,0.12)",
        },
    });

    return (
        <div className="flex flex-col gap-3 items-stretch sm:items-end w-full"> 
            <div className="w-full sm:w-auto">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{ alignItems: { xs: "stretch", sm: "center" } }}
                    >
                        <div className="color flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <Button
                                variant={usePeriod && period === "day" ? "contained" : "outlined"}
                                onClick={() => onPeriodChange?.("day")}
                                sx={periodButtonSx(usePeriod && period === "day")}
                            >
                                Dia
                            </Button>
                            <Button
                                variant={usePeriod && period === "week" ? "contained" : "outlined"}
                                onClick={() => onPeriodChange?.("week")}
                                sx={periodButtonSx(usePeriod && period === "week")}
                            >
                                Semana
                            </Button>
                            <Button
                                variant={usePeriod && period === "month" ? "contained" : "outlined"}
                                onClick={() => onPeriodChange?.("month")}
                                sx={periodButtonSx(usePeriod && period === "month")}
                            >
                                Mes
                            </Button>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-t sm:border-t-0 sm:border-l-2 border-gray-500 pt-2 sm:pt-0 sm:ps-2">
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
