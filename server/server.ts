import { connect } from "http2";
import connectDB from "./utils/db";
import {app} from "./app";
require("dotenv").config();
const port=process.env.PORT;

import {v2 as cloudinary} from "cloudinary";

// cloudinary config for the image web X64 image req

cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.CLOUD_API_KEY,
    api_secret:process.env.CLOUD_SECRET_KEY
})



//create server
app.listen(port, ()=>{
    console.log(`connected at ${port}`);
    connectDB();
});
