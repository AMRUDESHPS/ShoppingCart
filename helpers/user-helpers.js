var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const { ObjectId } = require('mongodb');
const { response } = require('express');
const Razorpay = require('razorpay');
const { rejects } = require('assert');

// fill before use
var instance = new Razorpay({
    key_id: ' ',
    key_secret: ' ',
});
const key_secret = ' ';

module.exports = {

    doSignUp: (userData) => {
        return new Promise(async (resolve, reject) => {
            let name = userData.Name
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then(() => {
                resolve(name)
            })
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let loginErr;
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log("Success")
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("Failed")
                        resolve(status)
                    }
                })
            } else {
                console.log("failed")
                resolve({ status: false })
            }

        })
    },
    addToCart: (proId, userId) => {
        const objectId = new ObjectId(userId);
        const prooId = new ObjectId(proId);

        let proObj = {
            item: prooId,
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId })
            console.log(userCart)
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log(proExist)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId, 'products.item': prooId },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }
                    ).then(() => {
                        resolve()
                    })
                    console.log("existing products")
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId },
                        {
                            $push: { products: proObj }
                        }
                    ).then(() => {
                        resolve()
                    })
                    console.log("new products")
                }
            }
            else {
                let cartObj = {
                    user: objectId,
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then(() => {
                    resolve()
                })
                console.log("creating cart collection")
            }
        })
    },
    getCartProducts: (userId) => {
        const objectId = new ObjectId(userId);
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                }, {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        const objectId = new ObjectId(userId);
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId })
            if (cart) {
                count = cart.products.length
            } else {

            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.quantity = parseInt(details.quantity)
        details.count = parseInt(details.count)
        const prooId = new ObjectId(details.product)
        const carttId = new ObjectId(details.cart)

        return new Promise((resolve, reject) => {
            if (details.count <= 0 && details.quantity <= 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: carttId }, {
                    $pull: { products: { item: prooId } }
                }).then((response) => {
                    resolve({ removeProduct: true })
                })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: carttId, 'products.item': prooId },
                    {
                        $inc: { 'products.$.quantity': details.count }
                    }
                ).then((response) => {
                    resolve({ status: true })
                })
            }
        })
    },
    removeButtonFromCartPage: (details) => {
        const prooId = new ObjectId(details.product)
        const carttId = new ObjectId(details.cart)

        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ _id: carttId }, {
                $pull: { products: { item: prooId } }
            }).then((response) => {
                resolve({ removeProduct: true })
            })
        })
    },
    getTotalAmount: (userId) => {
        const objectId = new ObjectId(userId)
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $project: {
                        price: {
                            $convert: {
                                input: '$product.Price',
                                to: "int"
                            }
                        },
                        quantity: 1
                    }
                }, {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$price'] } }
                    }
                }
            ]).toArray()
            resolve(total[0].total)
        })
    },
    placeOrder: (order, products, total) => {
        const objectId = new ObjectId(order.userId)
        return new Promise((resolve, reject) => {
            console.log(order, products, total);
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    phone: order.phone,
                    address: order.address,
                    pincode: order.pincode
                },
                userId: objectId,
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                date: new Date(),
                status: status
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId })
                resolve(response.insertedId)
            })
        })
    },
    getCartProductList: (userId) => {
        const objectId = new ObjectId(userId)
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId })
            resolve(products)
        })
    },
    getUserOrders: (userId) => {
        const objectId = new ObjectId(userId)
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId }).toArray()
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        const orderrId = new ObjectId(orderId)
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { user: orderrId }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(orderItems)
        })
    },
    generateRazorpay: (orderId, total) => {
        console.log("************", orderId, total)
        return new Promise((resolve, reject) => {
            var options = {
                amount: total * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                console.log("New order :", order);
                resolve(order)
            });
        })
    },
    verifyPayment: (details) => {
        console.log(details)
        return new Promise(async (resolve, reject) => {
            let hmac = crypto.createHmac('sha256', key_secret)
            hmac.update(details['payment[razorpay_order_id]'] + "|" + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac === details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject(new Error('Signature validation failed'))
            }
        })
    },
    changePaymentStatus: (orderId) => {
        const orderrId = new ObjectId(orderId)
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: orderrId },
                {
                    $set: {
                        status: 'Placed'
                    }
                }
            ).then(() => {
                resolve()
            })
        })
    }
}