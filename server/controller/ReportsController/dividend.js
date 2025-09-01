import PARTNER from '../../model/partner.js';
import mongoose from 'mongoose';
import USER from '../../model/userModel.js'
import TRANSACTION from '../../model/transaction.js'
import ExcelJS from 'exceljs';
import EXPENSE from '../../model/expense.js'
import PAYMENT_RECORD from '../../model/paymentRecord.js'
import PURCHASE from '../../model/purchase.js'
import ACCOUNTS from '../../model/account.js'
import PARTNER_DIVIDEND_PAYOUT from '../../model/dividentPay.js'
import { generateUniqueRefId } from '../POS controller/posOrderCntrl.js'



export const addPartner = async (req, res, next) => {
  try {
    const { name, percentage } = req.body;

      const userId = req.user;
      
    // Validate user
    const user = await USER.findOne({ _id: userId }).lean();
    if (!user) return res.status(400).json({ message: "User not found" });


    if(!name){
        return res.status(400).json({ message:'Name is required!'})
    }

    // if(!mobile){
    //     return res.status(400).json({ message:'Mobile is required!'})
    // }

     if(!percentage){
        return res.status(400).json({ message:'Percentage is required!'})
    }

    const existPartner = await PARTNER.findOne({ name });
    if(existPartner){
        return res.status(400).json({ message:'Partner already exists!'})
    }

    

    // Ensure total percentage does not exceed 100
    const totalPercentage = await PARTNER.aggregate([
      { $group: { _id: null, total: { $sum: "$percentage" } } },
    ]);

    const currentPercentage = totalPercentage[0]?.total || 0;
    if (currentPercentage + percentage > 100) {
      return res
        .status(400)
        .json({ message: "Total partner percentage cannot exceed 100%" });
    }

    const partner = await PARTNER.create({ name, percentage ,isSynced:false });

    return res.status(201).json({ message: "Partner added successfully", partner });
  } catch (err) {
    next(err);
  }
};



export const getPartners = async(req,res,next)=>{
    try {

         const userId = req.user;
         
        // Validate user
        const user = await USER.findOne({ _id: userId }).lean();
        if (!user) return res.status(400).json({ message: "User not found" });

        const partner = await PARTNER.find({ })

        return res.status(400).json({ data:partner})



        
    } catch (err) {
        next(err)
    }
}


export const updatePartner = async (req, res, next) => {
  try {
    
    const {partnerId, name, percentage } = req.body;
      const userId = req.user;
      
    // Validate user
    const user = await USER.findOne({ _id: userId }).lean();
    if (!user) return res.status(400).json({ message: "User not found" });

    const partner = await PARTNER.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    // Check total percentage does not exceed 100 when updating
    const totalPercentage = await PARTNER.aggregate([
      { $match: { _id: { $ne: partner._id } } },
      { $group: { _id: null, total: { $sum: "$percentage" } } },
    ]);

    const currentPercentage = totalPercentage[0]?.total || 0;
    if (percentage != null && currentPercentage + percentage > 100) {
      return res
        .status(400)
        .json({ message: "Total partner percentage cannot exceed 100%" });
    }

    partner.name = name || partner.name;
    partner.percentage = percentage || partner.percentage;
    partner.isSynced = false;

    await partner.save();

    return res.status(200).json({ message: "Partner updated successfully", partner });
  } catch (err) {
    next(err);
  }
};



export const deletePartner = async (req, res, next) => {
  try {
    const { partnerId } = req.params;

    const userId = req.user;

    // Validate user
    const user = await USER.findOne({ _id: userId }).lean();
    if (!user) return res.status(400).json({ message: "User not found" });

    const partner = await PARTNER.findByIdAndDelete(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    return res.status(200).json({ message: "Partner deleted successfully" });
  } catch (err) {
    next(err);
  }
};



//divident report 
export const getDividendSharingReport = async (req, res, next) => {
  try {


    const { fromDate, toDate,search } = req.query;

    const user = await USER.findById(req.user).lean();
    if (!user) return res.status(400).json({ message: "User not found!" });

    let allocateLoss = true ;

    const start = fromDate ? new Date(fromDate) : new Date("2000-01-01");
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);


    // === SALES (Revenue) ===
    const paymentsAgg = await PAYMENT_RECORD.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalBeforeVAT: { $sum: "$beforeVat" }
        }
      }
    ]);
    const revenueBeforeVAT = paymentsAgg[0]?.totalBeforeVAT || 0;

    // === COGS (Purchases) ===
    const purchasesAgg = await PURCHASE.aggregate([
      { $match: {  createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalCOGS: { $sum: "$totalBeforeVAT"}
        }
      }
    ]);
    const cogs = purchasesAgg[0]?.totalCOGS || 0;

        const ExpenseAgg = await EXPENSE.aggregate([
      { $match: {  createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          OperatingExpenses: { $sum: "$totalBeforeVAT"}
        }
      }
    ]);
    const totalOperatingExpenses = ExpenseAgg[0]?.OperatingExpenses || 0;

    const grossProfit = revenueBeforeVAT - cogs;
    const netProfit = grossProfit - totalOperatingExpenses;

     const partnerFilter = {};
    if (search) {
      partnerFilter.name = { $regex: search, $options: "i" }; // case-insensitive
    }


    // === PARTNERS ===
    const partners = await PARTNER.find(partnerFilter).lean();

    // Decide distributable base: losses are ignored unless allocateLoss=true
    const netBase = (allocateLoss === "true") ? netProfit : Math.max(netProfit, 0);

    const partnerShares = partners.map((p) => ({
      partnerId: p._id,
      name: p.name,
      percentage: p.percentage,
      amount: Number(((netBase * (p.percentage || 0)) / 100).toFixed(2))
    }));

    return res.status(200).json({ data:partnerShares, netProfit });

  } catch (err) {
    next(err);
  }
};


