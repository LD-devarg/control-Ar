import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';

function User() {
    return (
        <div className="flex items-center cursor-pointer text-sm text-black dark:text-white gap-2">
            <AccountCircleOutlinedIcon />
            <span>Nombre de Usuario</span>
        </div>    
    );
}

export default User;