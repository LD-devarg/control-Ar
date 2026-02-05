import Badge from '@mui/material/Badge';
import MarkChatUnreadOutlinedIcon from '@mui/icons-material/MarkChatUnreadOutlined';


export default function SimpleBadge() {
  return (
    <div className='flex items-center cursor-pointer text-black dark:text-white gap-3 text-sm mr-5'>
        <Badge 
        badgeContent={4}  
        sx={{
          '& .MuiBadge-badge': {
            backgroundColor: '#FF3D00',
            color: 'inherit',
          },

        }}>
            <MarkChatUnreadOutlinedIcon 
            sx={{
              fontSize: "1.5rem",
              color: 'inherit',
            }}
            />
        </Badge>
    </div>
  );
}