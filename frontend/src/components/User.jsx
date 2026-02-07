import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import { useEffect, useState } from "react";
import { getCurrentUser } from "../services/auth";

function User() {
    const [username, setUsername] = useState("Usuario");

    useEffect(() => {
        const user = getCurrentUser();
        if (user?.username) {
            setUsername(user.username);
        }
    }, []);

    return (
        <div className="flex items-center cursor-pointer text-sm text-black dark:text-white gap-2">
            <AccountCircleOutlinedIcon />
            <span>{username}</span>
        </div>    
    );
}

export default User;
