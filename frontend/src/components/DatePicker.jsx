import * as React from 'react';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

export function DatePickerDesde() {
  const [value, setValue] = React.useState(dayjs());

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label="Desde"
        value={value}
        onChange={(newValue) => setValue(newValue)}
        slotProps={{
          textField: {
            fullWidth: false,
            size: 'small',
            className: 'filter-date-picker',
            sx: {
              /* Texto de la fecha */
              '& .MuiPickersSectionList-root': {
                color: '#fff',
                width: 'auto',
                minWidth: 0,
              },

              /* Borde */
              '& .MuiPickersOutlinedInput-notchedOutline': {
                borderColor: '#fff',
              },

              '&:hover .MuiPickersOutlinedInput-notchedOutline': {
                borderColor: '#9e9e9e',
              },

              '&.Mui-focused .MuiPickersOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
              },

              /* Label */
              '& .MuiInputLabel-root': {
                color: '#fff',
              },

              '& .MuiInputLabel-root.Mui-focused': {
                color: '#1976d2',
              },

              /* Icono calendario */
              '& .MuiSvgIcon-root': {
                color: '#fff',
              },

              '& .MuiInputBase-root': {
                backgroundColor: 'rgba(255,255,255,0.03)',
              },
            },
          },
        }}
      />
    </LocalizationProvider>
  );
}

export function DatePickerHasta() {
  const [value, setValue] = React.useState(dayjs());

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label="Hasta"
        value={value}
        onChange={(newValue) => setValue(newValue)}
        slotProps={{
          textField: {
            fullWidth: false,
            size: 'small',
            className: 'filter-date-picker',
            sx: {
              /* Texto de la fecha */
              '& .MuiPickersSectionList-root': {
                color: '#fff',
                width: 'auto',
                minWidth: 0,
              },

              /* Borde */
              '& .MuiPickersOutlinedInput-notchedOutline': {
                borderColor: '#fff',
              },

              '&:hover .MuiPickersOutlinedInput-notchedOutline': {
                borderColor: '#9e9e9e',
              },

              '&.Mui-focused .MuiPickersOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
              },

              /* Label */
              '& .MuiInputLabel-root': {
                color: '#fff',
              },

              '& .MuiInputLabel-root.Mui-focused': {
                color: '#1976d2',
              },

              /* Icono calendario */
              '& .MuiSvgIcon-root': {
                color: '#fff',
              },

              '& .MuiInputBase-root': {
                backgroundColor: 'rgba(255,255,255,0.03)',
              },
            },
          },
        }}
      />
    </LocalizationProvider>
  );
}
