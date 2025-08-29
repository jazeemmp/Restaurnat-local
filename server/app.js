import express from 'express';
import cors from 'cors';
import http from "http";
import connectDB from './config/database.js'
import UserRouter from './routes/UserRouter.js'
import dotenv from 'dotenv';
import {  attachSocketToRequest } from './middleware/attachSocket.js';
import { initSocketServer}  from './config/socket.js'
import { syncAccounts, syncCategory, syncCombo, syncComboGroup, syncCustomer, syncCustomerTypes, syncFloors, syncFood, syncIngredients, syncKitchen, syncMenuType, syncOrders, syncPaymnetRecords, syncRestaurant, syncSupplier, syncTables, syncTransaction, syncUser, synNormalUser } from "./sync/syncWorker.js";




dotenv.config()
const app = express();


const port = process.env.PORT || 7000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));


app.use(attachSocketToRequest);

// Routers
app.use("/api/user", UserRouter);





// Run daily at midnight
// cron.schedule("0 0 * * *", autoRenewExpiredProductions);

// Global error handler
app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
});

// Async startup 
(async () => {
  try {
    await connectDB();

    setInterval(syncUser, 60 * 1000);
    setInterval(syncRestaurant, 60 * 1000)
    setInterval(syncCustomerTypes, 60 * 1000)
    setInterval(syncFloors, 60 * 1000)
    setInterval(syncTables, 60 * 1000)
    setInterval(syncKitchen, 60 * 1000)
    setInterval(synNormalUser, 60 * 1000)
    setInterval(syncCategory, 60 * 1000)
    setInterval(syncMenuType, 60 * 1000)
    setInterval(syncFood, 60 * 1000);
    setInterval(syncCombo, 60 * 1000)
    setInterval(syncComboGroup, 60 * 1000)
    setInterval(syncCustomer, 60 * 1000)
    setInterval(syncOrders, 60 * 1000)
    setInterval(syncPaymnetRecords, 60 * 1000)
    setInterval(syncTransaction, 60 * 1000)
    setInterval(syncAccounts, 60 * 1000)
    setInterval(syncSupplier, 60 * 1000)
    setInterval(syncIngredients, 60 * 1000)


    const httpServer = http.createServer(app);
    await initSocketServer(httpServer)


    httpServer.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error(" App failed to start:", error);
  }
})(); 