import Badge from '@mui/material/Badge';
import MarkChatUnreadOutlinedIcon from '@mui/icons-material/MarkChatUnreadOutlined';
import '../assets/css/NuevoLeadAlert.css';


export default function SimpleBadge() {
  return (
    <div className='alerta-lead'>
        <Badge badgeContent={4} color="primary">
            <MarkChatUnreadOutlinedIcon color="action" />
        </Badge>
    </div>
  );
}