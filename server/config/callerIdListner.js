import HID from 'node-hid';
import CUSTOMER from '../model/customer.js'
import CALLER_NOTIFICATION from '../model/callerNotification.js'
import { getIO } from '../config/socket.js'




//  Find connected Caller ID device automatically
function findCallerIdDevice() {
  const devices = HID.devices();
  return devices.find(
    (d) =>
      (d.manufacturer && d.manufacturer.toLowerCase().includes("oscar")) ||
      (d.product && d.product.toLowerCase().includes("caller")) ||
      (d.product && d.product.toLowerCase().includes("cid"))
  );
}

// 2️⃣ Start listening for calls
export function startCallerIdListener() {
  const devInfo = findCallerIdDevice();

  if (!devInfo) {
    console.log("Caller ID device not detected.");
    return;
  }

  console.log("Caller ID Device Found:", devInfo);

  const device = new HID.HID(devInfo.path);

  device.on("data", async (data) => {
    try {
      const ascii = data.toString("ascii").replace(/\0/g, "");
      const match = ascii.match(/(\+?\d{7,15})/);
      if (!match) return;

      const phone = match[1];
      const incoming = phone.replace(/\D/g, "");
       console.log("📞 Incoming Call:", phone);

      // 3️ Check if customer exists
      let customer = await CUSTOMER.findOne({ normalPhone: incoming });

         if (!customer) {
        customer = await CUSTOMER.findOne({
          normalPhone: new RegExp(incoming.slice(-8) + "$"),
        });
      }

         // Build notification object
      const notificationData = {
        phone,
        isNewCustomer: !customer,
      };

      if (customer) {
        notificationData.customerId = customer._id;
      }

      const notification = await CALLER_NOTIFICATION.create(notificationData);

      // 4️ Emit socket event
        const io = getIO();
      io.to("posCaller").emit("caller_notification", notification);

      console.log(" Notification saved & emitted:", notificationData);
    } catch (error) {
      console.error("Caller ID Error:", error);
    }
  });

  device.on("error", (err) => {
    console.error("HID Error:", err);
  });
}