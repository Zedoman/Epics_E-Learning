import { Response } from "express";
import userModel from "../models/user.model"
import { redis } from "../utils/redis";

export const getUserById = async (id: string, res: Response) => {
    //so the user is used as json 
    const userJson = await redis.get(id);//a using redis why to find from mongodb lets use redis there

    if (userJson) {
        const user = JSON.parse(userJson);
        res.status(201).json({
            success: true,
            userJson,
        });
    }




};