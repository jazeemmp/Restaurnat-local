import mongoose  from "mongoose";
import axios from "axios";
import USER from '../model/userModel.js'
import RESTAURANT from '../model/restaurant.js';
import CUSTOMER_TYPES from '../model/customerTypes.js';
import FLOORS from '../model/floor.js';
import TABLE from '../model/tables.js'
import ORDER from '../model/oreder.js';
import KITCHEN from '../model/kitchen.js';
import CATEGORY from '../model/category.js';
import FOOD from '../model/food.js';
import MENU_TYPE from '../model/menuType.js';
import CHOICE from '../model/choice.js'
import path from 'path';
import fs from 'fs';
import FormData from "form-data";
import isOnline from 'is-online'
import dotenv from 'dotenv';
dotenv.config();




const withOnlineCheck = async (fn) => {
  const online = await isOnline();
  if (!online) {
    console.log("No internet connection. Skipping sync...");
    return;
  }
  console.log("Internet connected");
  return fn();
};

export const syncUser = ()=>withOnlineCheck( async () => {
    const unsyncedUser = await USER.findOne({ isSynced: false, role: 'CompanyAdmin' });
    if (!unsyncedUser) return;

    try {
      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/admin`, unsyncedUser);
      if (response.status === 200) {
        await USER.updateOne(
          { _id: unsyncedUser._id },
          { $set: { isSynced: true, syncedAt: new Date() } }
        );
      }
      console.log('company admin synced..')
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})

export const syncRestaurant = ()=> withOnlineCheck(async () => {

    const unsyncedRestaurant = await RESTAURANT.findOne({ isSynced: false });
    if (!unsyncedRestaurant) return;

    try {

        if (unsyncedRestaurant.logo) {
        const localPath = path.join(process.cwd(), unsyncedRestaurant.logo.replace(/^\//, ""));
        if (fs.existsSync(localPath)) {
          const formData = new FormData();
          formData.append("file", fs.createReadStream(localPath));

          const uploadRes = await axios.post(
            `${process.env.ONLNE_SERVER_URL}/upload`,
            formData,
            { headers: formData.getHeaders() }
          );

          if (uploadRes.data?.path) {
            unsyncedRestaurant.logo = `${process.env.ONLNE_SERVER_URL.replace(
              "/sync",
              ""
            )}${uploadRes.data.path}`;
          }
        }
      }

      // Step 2: Send updated restaurant document
      const payload = unsyncedRestaurant.toObject();

      const response = await axios.post(
        `${process.env.ONLNE_SERVER_URL}/restaurant`,
        payload
      );

      if (response.status === 200) {
        await RESTAURANT.updateOne(
          { _id: unsyncedRestaurant._id },
          { $set: { isSynced: true, syncedAt: new Date() } }
        );
      }
      console.log('Restaurant synced..')
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})



export const syncCustomerTypes = ()=> withOnlineCheck(async () => {

    const unsyncedCustomerTypes= await CUSTOMER_TYPES.find({ isSynced: false });
    if (!unsyncedCustomerTypes.length) return;

    try {

      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/customer-types`, unsyncedCustomerTypes);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncedCustomerTypes.map(ct => ct._id);

      await CUSTOMER_TYPES.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );
       console.log(' Customer Types synced..');
    }
    
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})


export const syncFloors = ()=> withOnlineCheck(async () => {

    const unsyncedFloors= await FLOORS.find({ isSynced: false });
    if (!unsyncedFloors.length) return;

    try {

      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/floors`, unsyncedFloors);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncedFloors.map(ct => ct._id);

      await FLOORS.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Floors synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})



export const syncTables = ()=> withOnlineCheck(async () => {

    const unsyncedTables= await TABLE.find({ isSynced: false });
    if (!unsyncedTables.length) return;

    try {

      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/tables`, unsyncedTables);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncedTables.map(ct => ct._id);

      await TABLE.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Tables synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})

export const syncKitchen = ()=> withOnlineCheck(async () => {

    const unsyncedKitchen= await KITCHEN.find({ isSynced: false });
    if (!unsyncedKitchen.length) return;

    try {

      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/kitchen`, unsyncedKitchen);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncedKitchen.map(ct => ct._id);

      await KITCHEN.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Kitchen synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})

export const synNormalUser = ()=> withOnlineCheck(async () => {

    const unsyncedUser1= await USER.find({ isSynced: false , role: { $ne: "CompanyAdmin" } });
    if (!unsyncedUser1.length) return;

    try {

      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/normal-user`, unsyncedUser1);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncedUser1.map(ct => ct._id);

      await USER.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Normal user synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})

export const syncCategory = ()=> withOnlineCheck(async () => {

    const unsyncedCategory= await CATEGORY.find({ isSynced: false });
    if (!unsyncedCategory.length) return;

    try {

      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/category`, unsyncedCategory);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncedCategory.map(ct => ct._id);

      await CATEGORY.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Category synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})


export const syncMenuType = ()=> withOnlineCheck(async () => {

    const unsycMenuType= await MENU_TYPE.find({ isSynced: false });
    if (!unsycMenuType.length) return;

    try {

      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/menu-type`, unsycMenuType);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsycMenuType.map(ct => ct._id);

      await MENU_TYPE.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Menu type synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})





export const syncFood = () =>
  withOnlineCheck(async () => {
    const unsyncedFood = await FOOD.find({ isSynced: false });
    if (!unsyncedFood.length) return;
    try {
      // Step 1: Upload images & replace local paths with uploaded URLs
      for (const food of unsyncedFood) {
        if (food.image) {
          const localPath = path.join(process.cwd(), food.image.replace(/^\//, "")); 
         

          if (fs.existsSync(localPath)) {
            const formData = new FormData();
            formData.append("file", fs.createReadStream(localPath));

            const uploadRes = await axios.post(
              `${process.env.ONLNE_SERVER_URL}/upload`,
              formData,
              { headers: formData.getHeaders() }
            );
         

         if (uploadRes.data?.path) {
          food.image = `${process.env.ONLNE_SERVER_URL.replace("/sync","")}${uploadRes.data.path}`; // prepend server URL
     
        }
          }
        }
      }

      // Step 2: Send updated food documents
      const payload = unsyncedFood.map((f) => ({
        ...f.toObject(),
        image: f.image, // make sure image is updated
      }));

      const response = await axios.post(
        `${process.env.ONLNE_SERVER_URL}/food`,
        payload
      );

      if (response.status === 200) {
        const ids = unsyncedFood.map((ct) => ct._id);
        await FOOD.updateMany(
          { _id: { $in: ids } },
          { $set: { isSynced: true, syncedAt: new Date() } }
        );
        console.log("Food synced successfully");
      }
    } catch (err) {
      console.error("Failed to sync food:", err.message);
    }
  });

