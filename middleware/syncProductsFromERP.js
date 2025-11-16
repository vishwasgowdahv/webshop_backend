import mongoose from "mongoose";
import Product from "../models/Product.js";
import Error from "../models/Error.js";
import fs from "fs";
import path from "path";
import { redisClient } from "../index.js";

function validateProduct(product) {
  return (
    product.productID &&
    typeof product.name === "string" &&
    typeof product.description === "string" &&
    typeof product.price === "number" &&
    typeof product.stock === "number"
  );
}

async function syncProductsFromERP() {
  try {
    const apires = await fetch(`http://localhost:4004/rest/api/products`, {
      method: "GET",
      headers: {
        Authorization: "Basic " + btoa("service-user:service-user"),
        "Content-Type": "application/json",
      },
    });

    const products = await apires.json();
    // console.log(products);


    async function createJsonFiles(){
      const fileName=`${new Date().getUTCDate()}_${
          new Date().getUTCMonth() + 1
        }_${new Date().getUTCFullYear()}_${new Date().getHours()}_${new Date().getMinutes()}_${new Date().getSeconds()}`
      fs.mkdirSync(
      path.dirname(
        `../FilesFromERP/${fileName}.json`
      ),
      { recursive: true }
    );

    fs.writeFileSync(
      `../FilesFromERP/${fileName}.json`,
      JSON.stringify(products, null, 2)
    );  
    }
    await createJsonFiles();

    if (!products) {
      await Error.create({
        errorCode: "PRODUCTS_DO_NOT_EXIST",
        errorMessage:
          "ERP API is returning empty array, NO Products Present in the response",
        errorTag: "minor",
      });
    }
    if (!Array.isArray(products)) {
      await Error.create({
        errorCode: "ARRAY_DO_NO_EXIST",
        errorMessage: "ERP API is not returning array",
        errorTag: "critical",
      });
      throw new Error("Invalid ERP API response: not an array");
    }


    let updatedCount = 0;

    for (const product of products) {
      if (!validateProduct(product)) {
        await Error.create({
          errorCode: "PRODUCT_INFO_MISSING",
          errorMessage: `Product has missing Informaation : ${JSON.stringify(
            product
          )}`,
          errorTag: "minor",
        });
        await Product.findOneAndUpdate(
          { productId: product.productID },
          {
            avl_peices: 0,
          }
        );
        console.warn(`Skipping invalid product: ${JSON.stringify(product)}`);
        continue;
      }
      if(product.stock<=0){
        await Error.create({
        errorCode: "OUT_OF_STOCK",
        errorMessage: `${product.name} is out of stock`,
        errorTag: "minor",
      });
      }
      const findProdut = await Product.findOne({
        productId: product.productID,
      });

      if (findProdut) {
        await Product.findOneAndUpdate(
          { productId: product.productID },
          {
            productId: product.productID,
            name: product.name,
            desc: product.description,
            price: product.price,
            avl_peices: product.stock,
          },
          { upsert: true, new: true }
        );

        updatedCount++;
      } else {
        await Product.create({
          ERP_ID:product.ID,
          name: product.name,
          desc: product.description,
          price: product.price,
          avl_peices: product.stock,
          productId: product.productID,
        });
      }
    }

    const itemsfromDB = await Product.find();

    if (itemsfromDB.length > products.length) {
      let getDeletedElement;
      for (let i = 0; i < itemsfromDB.length; i++) {
        let flag = true;
        for (let j = 0; j < products.length; j++) {
          if (itemsfromDB[i].productId == products[j].productID) {
            flag = false;
          }
        }
        if (flag) {
          getDeletedElement = itemsfromDB[i].productId;
          // console.log(getDeletedElement);

          // // if you want to delete product from DB then comment this and uncomment below await code
          // await Product.findOneAndUpdate(
          //   { productId: getDeletedElement },
          //   {
          //     avl_peices: 0,
          //   }
          // );

          await Product.findOneAndDelete({ productId: getDeletedElement });
          continue;
        }
      }
    }


    redisClient.del('fetchAllProducts', (err, result) => {
      if (err) {
        console.error('Error deleting key:', err);
      } 
    });


    return { success: true, updatedCount };
  } catch (err) {
    await Error.create({
      errorCode: "FAILED_TO_FETCH",
      errorMessage:
        "failed to fetch the ERP API's, this is due to internet connection error",
      errorTag: "critical",
    });
    console.error("Failed to sync products from ERP:", err.message);
    return { success: false, error: err.message };
  }
}

// syncProductsFromERP()
export default syncProductsFromERP;
