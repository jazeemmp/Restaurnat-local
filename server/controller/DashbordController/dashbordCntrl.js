import mongoose from "mongoose";
import USER from '../../model/userModel.js';
import RESTAURANT from '../../model/restaurant.js'
import CATEGORY from '../../model/category.js'
import FOOD from '../../model/food.js'
import CUSTOMER_TYPE from '../../model/customerTypes.js';
import ORDER from '../../model/oreder.js';
import COMBO from '../../model/combo.js';
import CUSTOMER from '../../model/customer.js';
import PAYMENT from '../../model/paymentRecord.js'
import { getIO  } from "../../config/socket.js";
import ACCOUNTS from '../../model/account.js'
import TRANSACTION from '../../model/transaction.js'
import PURCHASE from '../../model/purchase.js';
import EXPENSE from '../../model/expense.js'
import moment from "moment-timezone";




export const getQuickViewDashboard = async (req, res, next) => {
  try {
    const user = await USER.findById(req.user).lean();
    if (!user) {
      return res.status(400).json({ message: "User not found!" });
    }
    const { fromDate, toDate } = req.params;
  
    const start = fromDate ? new Date(fromDate) : new Date("2000-01-01");
    const end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const totalOrders = await ORDER.countDocuments({
  status: "Completed",
  createdAt: { $gte: start, $lte: end }
});

    // === Sales (Revenue) ===
    const paymentsAgg = await PAYMENT.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalBeforeVAT: { $sum: "$beforeVat" } } }
    ]);
    const revenue = paymentsAgg[0]?.totalBeforeVAT || 0;

    // === Purchases (COGS) ===
    const purchasesAgg = await PURCHASE.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalCOGS: { $sum: "$totalBeforeVAT" } } }
    ]);
    const totalPurchase = purchasesAgg[0]?.totalCOGS || 0;

    // === Expenses ===
    const expenseDocs = await EXPENSE.find({
      createdAt: { $gte: start, $lte: end }
    }).lean();

    let totalExpenses = 0;
    let expenseBreakdown = {};

    for (const exp of expenseDocs) {
      for (const item of exp.expenseItems) {
        const account = await ACCOUNTS.findById(item.accountId).lean();
        if (!account) continue;

        const accountName = account.accountName;
        const amount = Number(item.baseTotal) || 0;

        if (!expenseBreakdown[accountName]) {
          expenseBreakdown[accountName] = 0;
        }
        expenseBreakdown[accountName] += amount;
        totalExpenses += amount;
      }
    }

    // === Calculations ===
    const grossProfit = revenue - totalPurchase;
    const netProfit = grossProfit - totalExpenses;

    // === Response in requested format ===
    const data = [
      {
        name: "Total Sales",
        sales: revenue ? parseFloat(revenue.toFixed(2)) : 0,
        orders: null,
      },
      {
        name: "Total Purchase",
        sales: totalPurchase ? parseFloat(totalPurchase.toFixed(2)) : 0,
        orders: null,
      },
      {
        name: "Total Expenses",
        sales: totalExpenses ? parseFloat(totalExpenses.toFixed(2)) : 0,
        orders: null,
      },
      {
        name: "Gross Profit",
        sales: grossProfit ? parseFloat(grossProfit.toFixed(2)) : 0,
        orders: null,
      },
      {
        name: "Net Profit",
        sales: netProfit ? parseFloat(netProfit.toFixed(2)) : 0,
        orders: null,
      },
            {
          name: "Total Orders",
          sales: null,
          orders: totalOrders || 0,
        }
    ];

    return res.status(200).json({
      fromDate,
      toDate,
      data,
    });

  } catch (err) {
    next(err);
  }
};



