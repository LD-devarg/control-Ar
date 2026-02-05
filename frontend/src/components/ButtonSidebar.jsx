import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

function ButtonSidebar({ label, startIcon, onClick, className = '', sx, ...props }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const baseColor = isDarkMode ? '#6b7280' : '#1f2937';
  const hoverColor = isDarkMode ? '#ffffff' : '#000000';

  return (
    <Button
      variant="text"
      className={`Button ${className}`.trim()}
      onClick={onClick}
      startIcon={startIcon}
      sx={{
        '& .MuiButton-startIcon .MuiSvgIcon-root': {
          fontSize: 20,
          color: `${baseColor} !important`,
          transition: 'color 0.2s ease',
        },
        '& .button-text': {
          color: `${baseColor} !important`,
          transition: 'color 0.2s ease',
        },
        '&:hover .MuiButton-startIcon .MuiSvgIcon-root': {
          color: `${hoverColor} !important`,
        },
        '&:hover .button-text': {
          color: `${hoverColor} !important`,
        },
        ...sx,
      }}
      {...props}
    >
      <span className="button-text">{label}</span>
    </Button>
  );
}

export default ButtonSidebar;
