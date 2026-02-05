import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTheme } from '@mui/material/styles';

export default function FilterDatePicker({ label, value, onChange }) {
  const theme = useTheme();
  const inputColor = theme.palette.mode === 'dark' ? '#f5f5f5' : '#171717';

  return (
    <DatePicker
      label={label}
      value={value}
      onChange={onChange}
      slotProps={{
        textField: {
          fullWidth: false,
          size: 'small',
          className: 'filter-date-picker',
          sx: {
            '& .MuiPickersSectionList-root': {
              color: inputColor,
              width: 'auto',
              minWidth: 0,
            },
            '& .MuiPickersOutlinedInput-notchedOutline': {
              borderColor: inputColor,
            },
            '&:hover .MuiPickersOutlinedInput-notchedOutline': {
              borderColor: '#9e9e9e',
            },
            '&.Mui-focused .MuiPickersOutlinedInput-notchedOutline': {
              borderColor: '#1976d2',
            },
            '& .MuiInputLabel-root': {
              color: inputColor,
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#1976d2',
            },
            '& .MuiSvgIcon-root': {
              color: inputColor,
            },
            '& .MuiInputBase-root': {
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            },
          },
        },
      }}
    />
  );
}
