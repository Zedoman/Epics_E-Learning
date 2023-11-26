require("dotenv").config();
import { Request, Response, NextFunction} from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import { getUserById } from "../services/user.services";
// import TokenBlackListModel from "../models/token_blacklist.model";
import cloudinary from "cloudinary";
// Register user
interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email already exist", 400));
      }

      const user: IRegistrationBody = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);

      const activationCode = activationToken.activationCode;

      // const newUser = new userModel({
      //   name:user.name,
      //   avatar:user.avatar,
      //   email:user.email,
      //   password:user.password,
      //   activationToken
      // })

      // await newUser.save();
      
      const data = {
        user: { name: user.name },
        activationCode
      };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "activation-mail.ejs",
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check you email: ${user.email} to activate your account`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);


interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (
  user: any
): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: "5m" }
  );
  return { token, activationCode };
};


interface IActivationRequest{
  activation_token:string;
  activation_code:string;
}

export const activateUser = CatchAsyncError(async(req:Request, res:Response, next:NextFunction)=>{
  try {
    const {activation_token, activation_code}= req.body as IActivationRequest;
    
    //const isBlacklistToken= await TokenBlackListModel.find({token:activation_token});

    // if(isBlacklistToken){
    //   console.log(isBlacklistToken);
    //   return next(new ErrorHandler("jwt expired", 400))
    // }
    

    //check for valid activision code snt to email is same or not
    const newUser:{ user: IUser, activationCode:string } = jwt.verify(
       activation_token,
       process.env.ACTIVATION_SECRET as Secret
       ) as { user:IUser, activationCode:string}
 
       if(newUser.activationCode !== activation_code){
          return next(new ErrorHandler("Invalid activation code", 400))
       }

       const {name, email, password}= newUser.user;
       
       const existUser = await userModel.findOne({email})
       
       if(existUser){
        return next(new ErrorHandler("Email already exist", 400))
       }

       const user=await userModel.create({
        name,
        email,
        password,
       })

       res.status(201).json({
        success: true,
       });

      // let updatedUser= await userModel.findByIdAndUpdate(userDetails._id,{isVerified:true}, {new:true})
      
      // //blacklist token
      // const blacklist = new TokenBlackListModel({
      //   token:activation_token,
      //   expireAt: new Date().setHours(new Date().getHours()+1) // date after one hr
      // }) 

      // await blacklist.save()
      //  res.json({
      //   success:true,
      //   message:'Account activated successfully',
      //   data:updatedUser
      // })


      } catch (error:any) {
    return next(new ErrorHandler(error.message, 400))
  }
}
);

//login user
interface ILoginRequest{
  email:string;
  password:string;
}

export const loginUser=CatchAsyncError(async(req:Request, res:Response, next:NextFunction)=>{
  try{
    const { email, password } = req.body as ILoginRequest;
     
    if(!email || !password){
      return next(new ErrorHandler("Enter email or pass", 400));
    };

    const user = await userModel.findOne({email}).select("+password");
    if(!user){
      return next(new ErrorHandler("Invalid email or pass", 400))
     }

     const isPasswordMatch=await user.comparePassword(password);
     if(!isPasswordMatch){
      return next(new ErrorHandler("Invalid email or pass", 400))
     }

     sendToken(user,200,res);



  }catch(error:any){
    return next(new ErrorHandler(error.message, 400));
  }
});


//logout user
export const logoutUser=CatchAsyncError(async(req:Request, res:Response, next:NextFunction)=> {
  try{
    res.cookie("access_token", "", {maxAge: 1});
    res.cookie("refresh_token", "", {maxAge: 1});
    //delete cache from redis from upstash data browser
    const userId = req.user?._id || '';
    redis.del(userId)
    res.status(200).json({
      success:true,
      message: "Logged out seccssfully"
    })
  }catch(error:any){
    return next(new ErrorHandler(error.message, 400));
  }
});  


//update access token as it is updating every 5min
export const updateAccessToken = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

  try {
      const refresh_token = req.cookies.refresh_token as string;
      const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload; //rfresh token verified or not

      const message = "Could not refresh token";
      //refresh token invalid or expired
      if (!decoded) {
          return next(new ErrorHandler(message, 400))
      }
      const session = await redis.get(decoded.id as string);
      if (!session) {
          return next(new ErrorHandler(message, 400))
      }

      const user = JSON.parse(session);
      //make access token expires in 5min
      const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN as string, {
          expiresIn: "5m",
      })
      //refresh token expire in 3day
      const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as string,
          {
              expiresIn: "3d",
          })

      req.user = user; //set user
      //update cookie wth new token
      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);
      res.status(200).json({
          status: "success",
          accessToken
      })

  } catch (error: any) {

      return new ErrorHandler(error.message, 400)
  }
})

// get user info

export const getUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

  try {

      const userId = req.user?._id;
      getUserById(userId, res);

  } catch (error: any) {

      return next(new ErrorHandler(error.message, 400));
  }

})



interface IsocialAuthBody {
  email: string;
  name: string;
  avatar: string;

}


//social auth for this password is not rquired 

export const socialAuth = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

  try {

      const { email, name, avatar } = req.body as IsocialAuthBody;
      const user = await userModel.findOne({ email });

      if (!user) {
          const newUser = await userModel.create({ email, name, avatar });
          sendToken(newUser, 200, res);
      } else {
          sendToken(user, 200, res);
      }

  } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
  }
})


//update user info

interface IUpdateUserInfo {
  name?: string;
  email: string;

}
export const updateUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

  try {
      const { name, email } = req.body as IUpdateUserInfo;
      const userId = req.user?._id;
      const user = await userModel.findById(userId)

      if (email && user) {
          const isEmailExist = await userModel.findOne({ email });
          if (isEmailExist) {
              return next(new ErrorHandler("Email already exist", 400))
          }

          user.email = email;
      }

      if (name && user) {
          user.name = name;
      }

      await user?.save();
      await redis.set(userId, JSON.stringify(user));//update redis user id

      res.status(201).json({
          success: true,
          user,
      })
  } catch (error: any) {

      return next(new ErrorHandler(error.message, 400))
  }
})


//update user password
interface IUpadatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
      const { oldPassword, newPassword } = req.body as IUpadatePassword;

      if (!oldPassword || !newPassword) {
          return next(new ErrorHandler("Please enter old and new password", 400))
      }

      const user = await userModel.findById(req.user?._id).select("+password");

      if (user?.password == undefined) {
          return next(new ErrorHandler("Invalid user", 400))
      }
      const isPasswordMatch = await user?.comparePassword(oldPassword);
      if (!isPasswordMatch) {

          return next(new ErrorHandler("Invalid old password", 400));
      }
      user.password = newPassword;

      await user.save();
      await redis.set(req.user?._id, JSON.stringify(user))
      res.status(201).json({
          success: true,
          user,
      })
  } catch (error: any) {

      return next(new ErrorHandler(error.message, 400));
  }
})


// update profile picture

interface IUpdateProfilePicture{
  avatar: string;
}

export const updateProfilePicture = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {

      const { avatar } = req.body;
      const userId = req.user?.id;
      const user = await userModel.findById(userId);
      

      if (avatar && user) {
          // if user have one avatar then call this if
          if (user?.avatar.public_id) {

              // first delete the old image 
              await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
              const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                  folder: "avatars",
                  width: 150,
              });

              user.avatar = {
                  public_id: myCloud.public_id,
                  url: myCloud.secure_url
              }
          } else {
              const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                  folder: "avatars",
                  width: 150,
              });

              user.avatar = {
                  public_id: myCloud.public_id,
                  url: myCloud.secure_url
              }
          }
      } 

      await user?.save();
      await redis.set(userId, JSON.stringify(user));
      res.status(201).json({
        success: true,
        user,
    })

  } catch (error: any) {

      return next(new ErrorHandler(error.message, 400))
  }
})