export const takePartnerDividend = async (req, res, next) => {
  try {
    const user = await USER.findById(req.user).lean();
    if (!user) return res.status(400).json({ message: "User not found!" });

    const {
      partnerId,
      fromDate,
      toDate,
      amount,
      // paymentModeId,
      note
    } = req.body;

    if(!partnerId){
        return res.status(400).json({ message:"Partner Id is required!"})
    }
        if(!fromDate){
        return res.status(400).json({ message:"fromDate is required!"})
    }
        if(!toDate){
        return res.status(400).json({ message:"toDate is required!"})
    }
        if(!amount){
        return res.status(400).json({ message:"Amount  is required!"})
    }
    //     if(!paymentModeId){
    //     return res.status(400).json({ message:"Payment mode is required!"})
    // }

  

    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    const partner = await PARTNER.findById(partnerId).lean();
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

            // === Prevent overlapping periods for this partner ===
        // const overlapping = await PARTNER_DIVIDEND_PAYOUT.findOne({
        //   partnerId: partner._id,
        //   status: "Paid",
        //   $or: [
        //     { periodFrom: { $lte: end }, periodTo: { $gte: start } }  // overlap condition
        //   ]
        // });

        // if (overlapping) {
        //   return res.status(400).json({
        //     message: `Dividend already paid for overlapping period: ${overlapping.periodFrom.toISOString().slice(0,10)} to ${overlapping.periodTo.toISOString().slice(0,10)}`
        //   });
        // }


    // SALES (Revenue) from PAYMENT_RECORD: use beforeVat
    const paymentsAgg = await PAYMENT_RECORD.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalBeforeVAT: { $sum: "$beforeVat" } } }
    ]);
    const revenueBeforeVAT = paymentsAgg[0]?.totalBeforeVAT || 0;

    // COGS (Purchases) from PURCHASE: use totalBeforeVAT
    const purchasesAgg = await PURCHASE.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalCOGS: { $sum: "$totalBeforeVAT" } } }  // << uses totalBeforeVAT
    ]);
    const cogs = purchasesAgg[0]?.totalCOGS || 0;

    // Operating Expenses from EXPENSE: sum expenseItems totalBeforeVAT
   const ExpenseAgg = await EXPENSE.aggregate([
      { $match: {  createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          OperatingExpenses: { $sum: "$totalBeforeVAT"}
        }
      }
    ]);
    const totalOperatingExpenses = ExpenseAgg[0]?.OperatingExpenses || 0;

    const grossProfit = revenueBeforeVAT - cogs;
    const netProfit = grossProfit - totalOperatingExpenses;

    // If there is a loss, do not allow dividend payout (common practice)
    if (netProfit <= 0) {
      return res.status(400).json({ message: "No dividend available: period net profit is 0" });
    }

    // === 2) Compute partner's eligible share for the period ===
    const eligibleAmount = Number(((netProfit * (partner.percentage || 0)) / 100).toFixed(2));

    // === 3) Check how much the partner already took in this period ===
   const paidAgg = await PARTNER_DIVIDEND_PAYOUT.aggregate([
  {
    $match: {
      partnerId: partner._id,
      status: "Paid",
      periodFrom: { $lte: end },
      periodTo: { $gte: start }
    }
  },
  { $group: { _id: null, taken: { $sum: "$amount" } } }
]);
    const alreadyTaken = paidAgg[0]?.taken || 0;

    const available = Number((eligibleAmount - alreadyTaken).toFixed(2));
    if (available <= 0) {
      return res.status(400).json({ message: "No remaining dividend available for this period" });
    }

    if (amount > available) {
      return res.status(400).json({
        message: `Requested amount exceeds available dividend. Available: ${available}`
      });
    }

    // === 4) Create TRANSACTION (money out) ==

    const dividendAccount =
      await ACCOUNTS.findOne({ accountType: "Equity", accountName: "Partner Dividend" }).lean();
    if (!dividendAccount) {
      return res.status(400).json({ message: "Equity account 'Partner Dividend' not found" });
    }

    const refId = await generateUniqueRefId();

    // In your system, "Debit" means money going out
    const txn = await TRANSACTION.create({
      restaurantId: dividendAccount.restaurantId || null,
      accountId: dividendAccount._id,
      // paymentType: paymentModeId || null,
      amount: amount,
      type: "Debit",
      referenceId: refId,
      referenceType: "Dividend",
      description: note || `Dividend payout to ${partner.name} for period ${start.toISOString().slice(0,10)} to ${end.toISOString().slice(0,10)}`,
      createdById: user._id,
      createdBy: user.name,
      isSynced:false,
    });

    // === 5) Save payout record ===
    const payout = await PARTNER_DIVIDEND_PAYOUT.create({
      partnerId: partner._id,
      periodFrom: start,
      periodTo: end,
      netProfit,
      percentage: partner.percentage,
      eligibleAmount,
      amount,
      // paymentModeId,
      transactionId: txn._id,
      referenceId: refId,
      note,
      status: "Paid",
      createdById: user._id,
      createdBy: user.name,
      isSynced:false
    });

    // const remaining = Number((available - amount).toFixed(2));

    return res.status(201).json({
      message: "Dividend payout recorded",
    });

  } catch (err) {
    next(err);
  }
};


