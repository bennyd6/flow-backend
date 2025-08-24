const mongoose=require('mongoose');

const MONGO_URI="mongodb+srv://cadheshbenny:41F0DWxjffEDLE8x@flow.stwnceb.mongodb.net/?retryWrites=true&w=majority&appName=flow"


const connectToMongo = () => {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("MongoDB Connected...."))
        .catch((e) => {
            console.error("MongoDB connection error:", e);
        });
};


module.exports=connectToMongo