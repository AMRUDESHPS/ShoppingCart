var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers.js')

/* GET users listing. */
router.get('/', (req, res, next) => {
  if (req.session.admin) {
    let products = productHelpers.getAllProducts()
    res.render('admin/view-product', { admin: true, products });
  } else {
    res.render('admin/login', { loginErr: req.session.adminLoginErr })
    req.session.adminLoginErr = false
  }
})
router.post('/adminLogin', (req, res, next) => {
  console.log(req.body)
  userHelpers.AdminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.user
      req.session.admin.loggedIn = true
      res.redirect('/admin')
    } else {
      req.session.adminLoginErr = "Invalid adminName or Password";
      res.redirect('/admin')
    }
  })
})
router.post('/add-product', (req, res, next) => {
  console.log(req.body)
  console.log(req.files.Image)

  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.Image
    image.mv('./public/product-images/' + id + '.jpeg', (err, done) => {
      if (!err) {
        res.render('admin/add-product', { admin: true })
      } else {
        console.log(err);
      }
    })
  })
  
})
router.get('/delete-product/:id', (req, res) => {
  console.log("ID regenerated successfuly :" + req.params.id)
  let proId = req.params.id
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin')
  })
})
router.get('/edit-product/:id', async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id).then((product) => {
    res.render('admin/edit-product', { product, admin: true })
  })
})
router.post('/edit-product/:id', (req, res, next) => {
  console.log(req.body)
  let id = req.params.id;
  productHelpers.updateProduct(req.body, req.params.id).then(() => {
    res.redirect('/admin')
  })
  if (req.files.Image) {
    let image = req.files.Image
    image.mv('./public/product-images/' + id + '.jpeg', (err, done) => {
      if (!err) {
        res.render('admin/add-product', { admin: true })
      } else {
        console.log(err);
      }
    })
  }
})
module.exports = router;
