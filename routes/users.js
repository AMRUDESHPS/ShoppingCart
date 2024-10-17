var express = require('express');
var router = express.Router();

var productHelpers = require('../helpers/product-helpers.js')
var userHelpers = require('../helpers/user-helpers.js');
const session = require('express-session');


const verifyLogin = (req, res, next) => {
  if (req.session.user.loggedIn) {
    next()
  } else {
    res.redirect('user/login')
  }
}

/* GET home page. */
router.get('/', async (req, res) => {
  let user = req.session.user
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProducts().then((products) => {
    res.render('user/view-products', { products, admin: false, user, cartCount });
  })
});
router.get('/login', (req, res, next) => {
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('user/login', { loginErr: req.session.userLoginErr })
    req.session.userLoginErr = false
  }
})
router.get('/signup', (req, res, next) => {
  res.render('user/signup')
})
router.post('/signup', (req, res) => {
  userHelpers.doSignUp(req.body).then((response) => {
    console.log(response);
    let obj = { Name: response }
    req.session.user = obj
    req.session.user.loggedIn = true
    res.redirect('/')
  })
})
router.post('/login', (req, res, next) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user
      req.session.user.loggedIn = true
      res.redirect('/')
    } else {
      req.session.userLoginErr = "Invalid username or password";
      res.redirect('/login')
    }
  })
})
router.get('/logout', (req, res) => {
  req.session.user = null
  res.redirect('/')
})
router.get('/cart', verifyLogin, async (req, res) => {

  let products = await userHelpers.getCartProducts(req.session.user._id)
  let totalValue = await userHelpers.getTotalAmount(req.session.user._id)

  res.render('user/cart', { products, user: req.session.user, totalValue })
  console.log(products)


})
router.get('/add-to-cart/:id', (req, res) => {
  console.log("api call")
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  })
})
router.post('/change-product-quantity', (req, res, next) => {
  console.log(req.body)

  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.userId)
    res.json(response);
  }).catch((error) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  })
})
router.get('/place-order', verifyLogin, async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order', { total, user: req.session.user })
})
router.post('/place-order', verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    if (req.body['payment-method'] === 'COD') {
      res.json({ codSuccess: true })
    } else {
      userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
        res.json(response)
      })
    }
  })
})

router.post('/remove', (req, res, next) => {
  console.log(req.body)
  userHelpers.removeButtonFromCartPage(req.body).then((response) => {
    res.json(response)
  })
})
router.get('/order-success', (req, res, next) => {
  res.render('user/order-success', { user: req.session.user._id })
})
router.get('/orders', async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  console.log(orders)
  res.render('user/orders', { user: req.session.user, orders })
})
router.get('/view-order-products/:order-id', (req, res, next) => {
  let products = userHelpers.getOrderProducts(req.params.order - id)
  res.render('user/view-order-products', { user: req.session.user._id, products })
})
router.post('/verify-payment', (req, res) => {
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      console.log("Payment successfull");
      res.json({ status: true })
    }).catch((err) => {
      console.log(err)
      res.json({ status: false, errMsg: '' })
    })
  })
})
module.exports = router;

