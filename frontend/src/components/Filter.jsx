import Stack from "@mui/material/Stack";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import "../assets/css/Filter.css";
import { DatePickerDesde, DatePickerHasta } from "./DatePicker";

const operadores = ["Operador 1", "Operador 2", "Operador 3"];


function Filter() {
    return (
        <div className="filter-bar-container"> 
            <div>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <div className="filter-bar-buttons">
                        <Button variant="outlined" className="filter-bar-button">Día</Button>
                        <Button variant="outlined" className="filter-bar-button">Semana</Button>
                        <Button variant="outlined" className="filter-bar-button">Mes</Button>
                    </div>
                    <div className="filter-bar-dates">
                        <DatePickerDesde />
                        <DatePickerHasta />
                    </div>
                    <div className="filter-bar-operator">
                            <Stack spacing={2} className="form-stack">
                            <Autocomplete
                            disablePortal
                            id="combo-box-demo"
                            options={operadores}
                            defaultValue={null}
                            className="form-autocomplete"
                            renderInput={(params) => <TextField {...params} label="Operador" />}
                            />
                            </Stack>
                    </div>
                </Stack>
            </div>
        </div>
    );
}

export default Filter;

