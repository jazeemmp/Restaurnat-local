import Agenda from "agenda";
import mongoose from "mongoose";
import KOT_NOTIFICATION from '../model/kotNotification.js'
import { getIO } from '../config/socket.js'



const agenda = new Agenda({ db: { address: process.env.MONGO_URI_CLOUD || 'mongodb://127.0.0.1:27017/Restaurant-pos' } });

// Job to update KOT status
agenda.define("mark kot as ready", async (job) => {
  const { kotId } = job.attrs.data;
  const kot = await KOT_NOTIFICATION.findById(kotId);
  if (kot && kot.status === 'Pending') {
    kot.status = 'Ready';
    kot.preparedAt = new Date();
    await kot.save();
    console.log(`KOT ${kotId} marked as Ready`);


       const io = getIO();
      io.to(`kitchen:${kot.kitchenId}`).emit('kot_status_update', kot);

  }
});

agenda.define("reject kot after 24 hours", async (job) => {
  const { kotId } = job.attrs.data;
  const kot = await KOT_NOTIFICATION.findById(kotId);
  if (kot && kot.status === 'Pending') {
    kot.status = 'Rejected';
    await kot.save();
    console.log(`KOT ${kotId} marked as Rejected (after 24h)`);

       const io = getIO();
      io.to(`kitchen:${kot.kitchenId}`).emit('kot_status_update', kot);
    
  }
});

// Start Agenda
(async function () { 
  await agenda.start();
})();

export default agenda;
  