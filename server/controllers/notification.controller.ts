import NotificationModel from "../models/notificationModel";
import { NextFunction,Response,Request } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import cron from 'node-cron'


// get all notification --only admin
export const getNotifications = CatchAsyncError( async(req:Request, res: Response, next: NextFunction) => {
    try {
        const notifications = await NotificationModel.find().sort({createdAt: -1})

        res.status(201).json({
            success:true,
            notifications
        })
        
    } catch (error:any) {
        return next(new ErrorHandler(error.message,500))
    }
})

// update notification status --only admin

export const updateNotification = CatchAsyncError(async (req:Request, res:Response, next:NextFunction) => {
    try {
        const notification = await NotificationModel.findById(req.params.id);

        if(!notification){
            return next(new ErrorHandler("Notification not found",404))

        }else{
            notification.status ? notification.status = 'read' : notification.status
        }

        await notification.save();

        const notifications = await NotificationModel.find().sort({createdAt: -1})

        res.status(201).json({
            success:true,
            notifications
        })

        
    } catch (error:any) {
        return next(new ErrorHandler(error.message,500))
    }
})


// delete notification --only admin
//cron helps to schedully delete the notifications
// # ┌────────────── second (optional)
// # │ ┌──────────── minute
// # │ │ ┌────────── hour
// # │ │ │ ┌──────── day of month
// # │ │ │ │ ┌────── month
// # │ │ │ │ │ ┌──── day of week
// # │ │ │ │ │ │
// # │ │ │ │ │ │
// # * * * * * *
//deletion after every 30 days 
//everyday at midnight we are calling so 000 ***
cron.schedule("0 0 0 * * * ", async() =>{
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); //30 days 24 hrs 60 min and sec 1000 milli sec
    await NotificationModel.deleteMany({status:'read',createdAt:{$lt: thirtyDaysAgo}})
    console.log('Deleted read notifications')
})