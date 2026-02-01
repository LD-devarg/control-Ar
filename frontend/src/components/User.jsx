import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import '../assets/css/User.css';

function User() {
    return (
        <div className="user-logged">
            <AccountCircleOutlinedIcon />
            <span className="user-name">Nombre de Usuario</span>
        </div>    
    );
}

export default User;