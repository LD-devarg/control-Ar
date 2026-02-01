import Badge from '@mui/material/Badge';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import '../assets/css/NuevoLeadAlert.css';


export default function SimpleBadge() {
  return (
    <div className='alerta-lead'>
        <Badge badgeContent={4} color="primary">
            <PendingActionsOutlinedIcon color="action" />
        </Badge>
    </div>
  );
}