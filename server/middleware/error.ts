import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";

export const ErrorMiddleware=(err:any, req:Request, res:Response, next:NextFunction)=>{
    err.statusCode=err.statusCode||500;
    err.message=err.message||'Internal err';

    //Wrong mongodb id
    if(err.name==='CastError'){
        const mesage=`Resource not found. invallid ${err.path}`;
        err=new ErrorHandler(mesage, 400);
    }

    //duplicate key err
    if(err.code===11000){
        const mesage=`Duplicate ${Object.keys(err.keyValue)} entered`;
        err = new ErrorHandler(mesage,400);
    }

    //wrong jwt error
    if (err.name === "JsonWebTokenError") {
        const message = `Json web token is invalid, try again`;
        err = new ErrorHandler(message, 400);
    }

    //JWT expired error
    if (err.name === "TokenExpiredError") {
        const message = `Json web token is expired, try again`;
        err = new ErrorHandler(message, 400);
    }

    res.status(err.statusCode).json({
        success: false,
        message: err.message,
    });
}

