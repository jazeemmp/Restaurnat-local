import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  // mobile: {
  //   type: String,
  // },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
        isSynced: { type: Boolean, default: false },
      syncedAt: { type: Date }
},{
    timestamps:true
});

const partnerModel = mongoose.model("Partner", partnerSchema);
export default partnerModel;
