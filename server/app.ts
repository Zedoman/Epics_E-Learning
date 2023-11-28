require('dotenv').config();
import express, { NextFunction, Request, Response } from "express";
export const app = express(); 
import cors from "cors";
import cookieParser from "cookie-parser";
import {ErrorMiddleware} from './middleware/error';
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";
import orderRouter from './routes/order.route';
import notificationRoute from './routes/notification.route';
import analyticsRouter from './routes/analytics.route';
import layoutRouter from './routes/layout.route';

//we are using redis to maintain our cache
//so when let we open netflix and many crores of users are logging in at the same time and this will degrde or slow the server so for this developrs cache some data
//so cache also gets slow sometimes in case of very heavy users so we have o maintain cache
//so in redis what wee will do is those who are using their account freq only there datas will be cached in redis rest will be deleted who are not using for weeks months. so we can get fast data
//so when the user after weeks or months logging in at that time they will see that "your login is expires, Please login again".
//after login ession will again set for weeks. And the users who are using or log in evry day there session will also be updates everyday basis.
// for every reload we are updating the session expire. so when user not login and not getting refresh session is also not getting updated and expires after weeks or days.




//body parser
app.use(express.json({limit: "50mb"}));
//router is like switching to tabs
//cookie parser
app.use(cookieParser());

//cors=> cross origin rsourse sharing
app.use(cors({
    origin: process.env.ORIGIN
}));

// Routes
app.use('/api/v1', userRouter ,courseRouter , orderRouter, notificationRoute, analyticsRouter, layoutRouter);


//testing api
app.get("/test", (req:Request,res:Response,next:NextFunction)=>{
   res.status(200).json({
    success:true,
    message:"Api is working",
   });
});

//unknown route
app.all("*", (req:Request,res:Response,next:NextFunction)=>{
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode=404;
    next(err);
});


app.use(ErrorMiddleware);