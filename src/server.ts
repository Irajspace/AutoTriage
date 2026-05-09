import {app} from "./app.js"

const port =Number(process.env.PORT)|3000
const host = process.env.HOST || '0.0.0.0';
const start=async()=>{
    try{
        await app.listen({port,host});
        console.log(`Server is running on ${port}`)
    }
    catch(err){
        app.log.error(err);
        process.exit(1);
    }
}
start();