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
import CHOICE from '../model/choice.js';
import COMBO from '../model/combo.js';
import COMBO_GROUPS from '../model/comboGroup.js';
import CUSTOMER from '../model/customer.js'
import PAYMENT from '../model/paymentRecord.js'
import TRANSACTION from '../model/transaction.js';
import ACCOUNTS from '../model/account.js';
import SUPPLIER from '../model/supplier.js';
import INGREDIENT from '../model/ingredients.js'


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
  });``


export const syncComboGroup = ()=> withOnlineCheck(async () => {

    const unsycedComboGroup= await COMBO_GROUPS.find({ isSynced: false });
    

    if (!unsycedComboGroup.length) return;

    try {
      
      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/combo-group`, unsycedComboGroup);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsycedComboGroup.map(ct => ct._id);

      await COMBO_GROUPS.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('combo group synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})


export const syncCombo = () =>
  withOnlineCheck(async () => {
    const unSycnedCombo = await COMBO.find({ isSynced: false });
    if (!unSycnedCombo.length) return;
    try {
      // Step 1: Upload images & replace local paths with uploaded URLs
      for (const food of unSycnedCombo) {
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
      const payload = unSycnedCombo.map((f) => ({
        ...f.toObject(),
        image: f.image, // make sure image is updated
      }));

      const response = await axios.post(
        `${process.env.ONLNE_SERVER_URL}/combo`,
        payload
      );

      if (response.status === 200) {
        const ids = unSycnedCombo.map((ct) => ct._id);
        await COMBO.updateMany(
          { _id: { $in: ids } },
          { $set: { isSynced: true, syncedAt: new Date() } }
        );
        console.log("Combo synced..");
      }
    } catch (err) {
      console.error("Failed to sync Combo:", err.message);
    }
 });


 export const syncCustomer = ()=> withOnlineCheck(async () => {

    const unsyncedCustomer= await CUSTOMER.find({ isSynced: false });
    

    if (!unsyncedCustomer.length) return;

    try {
      
      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/customer`, unsyncedCustomer);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncedCustomer.map(ct => ct._id);

      await CUSTOMER.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Customer synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})


 export const syncOrders = ()=> withOnlineCheck(async () => {

    const unsyncedOrders= await ORDER.find({ isSynced: false });
    

    if (!unsyncedOrders.length) return;

    try {
      
      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/orders`, unsyncedOrders);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncedOrders.map(ct => ct._id);

      await ORDER.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Order synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})


 export const syncPaymnetRecords = ()=> withOnlineCheck(async () => {

    const unsycnedPayment = await PAYMENT.find({ isSynced: false });
    

    if (!unsycnedPayment.length) return;

    try {
      
      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/payment-record`,unsycnedPayment);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsycnedPayment.map(ct => ct._id);

      await PAYMENT.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Payment synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})



 export const syncTransaction = ()=> withOnlineCheck(async () => {

    const unsyncTransaction= await TRANSACTION.find({ isSynced: false });
    

    if (!unsyncTransaction.length) return;

    try {
      
      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/transaction`,unsyncTransaction);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncTransaction.map(ct => ct._id);

      await TRANSACTION.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Transaction synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})


 export const syncAccounts = ()=> withOnlineCheck(async () => {

    const unsyncedAccounts= await ACCOUNTS.find({ isSynced: false });
    

    if (!unsyncedAccounts.length) return;

    try {
      
      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/account`,unsyncedAccounts);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncedAccounts.map(ct => ct._id);

      await ACCOUNTS.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Account synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})


 export const syncSupplier = ()=> withOnlineCheck(async () => {

    const unsyncedSupplier= await SUPPLIER.find({ isSynced: false });
    

    if (!unsyncedSupplier.length) return;

    try {
      
      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/supplier`,unsyncedSupplier);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncedSupplier.map(ct => ct._id);

      await SUPPLIER.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('supplier synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})


 export const syncIngredients = ()=> withOnlineCheck(async () => {

    const unsyncedIngredient= await INGREDIENT.find({ isSynced: false });
    

    if (!unsyncedIngredient.length) return;

    try {
      
      const response = await axios.post(`${process.env.ONLNE_SERVER_URL}/ingredient`,unsyncedIngredient);
          if (response.status === 200) {
      // Bulk update all those docs in one go
      const ids = unsyncedIngredient.map(ct => ct._id);

      await INGREDIENT.updateMany(
        { _id: { $in: ids } },
        { $set: { isSynced: true, syncedAt: new Date() } }
      );

      console.log('Ingredient synced..');
    }
    } catch (err) {
      console.error(`Failed to sync`, err.message);
    }
})

