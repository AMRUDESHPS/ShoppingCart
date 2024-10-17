var db = require('../config/connection')
var collection = require('../config/collections')
const { ObjectId } = require('mongodb');


module.exports = {
  AdminLogin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let loginErr;
      let response = {}
      let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email })
      if (admin) {
        if (adminData.Password === admin.Password) {
          console.log("Success")
          response.user = admin
          response.status = true
          resolve(response)
        } else {
          console.log("Failed")
          response.status = false
          resolve(response)
        }
      } else {
        console.log("Failed")
        response.status = false
        resolve(response)
      }
    })
  },
  addProduct(product, callback) {
    db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
      console.log(data)
      callback(data.insertedId)
    })
  },

  getAllProducts() {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
      resolve(products)
    })
  },
  deleteProduct: (proId) => {
    const objectId = new ObjectId(proId);
    return new Promise((resolve, reject) => {
      console.log(proId)
      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId }).then((response) => {
        resolve(response)
      })
    })
  },
  getProductDetails: (proId) => {
    const objectId = new ObjectId(proId);
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId }).then((response) => {
        resolve(response)
      })
    })
  },
  updateProduct: (proDetails, proId) => {
    const objectId = new ObjectId(proId);
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId }, {
        $set: {
          Name: proDetails.Name,
          Description: proDetails.Description,
          Price: proDetails.Price,
          Category: proDetails.Category
        }
      }).then((response) => {
        resolve("hello")
      })
    })
  }
};