export const getAvailablePartnerDividends = async (req, res, next) => {
  try {
    const { fromDate, toDate } = req.query;

       const user = await USER.findById(req.user).lean();
    if (!user) return res.status(400).json({ message: "User not found!" });

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "fromDate and toDate are required" });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    

    // === 1) SALES from PAYMENT_RECORD
    const paymentsAgg = await PAYMENT_RECORD.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalBeforeVAT: { $sum: "$beforeVat" } } }
    ]);
    const revenue = paymentsAgg[0]?.totalBeforeVAT || 0;

    // === 2) COGS from PURCHASE
    const purchasesAgg = await PURCHASE.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalCOGS: { $sum: "$totalBeforeVAT" } } }
    ]);
    const cogs = purchasesAgg[0]?.totalCOGS || 0;

    // === 3) Operating Expenses from EXPENSE
    const ExpenseAgg = await EXPENSE.aggregate([
      { $match: {  createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          OperatingExpenses: { $sum: "$totalBeforeVAT"}
        }
      }
    ]);
    const totalOperatingExpenses = ExpenseAgg[0]?.OperatingExpenses || 0;

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalOperatingExpenses;

    // if (netProfit <= 0) {
    //   return res.status(200).json({
    //     message: "No dividend available for the selected period",
    //   });
    // }

  
    // === 4) Get all partners
    const partners = await PARTNER.find().lean();

    // === 5) Build result per partner
    const data = [];
    for (const partner of partners) {
      const eligible = Number(((netProfit * (partner.percentage || 0)) / 100).toFixed(2));

      //  Check already paid dividends (any overlap with this range)
      const alreadyPaid = await PARTNER_DIVIDEND_PAYOUT.aggregate([
        {
          $match: {
            partnerId: partner._id,
            status: "Paid",
            periodFrom: { $lte: end },
            periodTo: { $gte: start }
          }
        },
        { $group: { _id: null, totalPaid: { $sum: "$amount" } } }
      ]);
      const totalPaid = alreadyPaid[0]?.totalPaid || 0;

      // Remaining share after subtracting already paid
      const remaining = Number((eligible - totalPaid).toFixed(2));

      data.push({
        partnerId: partner._id,
        name: partner.name,
        percentage: partner.percentage,
        eligible,
        alreadyTaken: totalPaid,
        remaining: remaining > 0 ? remaining : 0
      });
    }

    res.status(200).json({
      fromDate,
      toDate,
      netProfit,
      data
    });

  } catch (err) {
    next(err);
  }
};




// export const getPartnerDividendHistory = async (req, res, next) => {
//   try {
//     const { fromDate, toDate, search = '' } = req.query;
//     const limit = parseInt(req.query.limit) || 20;
//     const page = parseInt(req.query.page) || 1;
//     const skip = (page - 1) * limit;

//     const matchStage = {
//       referenceType: "Dividend"   // only dividends
//     };

//     if (fromDate && toDate) {
//       const start = new Date(fromDate);
//       const end = new Date(toDate);
//       end.setHours(23, 59, 59, 999);
//       matchStage.createdAt = { $gte: start, $lte: end };
//     }

