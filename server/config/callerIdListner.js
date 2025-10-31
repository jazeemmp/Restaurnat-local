import HID from 'node-hid';
import CUSTOMER from '../model/customer.js'
import CALLER_NOTIFICATION from '../model/callerNotification.js'
import { getIO } from '../config/socket.js'
import config from '../config/callerIdConfig.json' with { type: "json" };





//  Find connected Caller ID device automatically
function findCallerIdDevice() {
  const devices = HID.devices();

  // 1 Match vendorId + productId
  let devInfo = devices.find(
    (d) =>
      d.vendorId === config.callerId.vendorId &&
      d.productId === config.callerId.productId
  );

  // 2 Fallback: match by keywords (for other models)
  if (!devInfo) {
    const keywords = config.callerId.fallbackKeywords.map(k => k.toLowerCase());
    devInfo = devices.find(
      (d) =>
        (d.product && keywords.some(k => d.product.toLowerCase().includes(k))) ||
        (d.manufacturer && keywords.some(k => d.manufacturer.toLowerCase().includes(k)))
    );
  }

  if (devInfo) {
    console.log(" Caller ID Device Found:", {
      vendorId: devInfo.vendorId,
      productId: devInfo.productId,
    });
  } else {
    console.log("No Caller ID device found!");
  }

  return devInfo;
}

// 2 Start listening for calls
export function startCallerIdListener() {
  const devInfo = findCallerIdDevice();

  if (!devInfo) {
    console.log("Caller ID device not detected.");
    return;
  }


  const device = new HID.HID(devInfo.path);
  

let dataBuffer = '';
let lastProcessedNumber = '';
let lastProcessedTime = 0;

device.on("data", async (data) => {
  try {
    const ascii = data.toString("ascii");
    dataBuffer += ascii;
    
    // Log raw data for debugging
    // console.log("Raw HID Data:", JSON.stringify(ascii));
    
    // Look for complete number patterns in the accumulated buffer
    const numberMatch = dataBuffer.match(/(\d{10,15})/);
    
    if (numberMatch) {
      const rawNumber = numberMatch[1];
      const cleanNumber = rawNumber.replace(/\D/g, '');
      
      // Validate number length and check for duplicates
      const now = Date.now();
      if (cleanNumber.length >= 10 && cleanNumber.length <= 15) {
        // Debouncing: ignore same number within 5 seconds
        if (cleanNumber !== lastProcessedNumber || (now - lastProcessedTime) > 5000) {
          // console.log("Complete Number Found:", cleanNumber);
          // console.log("Full Buffer:", JSON.stringify(dataBuffer));
          
          lastProcessedNumber = cleanNumber;
          lastProcessedTime = now;
          
          // Process the call
          await processIncomingCall(cleanNumber);
        } else {
          console.log("Ignoring duplicate number:", cleanNumber);
        }
      }
      
      // Clear the buffer after successful extraction
      dataBuffer = '';
    }
    
    // Prevent buffer from growing too large
    if (dataBuffer.length > 100) {
      console.log("Buffer overflow, resetting");
      dataBuffer = '';
    }
    
  } catch (error) {
    console.error("Caller ID Error:", error);
    dataBuffer = ''; // Reset on error
  }
});

// Separate function to process the call
async function processIncomingCall(incoming) {
  try {
    console.log("Processing Call:", incoming);
    
    let customer = await CUSTOMER.findOne({ normalPhone: incoming });
    if (!customer) {
      customer = await CUSTOMER.findOne({ 
        normalPhone: new RegExp(incoming.slice(-8) + "$") 
      });
    }
    
    const notificationData = {
      phone: `+971${incoming}`,
      isNewCustomer: !customer,
    };
    
    if (customer) {
      notificationData.customerId = customer._id;
    }
    
    const notification = await CALLER_NOTIFICATION.create(notificationData);
    const io = getIO();
    io.to("posCaller").emit("caller_notification", notification);
    
    console.log("Notification saved & emitted:");
    
  } catch (error) {
    console.error("Caller Processing Error:", error);
  }
}

  device.on("error", (err) => {
    console.error("HID Error:", err);
  });
}