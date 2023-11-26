import { connect } from "http2";
import connectDB from "./utils/db";
import {app} from "./app";
require("dotenv").config();
const port=process.env.PORT;
//create server
app.listen(port, ()=>{
    console.log(`connected at ${port}`);
    connectDB();
});
