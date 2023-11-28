import express from 'express';
import { activateUser, getUserInfo, loginUser, logoutUser, registrationUser, socialAuth, updateAccessToken, updatePassword, updateProfilePicture, updateUserInfo, getAllUser, updateUserRole, deleteUser } from '../controllers/user.controller';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';


const userRouter = express.Router();

userRouter.post('/registration', registrationUser);
userRouter.post('/activate-user', activateUser);
userRouter.post('/login', loginUser);
userRouter.get('/logout', isAuthenticated,authorizeRoles("admin"),logoutUser);
userRouter.get("/refresh",updateAccessToken); //refrsh token means usr is logged in or not and each time generates new access token and refresh token. after logout also access token and refresh token changes
userRouter.get('/me',isAuthenticated,getUserInfo); //details of user or lead user
userRouter.post('/social-auth',socialAuth); //will get email name avatar from frontend
userRouter.put("/update-user-info",isAuthenticated,updateUserInfo); //if we want to change name or anythin
userRouter.put("/update-user-password",isAuthenticated,updatePassword); //if forgot pass and reset it
userRouter.put("/update-user-avatar",isAuthenticated,updateProfilePicture);
userRouter.get(
	'/get-users',
	isAuthenticated,
	authorizeRoles('admin'),
	getAllUser
);

userRouter.put(
	'/update-user',
	isAuthenticated,
	authorizeRoles('admin'),
	updateUserRole
);

userRouter.delete(
	'/delete-user/:id',
	isAuthenticated,
	authorizeRoles('admin'),
	deleteUser
);


export default userRouter;