export const getSalesOverview = async(req,res,next)=>{
    try {

         const { fromDate, toDate } = req.params;
       const userId = req.user

       console.log(fromDate,'from date');
       console.log(toDate,'todate')

        const user = await USER.findOne({ _id: userId }).lean();
        if (!user) return res.status(400).json({ message: "User not found" });

    // if (!fromDate || !toDate) {
    //   return res.status(400).json({ message: "Missing fromDate or toDate" });
    // }

            const start = new Date(fromDate);
            const end = new Date(toDate);

    const customerTypes = await CUSTOMER_TYPE.find();
    const customerTypeMap = new Map();
    customerTypes.forEach(ct => {
      customerTypeMap.set(ct._id.toString(), ct.type);
    });

        // Step 1: Prepare sales map from DB
       const payments = await PAYMENT.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "orderInfo",
        },
      },
      { $unwind: "$orderInfo" },
      {
        $project: {
          beforeVat: 1,
          createdAt: 1,
          customerTypeId: "$orderInfo.customerTypeId",
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          hour: { $hour: "$createdAt" },
        },
      },
      {
        $addFields: {
          slot: {
            $switch: {
              branches: [
                { case: { $lt: ["$hour", 9] }, then: "00:00 - 09:00" },
                { case: { $lt: ["$hour", 13] }, then: "09:00 - 13:00" },
                { case: { $lt: ["$hour", 17] }, then: "13:00 - 17:00" },
                { case: { $lt: ["$hour", 21] }, then: "17:00 - 21:00" },
              ],
              default: "21:00 - 24:00",
            },
          },
        },
      },
      {
        $group: {
          _id: {
            date: "$date",
            slot: "$slot",
            customerTypeId: "$customerTypeId",
          },
          total: { $sum: "$beforeVat" },
        },
      },
    ]);


        // Format result
    const groupedMap = new Map();

  for (const p of payments) {
  const { date, slot, customerTypeId } = p._id;
  const customerType = customerTypeMap.get(customerTypeId.toString()) || "Unknown";

  // Get slot start hour (e.g., "09" from "09:00 - 13:00")
  const slotStartHour = slot.split(":")[0];

  // Create timestamp with both date + slot hour
const timestamp = new Date(`${date}T${slotStartHour.padStart(2, '0')}:00:00`)

  const key = `${date}-${slot}`;

  if (!groupedMap.has(key)) {
    groupedMap.set(key, {
      timestamp,
      amount: 0,
      breakdown: {},
    });
  }

  const entry = groupedMap.get(key);
  entry.amount += p.total;
  entry.breakdown[customerType] = (entry.breakdown[customerType] || 0) + p.total;
}

    const result = Array.from(groupedMap.values()).map((entry) => ({
      ...entry,
      amount: parseFloat(entry.amount.toFixed(2)),
      breakdown: Object.fromEntries(
        Object.entries(entry.breakdown).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
      ),
    }));

    return res.status(200).json(result);

    
    } catch (err) {
        next(err)
    }
}

export const getPaymentOverview = async(req,res,next)=>{
    try {

         const { fromDate, toDate } = req.params;
       const userId = req.user

        const user = await USER.findById({ _id: userId }).lean();
        if (!user) return res.status(400).json({ message: "User not found" });

           const start = new Date(fromDate);
            const end = new Date(toDate);

    //  Fetch all account names that can appear as payment methods
    const accounts = await ACCOUNTS.find({showInPos:true}).select("accountName -_id").lean();
    const expectedMethods = accounts.map((acc) => acc.accountName);

        const payments = await PAYMENT.aggregate([
      {
        $match: {
         createdAt: { $gte: start, $lte: end }
        }
      },
      { $unwind: "$methods" },
      {
        $lookup: {
          from: "accounts",
          localField: "methods.accountId",
          foreignField: "_id",
          as: "accountInfo"
        }
      },
      { $unwind: "$accountInfo" },
      {
        $group: {
          _id: "$accountInfo.accountName",
          total: { $sum: "$methods.amount" }
        }
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          amount: { $round: ["$total", 2] }
        }
      }
    ]);

   const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);

    const paymentMap = new Map(payments.map((p) => [p.name, p.amount]));

    const enrichedPayments = expectedMethods.map((method) => {
      const amount = paymentMap.get(method) || null;
      return {
        name: method,
        amount,
        percentage: totalReceived
          ? parseFloat(((amount / totalReceived) * 100).toFixed(2))
          : null,
      };
    });

    return res.status(200).json({
      methods: enrichedPayments,
      totalReceived,
    });
    } catch (err) {
        next(err)
    }
}


export const getOrderSummary = async(req,res,next)=>{
     try {

    const userId = req.user;

    const user = await USER.findById(userId).lean();
    if (!user) return res.status(400).json({ message: "User not found" });

        // 1. Count orders by status
    const orderStats = await ORDER.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    let completedCount = 0;
    let canceledCount = 0;
    
      orderStats.forEach(stat => {
      if (stat._id === "Completed") completedCount = stat.count;
      else if (stat._id === "Cancelled") canceledCount = stat.count;
    });

       // 2. Get grandTotal sum of all payments linked to completed orders
    const completedOrders = await ORDER.find({ status: "Completed" }).select("_id");
    const completedOrderIds = completedOrders.map(order => order._id);

    const paymentStats = await PAYMENT.aggregate([
      {
        $match: {
          orderId: { $in: completedOrderIds }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$grandTotal" }
        }
      }
    ]);

    const totalSales = paymentStats[0]?.totalSales || 0;
    const averageOrderValue =
      completedCount > 0 ? parseFloat((totalSales / completedCount).toFixed(2)) : 0;

    return res.status(200).json({
      completedOrders: completedCount || 0,
      canceledOrders: canceledCount ||0,
      averageOrderValue :averageOrderValue ||0
    });
    
     } catch (err) {
      next(err)
     }

}


