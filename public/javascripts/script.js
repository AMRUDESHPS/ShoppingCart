function addToCart(proId){
    $.ajax({
        url:'/add-to-cart/'+proId,
        method:'get',
        seccess: (response)=>{
            if(response.status){
                let count= $('#cart-count').html()
                count =parseInt(count)+1
                document.getElementById("cart-count")
                location.reload()
            }
        }
    }) 
}
function changeQuantity(cartId,proId,userId,count){
    let quantity = parseInt(document.getElementById(proId).innerHTML)
    $.ajax({
        url:'/change-product-quantity',
        data:{
            userId:userId,
            cart:cartId,
            product:proId,
            count:count,
            quantity:quantity
        },
        method:'post',
        success:(response)=>{
            if(response.removeProduct){
                alert("Product remove from cart")
                location.reload()
            }else{
                document.getElementById(proId),innerHTML = quantity+count
                document.getElementById('total'),innerHTML = response.total
            }
        }
    })
}
function removeButtonFromCartPage(cartId,proId){
    $.ajax({
        url:'/remove',
        data:{
            cart:cartId,
            product:proId
        },
        method:'post',
        success:(response)=>{
            if(response.removeProduct){
                alert("Want to remove the product from cart")
                location.reload()
            }
        }
    })
}
