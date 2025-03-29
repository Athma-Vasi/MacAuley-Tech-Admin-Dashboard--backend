import mongoose from "mongoose";

import type { Config } from "./index";

async function connectDB(config: Config) {
    const { MONGO_URI } = config;
    try {
        await mongoose.connect(MONGO_URI);
    } catch (error) {
        console.error(error);
    }
}

export { connectDB };
