import CALLER_NOTIFICATION from '../../model/callerNotification.js';
import USER from '../../model/userModel.js'

export const getCallerNotifications = async (req, res,next) => {
  try {

     const user = await USER.findById(req.user).lean();
    if (!user) return res.status(400).json({ message: "User not found!" });


    const notifications = await CALLER_NOTIFICATION.find()
      .populate({
        path: "customerId",
        select: "name mobileNo address", // only include these fields
      })
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({
      data: notifications,
    });
  } catch (err) {
    next(err)
  }
};