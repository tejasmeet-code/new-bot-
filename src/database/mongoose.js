const mongoose = require('mongoose');

async function connectToDatabase() {
    if (!process.env.MONGODB_URI) {
        console.warn('MONGODB_URI is not defined in .env! Database connection skipped. Some features may not work.');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
    }
}

module.exports = { connectToDatabase };
