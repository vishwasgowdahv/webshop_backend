import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
// import { redisClient } from "../index.js";

import { body, validationResult } from "express-validator";
import syncProductsFromERP from "../middleware/syncProductsFromERP.js";
import Error from "../models/Error.js";

const router = express.Router();

let sucess = false;

//addProduct
router.post(
  "/addProduct",
  [
    body("name", "Name Should be minimm 3 Charecters").isLength({ min: 3 }),
    body("desc", "description Should be minimm 3 Charecters").isLength({
      min: 5,
    }),
    // body("price", "please enter price").isEmpty(),
  ],
  async (req, res) => {
    sucess = false;
    const results = validationResult(req);
    if (!results.isEmpty()) {
      return res.status(404).json({ sucess, error: results.array() });
    }

    const ERP_RES = await fetch(
      "http://localhost:4004/odata/v4/simple-erp/Products",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "Basic " + btoa("service-user:service-user"),
        },
        body: JSON.stringify({
          productID: req.body.productId,
          name: req.body.name,
          description: req.body.desc,
          price: req.body.price,
          currency_code: "EUR",
          stock: req.body.avl_peices,
        }),
      }
    );
    const location = ERP_RES.headers.get("location");
    const match = location.match(/Products\(([^)]+)\)/);
    const ERP_ID = match ? match[1] : null;

    let product = await Product.create({
      name: req.body.name,
      desc: req.body.desc,
      // weight:req.body.weight,
      price: req.body.price,
      avl_peices: req.body.avl_peices,
      productId: req.body.productId,
      ERP_ID: ERP_ID,
    });

    sucess = true;
    res.json({ sucess, msg: "Product added successfully", data: product });
  }
);

//update product
router.post(
  "/updateproduct",
  [
    body("name", "Name Should be minimm 3 Charecters").isLength({ min: 3 }),
    body("desc", "description Should be minimm 3 Charecters").isLength({
      min: 5,
    }),
  ],
  async (req, res) => {
    sucess = false;
    const results = validationResult(req);
    if (!results.isEmpty()) {
      return res.status(404).json({ sucess, error: results.array() });
    }

    const isIdExists = await Product.findById(req.body.id);
    if (!isIdExists) {
      return res.status(404).json({
        sucess,
        message: "product you are trying to update does not exist ",
      });
    }

    const ERP_RES = await fetch(
      "http://localhost:4004/odata/v4/simple-erp/Products",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "Basic " + btoa("service-user:service-user"),
        },
        body: JSON.stringify({
          ID: req.body.ERP_ID,
          productID: req.body.productId,
          name: req.body.name,
          description: req.body.desc,
          price: req.body.price,
          currency_code: "EUR",
          stock: req.body.avl_peices,
        }),
      }
    );
    console.log(req.body);

    let product = await Product.findByIdAndUpdate(req.body.id, {
      name: req.body.name,
      desc: req.body.desc,
      // weight:req.body.weight,
      price: req.body.price,
      avl_peices: req.body.avl_peices,
    });

    sucess = true;
    res.json({ sucess, msg: "Product updated successfully", data: product });
  }
);

// delete existing products
router.post("/deleteProduct", async (req, res) => {
  sucess = false;
  try {
    const ERP_RES = await fetch(
      `http://localhost:4004/odata/v4/simple-erp/Products/${req.body.ERP_ID}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "Basic " + btoa("service-user:service-user"),
        },
      }
    );

    const id = await Product.findByIdAndDelete(req.body.id);
    if (!id) {
      res.json({
        sucess,
        message:
          "you are trying to delete product which is already deleted / or that doesnot exist",
      });
    }
    sucess = true;
    res.json({ sucess, message: "Product Removed sucessfully" });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

//fetch all existing products (fetchAllProducts)
router.get("/fetchAllProducts", async (req, res) => {
  sucess = false;
  try {
    await syncProductsFromERP();
    let products;

    // const cached = await redisClient.get("fetchAllProducts");

    // if (cached) {
    //   products = JSON.parse(cached);
    // } else {
      products = await Product.find({});

      // await redisClient.set("fetchAllProducts", JSON.stringify(products));
      // await redisClient.expire("fetchAllProducts", 300);
    // }

    sucess = true;
    res.json({ sucess, products });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

router.get("/fetchFromERP", async (req, res) => {
  sucess = false;
  console.log("Route hit!");
  try {
    await syncProductsFromERP();
    console.log("Finished syncing!");
    res.json({ sucess: true });
  } catch (err) {
    console.error("Error in sync:", err);
    res.status(500).json({ sucess: false, error: err.message });
  }
});

// get specific product by id
router.post("/fetchProductById", async (req, res) => {
  sucess = false;
  try {
    const products = await Product.findById(req.body.itemId);
    sucess = true;
    res.json({ sucess, products });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

/// get all errors
router.get("/fetchallerrors", async (req, res) => {
  sucess = false;
  try {
    const Errors = await Error.find({});
    sucess = true;
    res.json({ sucess, Errors });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

/// delete all errors
router.get("/deleteErrors", async (req, res) => {
  sucess = false;
  try {
    const Errors = await Error.deleteMany({});
    res.json({ sucess, Errors });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});


export default router;
