require("dotenv").config();
import { Request, Response, NextFunction} from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { sendToken } from "../utils/jwt";
// import TokenBlackListModel from "../models/token_blacklist.model";

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
    res.status(200).json({
      success:true,
      message: "Logged out seccssfully"
    })
  }catch(error:any){
    return next(new ErrorHandler(error.message, 400));
  }
});  