export const getTopSellingItems = async(req,res,next)=>{
    try {

      const userId = req.user;
    const user = await USER.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

     const orders = await ORDER.find({ status: "Completed" })
      .select("items")
      .lean();

    const foodCountMap = new Map();
    const foodSalesMap = new Map();
    const comboCountMap = new Map();
    const comboSalesMap = new Map();



    // 2. Loop through orders and classify counts/sales
    for (const order of orders) {
      for (const item of order.items) {
        if (item.isCombo) {
          //  Combo item
          const comboId = item.comboId?.toString();
          const comboQty = item.qty || 1;
          const comboPrice = item.comboPrice || 0;

          if (comboId) {
            comboCountMap.set(
              comboId,
              (comboCountMap.get(comboId) || 0) + comboQty
            );
            comboSalesMap.set(
              comboId,
              (comboSalesMap.get(comboId) || 0) + comboPrice * comboQty
            );
          }

          //  Count nested food items inside combo (only for count, not price)
                    if (item.items && Array.isArray(item.items)) {
              for (const nestedItem of item.items) {
                if (nestedItem.foodId) {
                  const foodId = nestedItem.foodId.toString();
                  const nestedQty = (nestedItem.qty || 1) * comboQty;
                  const nestedTotal = (nestedItem.total || 0) * comboQty;

                  // Count
                  foodCountMap.set(
                    foodId,
                    (foodCountMap.get(foodId) || 0) + nestedQty
                  );

                  // Sales
                  foodSalesMap.set(
                    foodId,
                    (foodSalesMap.get(foodId) || 0) + nestedTotal
                  );
                }
              }
            }

        } else {
          //  Direct food item
          const foodId = item.foodId?.toString();
          const qty = item.qty || 1;
          const total = item.total || 0;

          if (foodId) {
            foodCountMap.set(foodId, (foodCountMap.get(foodId) || 0) + qty);
            foodSalesMap.set(
              foodId,
              (foodSalesMap.get(foodId) || 0) + total
            );
          }
        }
      }
    }

    // 3. Sort and get top 8 foods and combos
    const topFoodIds = Array.from(foodCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const topComboIds = Array.from(comboCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // 4. Fetch food and combo details from DB
    const topFoods = await FOOD.find({ _id: { $in: topFoodIds.map(([id]) => id) } })
      .populate("categoryId", "name")
      .select("foodName categoryId image")
      .lean();

    const topCombos = await COMBO.find({ _id: { $in: topComboIds.map(([id]) => id) } })
      .select("comboName image")
      .lean();

        // 5. Merge count + sale into results in correct sorted order
      const foodMap = new Map();
      topFoods.forEach(food => foodMap.set(food._id.toString(), food));

      const finalTopFoods = topFoodIds.map(([id]) => {
        const food = foodMap.get(id);
        return {
          name: food?.foodName || null,
          category: food?.categoryId?.name || null,
          image: food?.image || null,
          itemsSold: foodCountMap.get(id) || 0,
          totalSale: parseFloat((foodSalesMap.get(id) || 0).toFixed(2)),
        };
      });

      const comboMap = new Map();
      topCombos.forEach(combo => comboMap.set(combo._id.toString(), combo));
      const finalTopCombos = topComboIds.map(([id]) => {
        const combo = comboMap.get(id);
        return {
          name: combo?.comboName || null,
          image: combo?.image || null,
          itemsSold: comboCountMap.get(id) || 0,
          totalSale: parseFloat((comboSalesMap.get(id) || 0).toFixed(2)),
        };
      });


    // 6. Return response
    return res.status(200).json({
      topFoods: finalTopFoods,
      topCombos: finalTopCombos,
    });
      
    } catch (err) {
        next(err)
    }
      
  }



export const getLatestCompletedOrders = async (req, res, next) => {
  try {
    const userId = req.user;
    const user = await USER.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    // Fetch more than 10 to allow filtering and grouping
    const payments = await PAYMENT.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate({
        path: "orderId",
        select: "order_id tableId customerTypeId",
        populate: [
          { path: "tableId", select: "tableNo name" },
          { path: "customerTypeId", select: "type" }
        ]
      })
      .populate({
        path: "methods.accountId",
        select: "accountName"
      })
      .lean();

    const data = {};

    for (const payment of payments) {
      const order = payment.orderId;
      if (!order || !order.customerTypeId?.type) continue;

      const customerType = order.customerTypeId.type;

      const paymentTypes = payment.methods
        .map(method => method.accountId?.accountName)
        .filter(Boolean);

      const entry = {
        order_id: order.order_id || "N/A",
        tableNo: order.tableId?.tableNo || order.tableId?.name || "N/A",
        amount: payment.grandTotal || 0,
        paid: payment.paidAmount,
        paymentTypes,
        date: payment.createdAt,
      };

      if (!data[customerType]) {
        data[customerType] = [];
      }

      // Only push if less than 10 items collected for this customerType
      if (data[customerType].length < 10) {
        data[customerType].push(entry);
      }
    }

    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};