//     if (search) {
//       matchStage.$or = [
//         { referenceId: { $regex: search, $options: 'i' } },
//         { description: { $regex: search, $options: 'i' } },
//         { createdBy: { $regex: search, $options: 'i' } }
//       ];
//     }

//     const pipeline = [
//       { $match: matchStage },
//       { $sort: { createdAt: -1 } }, // latest first

//       // Join account info
//       {
//         $lookup: {
//           from: "accounts",
//           localField: "accountId",
//           foreignField: "_id",
//           as: "accountInfo"
//         }
//       },
//       { $unwind: { path: "$accountInfo", preserveNullAndEmptyArrays: true } },

//       // Join payment method
//       {
//         $lookup: {
//           from: "accounts",
//           localField: "paymentType",
//           foreignField: "_id",
//           as: "paymentTypeInfo"
//         }
//       },
//       { $unwind: { path: "$paymentTypeInfo", preserveNullAndEmptyArrays: true } },

//       // Join partner info via PARTNER_DIVIDEND_PAYOUT
//       {
//         $lookup: {
//           from: "partner_dividend_payouts",
//           localField: "referenceId",
//           foreignField: "referenceId",
//           as: "payoutInfo"
//         }
//       },
//       { $unwind: { path: "$payoutInfo", preserveNullAndEmptyArrays: true } },

//       {
//         $project: {
//           _id: 1,
//           referenceId: 1,
//           amount: 1,
//           type: 1,
//           description: 1,
//           createdAt: 1,
//           createdBy: 1,
//           account: {
//             name: "$accountInfo.accountName",
//             type: "$accountInfo.accountType"
//           },
//           paymentMethod: {
//             $ifNull: ["$paymentTypeInfo.accountName", null]
//           },
//           partnerId: "$payoutInfo.partnerId",
//           partnerName: "$payoutInfo.name",
//           periodFrom: "$payoutInfo.periodFrom",
//           periodTo: "$payoutInfo.periodTo",
//           percentage: "$payoutInfo.percentage",
//           eligibleAmount: "$payoutInfo.eligibleAmount",
//           note: "$payoutInfo.note"
//         }
//       },

//       {
//         $facet: {
//           data: [{ $skip: skip }, { $limit: limit }],
//           totalCount: [{ $count: "count" }]
//         }
//       }
//     ];

//     const result = await TRANSACTION.aggregate(pipeline);

//     const final = {
//       data: result[0]?.data || [],
//       totalCount: result[0]?.totalCount[0]?.count || 0
//     };

//     return res.status(200).json({
//       data: final.data,
//       totalCount: final.totalCount,
//       page,
//       limit
//     });

//   } catch (err) {
//     next(err);
//   }
// };
export const getPartnerDividendHistory = async (req, res, next) => {
  try {
    const { fromDate, toDate, search = '' } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

     const matchStage = {};

    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      matchStage.createdAt = { $gte: start, $lte: end };
    }

    if (search) {
      matchStage.$or = [
        { referenceId: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } }
      ];
    }

 const pipeline = [
  { $match: matchStage },
  { $sort: { createdAt: -1 } },

  // Lookup partner to get partnerName
  {
    $lookup: {
      from: "partners",
      localField: "partnerId",
      foreignField: "_id",
      as: "partnerInfo"
    }
  },
  { $unwind: { path: "$partnerInfo", preserveNullAndEmptyArrays: true } },


  // Lookup transaction using referenceId
  {
    $lookup: {
      from: "transactions",
      localField: "transactionId",
      foreignField: "_id",
      as: "transactionInfo"
    }
  },
  { $unwind: { path: "$transactionInfo", preserveNullAndEmptyArrays: true } },

  // Lookup account using transactionInfo.accountId
  {
    $lookup: {
      from: "accounts",
      localField: "transactionInfo.accountId",
      foreignField: "_id",
      as: "accountInfo"
    }
  },
  { $unwind: { path: "$accountInfo", preserveNullAndEmptyArrays: true } },

  {
    $project: {
      _id: 1,
      partnerId: 1,
      partnerName: "$partnerInfo.name",
      payoutAmount: 1,
      percentage: 1,
      netProfit:1,
      eligibleAmount: 1,
      amount: 1,
      periodFrom: 1,
      periodTo: 1,
      note: 1,
      createdAt: 1,
      createdBy: 1,
      account: {
        _id: "$accountInfo._id",
        name: "$accountInfo.accountName",
        type: "$accountInfo.accountType"
      }
    }
  },

  {
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      totalCount: [{ $count: "count" }]
    }
  }
];


    const result = await PARTNER_DIVIDEND_PAYOUT.aggregate(pipeline);

    const final = {
      data: result[0]?.data || [],
      totalCount: result[0]?.totalCount[0]?.count || 0
    };

    return res.status(200).json({
      data: final.data,
      totalCount: final.totalCount,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
};
