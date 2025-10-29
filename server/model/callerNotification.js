import mongoose from "mongoose";

const notifiationSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index:true
  },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        default: null,
    },
     isNewCustomer: { type: Boolean, default: false },
      isRead: { type: Boolean, default: false },
        isSynced: { type: Boolean, default: false },
},{
    timestamps:true
});

const callerNotificationModel = mongoose.model("Callernotification", notifiationSchema);
export default callerNotificationModel;
