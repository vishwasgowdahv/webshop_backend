import express from "express";
import validateLogin from "../middleware/validateLogin.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
// import { redisClient } from "../index.js";

import amqp from "amqplib";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

let sucess = false;

// add items to cart
router.post("/addToCart", validateLogin, async (req, res) => {
  sucess = false;
  try {
    const { itemId } = req.body;
    const userId = req.user._id;

    const userData = await User.findById(userId);
    let cartData = userData.cartData;
    // console.log(userData);

    const newItem = { itemId, quantity: 1 };

    let flag = true;
    cartData.map((cartItem) => {
      if (cartItem.itemId == itemId) {
        cartItem.quantity += 1;
        flag = false;
      }
    });
    if (flag) {
      cartData.push(newItem);
    }

    await User.findByIdAndUpdate(userId, { cartData });
    sucess = true;
    res.json({ sucess, message: "Added To Cart" });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

// delete item from cart
router.post("/deleteFromCart", validateLogin, async (req, res) => {
  sucess = false;
  try {
    const { itemId } = req.body;
    const userId = req.user._id;

    const userData = await User.findById(userId);
    let cartData = userData.cartData;
    // console.log(userData);

    let flag = true;

    cartData.map((cartItem) => {
      if (cartItem.itemId == itemId) {
        if (cartItem.quantity > 0) {
          cartItem.quantity -= 1;
          flag = false;
        }
      }
    });

    cartData = cartData.filter((cartItem) => {
      return cartItem.quantity != 0;
    });
    if (flag) {
      res.json({
        sucess,
        message: "Either Product not exist or Quantity in cart is already Zero",
      });
    }

    await User.findByIdAndUpdate(userId, { cartData });
    sucess = true;
    res.json({ sucess, message: "deleted from Cart" });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

// update items in cart
router.post("/updateCart", validateLogin, async (req, res) => {
  sucess = false;
  try {
    const { itemId, quantity } = req.body;
    const userId = req.user._id;
    const userData = await User.findById(userId);
    let cartData = userData.cartData;

    const newItem = { itemId, quantity };

    let flag = true;
    cartData.map((cartItem) => {
      if (cartItem.itemId == itemId) {
        cartItem.quantity = quantity;
        flag = false;
      }
    });
    if (flag) {
      cartData.push(newItem);
    }

    await User.findByIdAndUpdate(userId, { cartData });
    sucess = true;
    res.json({ sucess, message: "Cart Updated" });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

//get user cart

router.get("/getUserCart", validateLogin, async (req, res) => {
  sucess = false;
  try {
    const userId = req.user._id;
    const userData = await User.findById(userId);
    let cartData = userData.cartData;
    sucess = true;
    res.json({ sucess, cartData });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

async function sendOrderToQueue(order,correlationId) {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();
  await channel.assertQueue("order.queue", { durable: true });
  channel.sendToQueue("order.queue", Buffer.from(order), {
    contentType: "application/json",
    correlationId: correlationId,
    replyTo: "order.response.queue",
    persistent: true,
  });

  console.log("Order sent to RabbitMQ with correlationId:", correlationId);
  setTimeout(() => {
    channel.close();
    connection.close();
  }, 500);
}

// Create an order

router.post("/order", validateLogin, async (req, res) => {
  sucess = false;
  try {
    const {
      userId,
      name,
      email,
      address,
      total_price,
      order_status,
      products,
      ERP_ORDER_DATA,
    } = req.body;
    const id = req.user._id;

    const userData = await User.findById(id);
    if (!userData) {
      res.status(400).json({ sucess, message: "User Not found" });
    }

    const payload = JSON.stringify({
      customer_ID: ERP_ORDER_DATA.customer_ID,
      orderDate: ERP_ORDER_DATA.orderDate,
      orderAmount: ERP_ORDER_DATA.orderAmount,
      currency_code: ERP_ORDER_DATA.currency_code,
      orderStatus_status: ERP_ORDER_DATA.orderStatus_status,
      items: ERP_ORDER_DATA.items,
    });

    // const ERP_RES = await fetch(
    //   "http://localhost:4004/odata/v4/simple-erp/Orders",
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Accept: "application/json",
    //       Authorization: "Basic " + btoa("service-user:service-user"),
    //     },
    //     body: JSON.stringify({
    //       customer_ID: ERP_ORDER_DATA.customer_ID,
    //       orderDate: ERP_ORDER_DATA.orderDate,
    //       orderAmount: ERP_ORDER_DATA.orderAmount,
    //       currency_code: ERP_ORDER_DATA.currency_code,
    //       orderStatus_status: ERP_ORDER_DATA.orderStatus_status,
    //       items: ERP_ORDER_DATA.items,
    //     }),
    //   }
    // );
    // console.log(ERP_ORDER_DATA);
    // // console.log(ERP_RES);
    // const location = ERP_RES.headers.get("location");
    // const match = location.match(/Orders\(([^)]+)\)/);
    // const ERP_ID = match ? match[1] : null;
    // console.log(ERP_ID);

    // if (payload) {
      const orderedData = await Order.create({
        ERP_ID:'null',
        userId,
        name,
        email,
        address,
        total_price,
        order_status,
        products,
      });
      await sendOrderToQueue(payload,String(orderedData._id));
      const orderHistory = userData.orderHistory;
      orderHistory.push(orderedData._id);
      await User.findByIdAndUpdate(userId, { orderHistory });
      // console.log(orderedData._id);
      await User.findByIdAndUpdate(userId, { cartData: [] });
      sucess = true;
      res.json({ sucess, message: "Order succesfull", data: orderedData });
    // } else {
    //   res.json({ sucess, message: "Order unsuccesfull" });
    // }
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

// get user order list
router.get("/getallorders", validateLogin, async (req, res) => {
  sucess = false;
  try {
    const userId = req.user._id;

    let OrderData;
    // const cached = await redisClient.get("getallorders");

    // if (cached) {
    //   OrderData = JSON.parse(cached);
    // } else {
    OrderData = await Order.find({ userId });
    //   await redisClient.set("getallorders", JSON.stringify(OrderData));
    //   await redisClient.expire("getallorders", 300);
    // }

    sucess = true;
    res.json({ sucess, OrderData });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

// get single order details
router.post("/getsingleorder", validateLogin, async (req, res) => {
  sucess = false;
  try {
    const orderId = req.body.orderId;
    const orderDetails = await Order.findById(orderId);
    sucess = true;
    res.json({ sucess, orderDetails });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

export default router;
