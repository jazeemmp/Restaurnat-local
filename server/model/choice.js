import mongoose from "mongoose";

const choiceSchema = new mongoose.Schema(
  {
    name: { type: String },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdBy: {
          type:String,
      },
            isSynced: { type: Boolean, default: false },
      syncedAt: { type: Date }
    

  },
  {
    timestamps: true,
  }
);

choiceSchema.index(
  { name: 1, restaurantId: 1}
);

const choiceModel = mongoose.model("Choice", choiceSchema);

export default choiceModel;