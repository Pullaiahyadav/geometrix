/**
 * simpleCart - localStorage-based shopping cart
 * Replacement for the external simpleCart.js dependency
 */
var simpleCart = (function() {
    var STORAGE_KEY = 'geometrixx_cart';
    var CART_ID_KEY = 'geometrixx_cart_id';
    var CART_OPEN_KEY = 'geometrixx_cart_opened';

    // Product availability: SKUs mapped to available stock (0 = out of stock)
    var productStock = {
        '100240': 5,   // Tie-Waist Puffer Jacket
        '100241': 3,   // Fur-Trim Ski Jacket
        '100244': 5,   // Front-Zip Ski Jacket (unavailable)
        '100233': 4,   // Scrunched Leg Cargo Pants
        '101340': 2,   // Black Dress
        '101341': 6,   // Red Dress
        '101333': 5,   // Sequin Dress
        '101344': 3,   // Silk Dress
        '200240': 4,   // Corduroy Blazer
        '200241': 5,   // Military Jacket (unavailable)
        '200244': 7,   // Sport Jacket
        '200233': 2,   // Hooded Sweater
        '201240': 3,   // Two-button Suit
        '201241': 5,   // Blue Shirt
        '201244': 4,   // French Cuff Shirt
        '201233': 1    // Tuxedo
    };

    function getOrCreateCartId() {
        var cartId = sessionStorage.getItem(CART_ID_KEY);
        if (!cartId) {
            cartId = 'CART_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            sessionStorage.setItem(CART_ID_KEY, cartId);
        }
        return cartId;
    }

    function buildCartProducts(cart) {
        var products = [];
        for (var i = 0; i < cart.length; i++) {
            products.push({
                name: cart[i].name || '',
                id: cart[i].sku || '',
                price: cart[i].price ? parseFloat(cart[i].price) : 0,
                quantity: cart[i].quantity || 1,
                category: 'Apparel',
                currency: 'USD'
            });
        }
        return products;
    }

    function getCartTotal(cart) {
        var total = 0;
        for (var i = 0; i < cart.length; i++) {
            total += parseFloat(cart[i].price) * (cart[i].quantity || 1);
        }
        return parseFloat(total.toFixed(2));
    }

    function getCart() {
        try {
            var data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCart(cart) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        } catch (e) {
            // localStorage unavailable
        }
    }

    function add() {
        // Require login before adding to cart
        if (typeof GeoAuth !== 'undefined' && !GeoAuth.isLoggedIn()) {
            // Prevent form submission
            if (window.event) {
                window.event.preventDefault();
                window.event.stopPropagation();
            }
            // Determine login page relative path
            var path = window.location.pathname;
            var loginUrl = 'login.html';
            if (path.indexOf('/checkout/') !== -1 || path.indexOf('/company/') !== -1 ||
                path.indexOf('/search/') !== -1) {
                loginUrl = '../login.html';
            } else if (path.indexOf('/activewear/') !== -1 || path.indexOf('/fineapparel/') !== -1) {
                loginUrl = '../../login.html';
            } else if (path.indexOf('/men/') !== -1 || path.indexOf('/women/') !== -1) {
                loginUrl = '../login.html';
            }

            // Show custom modal popup
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
            var modal = document.createElement('div');
            modal.style.cssText = 'background:#fff;border-radius:8px;padding:0;min-width:350px;max-width:420px;box-shadow:0 4px 24px rgba(0,0,0,0.25);overflow:hidden;font-family:Arial,sans-serif;';
            var header = document.createElement('div');
            header.style.cssText = 'background:#d04000;color:#fff;padding:14px 20px;font-size:16px;font-weight:bold;';
            header.textContent = 'Sign In to Add to Cart';
            var body = document.createElement('div');
            body.style.cssText = 'padding:20px;font-size:14px;color:#333;';
            body.textContent = 'Please sign in to add products to your cart.';
            var btnWrap = document.createElement('div');
            btnWrap.style.cssText = 'padding:10px 20px 18px;text-align:right;';
            var okBtn = document.createElement('button');
            okBtn.textContent = 'OK';
            okBtn.style.cssText = 'background:#1a73e8;color:#fff;border:none;border-radius:4px;padding:8px 28px;font-size:14px;cursor:pointer;';
            okBtn.onclick = function() {
                window.adobeDataLayer = window.adobeDataLayer || [];
                window.adobeDataLayer.push({
                    event: "linkTrack",
                    link: {
                        linkName: "OK",
                        linkType: "internal",
                        linkLocation: "Sign In to Add to Cart"
                    }
                });
                document.body.removeChild(overlay);
                window.location.href = loginUrl;
            };
            btnWrap.appendChild(okBtn);
            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(btnWrap);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Push modal datalayer event
            window.adobeDataLayer = window.adobeDataLayer || [];
            window.adobeDataLayer.push({
                event: "modal",
                modal: {
                    modalName: "Sign In to Add to Cart"
                }
            });

            return false;
        }

        // Check product availability
        var activeBtn = document.activeElement;
        var skuValue = '';
        if (activeBtn && (activeBtn.name === 'sku' || activeBtn.name === 'addToCart') && activeBtn.value) {
            skuValue = activeBtn.value;
        }
        if (skuValue && productStock.hasOwnProperty(skuValue) && productStock[skuValue] <= 0) {
            if (window.event) {
                window.event.preventDefault();
                window.event.stopPropagation();
            }
            alert('Sorry, this product is currently unavailable.');
            return false;
        }

        var item = {};
        for (var i = 0; i < arguments.length; i++) {
            var parts = arguments[i].split('=');
            if (parts.length === 2) {
                item[parts[0]] = parts[1];
            }
        }
        if (!item.quantity) {
            item.quantity = 1;
        } else {
            item.quantity = parseInt(item.quantity, 10);
        }

        var cart = getCart();
        // Check if item already exists
        var found = false;
        for (var j = 0; j < cart.length; j++) {
            if (cart[j].name === item.name) {
                cart[j].quantity += 1;
                found = true;
                break;
            }
        }
        if (!found) {
            cart.push(item);
        }
        saveCart(cart);

        // Push addtocart datalayer event
        var sku = '';
        // Get SKU from the button that triggered the add
        var activeBtn = document.activeElement;
        if (activeBtn && (activeBtn.name === 'sku' || activeBtn.name === 'addToCart') && activeBtn.value) {
            sku = activeBtn.value;
        }

        // Store SKU on the item for cart tracking
        item.sku = sku;
        // Re-save cart with SKU included
        for (var k = 0; k < cart.length; k++) {
            if (cart[k].name === item.name && !cart[k].sku) {
                cart[k].sku = sku;
            }
        }
        saveCart(cart);

        window.adobeDataLayer = window.adobeDataLayer || [];
        window.adobeDataLayer.push({
            event: "addtocart",
            product: {
                id: sku,
                name: item.name || '',
                price: item.price ? parseFloat(item.price) : 0,
                currency: "USD",
                quantity: 1
            }
        });

        // Push cartOpen event once per session (first add to cart)
        if (!sessionStorage.getItem(CART_OPEN_KEY)) {
            sessionStorage.setItem(CART_OPEN_KEY, 'true');
            var updatedCart = getCart();
            var totalQty = 0;
            for (var q = 0; q < updatedCart.length; q++) { totalQty += (updatedCart[q].quantity || 1); }
            window.adobeDataLayer.push({
                event: "cartOpen",
                cart: {
                    id: getOrCreateCartId(),
                    totalValue: getCartTotal(updatedCart),
                    totalQuantity: totalQty,
                    currency: "USD"
                },
                product: buildCartProducts(updatedCart)
            });
        }
    }

    function empty() {
        var cart = getCart();
        if (cart.length > 0) {
            var totalQty = 0;
            for (var q = 0; q < cart.length; q++) { totalQty += (cart[q].quantity || 1); }
            window.adobeDataLayer = window.adobeDataLayer || [];
            window.adobeDataLayer.push({
                event: "removefromcart",
                cart: {
                    id: getOrCreateCartId(),
                    totalValue: getCartTotal(cart),
                    totalQuantity: totalQty,
                    currency: "USD"
                },
                product: buildCartProducts(cart)
            });
        }
        localStorage.removeItem(STORAGE_KEY);
        renderCart();
    }

    function getTotal() {
        var cart = getCart();
        var total = 0;
        for (var i = 0; i < cart.length; i++) {
            total += parseFloat(cart[i].price) * cart[i].quantity;
        }
        return total.toFixed(2);
    }

    function getQuantity() {
        var cart = getCart();
        var qty = 0;
        for (var i = 0; i < cart.length; i++) {
            qty += cart[i].quantity;
        }
        return qty;
    }

    function increaseQuantity(index) {
        var cart = getCart();
        if (index < 0 || index >= cart.length) return;
        var item = cart[index];

        // Enforce stock limit
        if (item.sku && productStock.hasOwnProperty(item.sku) && item.quantity >= productStock[item.sku]) {
            return;
        }

        item.quantity += 1;
        saveCart(cart);

        // Push addtocart datalayer event before re-render
        var totalQty = 0;
        for (var q = 0; q < cart.length; q++) { totalQty += (cart[q].quantity || 1); }
        window.adobeDataLayer = window.adobeDataLayer || [];
        window.adobeDataLayer.push({
            event: "addtocart",
            product: {
                id: item.sku || '',
                name: item.name || '',
                price: item.price ? parseFloat(item.price) : 0,
                currency: "USD",
                quantity: 1,
                category: "Apparel"
            },
            cart: {
                id: getOrCreateCartId(),
                totalValue: getCartTotal(cart),
                totalQuantity: totalQty,
                currency: "USD"
            }
        });

        renderCart();
    }

    function decreaseQuantity(index) {
        var cart = getCart();
        if (index < 0 || index >= cart.length) return;
        var item = cart[index];
        var removedProduct = {
            name: item.name || '',
            id: item.sku || '',
            price: item.price ? parseFloat(item.price) : 0,
            quantity: 1,
            category: "Apparel",
            currency: "USD"
        };

        item.quantity -= 1;
        if (item.quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart(cart);

        // Push removefromcart datalayer event before re-render
        var totalQty = 0;
        for (var q = 0; q < cart.length; q++) { totalQty += (cart[q].quantity || 1); }
        window.adobeDataLayer = window.adobeDataLayer || [];
        window.adobeDataLayer.push({
            event: "removefromcart",
            cart: {
                id: getOrCreateCartId(),
                totalValue: getCartTotal(cart),
                totalQuantity: totalQty,
                currency: "USD"
            },
            product: [removedProduct]
        });

        renderCart();
    }

    function renderCart() {
        var cart = getCart();

        var btnStyle = 'display:inline-block;width:24px;height:24px;border:1px solid #F05A28;background:#fff;color:#F05A28;font-size:16px;font-weight:bold;cursor:pointer;text-align:center;line-height:22px;border-radius:3px;margin:0 4px;vertical-align:middle;';
        var btnDisabledStyle = 'display:inline-block;width:24px;height:24px;border:1px solid #ccc;background:#f0f0f0;color:#ccc;font-size:16px;font-weight:bold;cursor:not-allowed;text-align:center;line-height:22px;border-radius:3px;margin:0 4px;vertical-align:middle;';

        // Render items in simpleCart_items containers
        var itemContainers = document.getElementsByClassName('simpleCart_items');
        for (var c = 0; c < itemContainers.length; c++) {
            var container = itemContainers[c];
            var html = '';

            html += '<table style="width:100%; max-width:700px; border-collapse:collapse; table-layout:fixed;">';
            // Header row
            html += '<tr style="background-color:#fbecbe;">';
            html += '<th style="padding:8px; text-align:left; width:15%; font:bold 12px Verdana; color:#F05A28;">Image</th>';
            html += '<th style="padding:8px; text-align:left; width:25%; font:bold 12px Verdana; color:#F05A28;">Name</th>';
            html += '<th style="padding:8px; text-align:left; width:15%; font:bold 12px Verdana; color:#F05A28;">Price</th>';
            html += '<th style="padding:8px; text-align:left; width:25%; font:bold 12px Verdana; color:#F05A28;">Quantity</th>';
            html += '<th style="padding:8px; text-align:left; width:20%; font:bold 12px Verdana; color:#F05A28;">Total</th>';
            html += '</tr>';

            if (cart.length === 0) {
                html += '<tr><td colspan="5" style="padding:15px; background-color:#fff9e8;">Your cart is empty.</td></tr>';
            } else {
                for (var i = 0; i < cart.length; i++) {
                    var item = cart[i];
                    var itemTotal = (parseFloat(item.price) * item.quantity).toFixed(2);
                    var atStockLimit = item.sku && productStock.hasOwnProperty(item.sku) && item.quantity >= productStock[item.sku];
                    html += '<tr style="background-color:#fff9e8;">';
                    if (item.image) {
                        html += '<td style="padding:8px;"><img src="' + item.image + '" width="50" height="50" onerror="this.style.display=\'none\'"></td>';
                    } else {
                        html += '<td style="padding:8px;"></td>';
                    }
                    html += '<td style="padding:8px; font:bold 12px Verdana; color:#F05A28;">' + item.name + '</td>';
                    html += '<td style="padding:8px; font:bold 12px Verdana; color:#F05A28;">$' + parseFloat(item.price).toFixed(2) + '</td>';
                    html += '<td style="padding:8px; font:bold 12px Verdana; color:#F05A28; white-space:nowrap;">';
                    html += '<button class="qty-decrease" data-index="' + i + '" style="' + btnStyle + '" title="Decrease quantity">&minus;</button>';
                    html += '<span style="display:inline-block;min-width:20px;text-align:center;vertical-align:middle;">' + item.quantity + '</span>';
                    if (atStockLimit) {
                        html += '<button class="qty-increase" data-index="' + i + '" style="' + btnDisabledStyle + '" title="Stock limit reached" disabled>&plus;</button>';
                    } else {
                        html += '<button class="qty-increase" data-index="' + i + '" style="' + btnStyle + '" title="Increase quantity">&plus;</button>';
                    }
                    html += '</td>';
                    html += '<td style="padding:8px; font:bold 12px Verdana; color:#F05A28;">$' + itemTotal + '</td>';
                    html += '</tr>';
                }
            }
            html += '</table>';
            container.innerHTML = html;

            // Bind quantity button click handlers
            var increaseButtons = container.getElementsByClassName('qty-increase');
            for (var ib = 0; ib < increaseButtons.length; ib++) {
                increaseButtons[ib].addEventListener('click', function(e) {
                    e.preventDefault();
                    var idx = parseInt(this.getAttribute('data-index'), 10);
                    increaseQuantity(idx);
                });
            }
            var decreaseButtons = container.getElementsByClassName('qty-decrease');
            for (var db = 0; db < decreaseButtons.length; db++) {
                decreaseButtons[db].addEventListener('click', function(e) {
                    e.preventDefault();
                    var idx = parseInt(this.getAttribute('data-index'), 10);
                    decreaseQuantity(idx);
                });
            }
        }

        // Render total
        var totalElements = document.getElementsByClassName('simpleCart_total');
        for (var t = 0; t < totalElements.length; t++) {
            totalElements[t].innerHTML = '$' + getTotal();
        }

        // Render quantity
        var qtyElements = document.getElementsByClassName('simpleCart_quantity');
        for (var q = 0; q < qtyElements.length; q++) {
            qtyElements[q].innerHTML = getQuantity();
        }

        // Bind empty cart buttons
        var emptyButtons = document.getElementsByClassName('simpleCart_empty');
        for (var e = 0; e < emptyButtons.length; e++) {
            emptyButtons[e].onclick = function(event) {
                event.preventDefault();
                empty();
            };
        }

        // Update checkout/purchase button state
        var actionBtns = ['checkoutBtn', 'purchaseBtn'];
        for (var ab = 0; ab < actionBtns.length; ab++) {
            var actionBtn = document.getElementById(actionBtns[ab]);
            if (actionBtn) {
                if (cart.length === 0) {
                    actionBtn.disabled = true;
                    actionBtn.style.opacity = '0.5';
                    actionBtn.style.cursor = 'not-allowed';
                    actionBtn.title = 'Your cart is empty. Add products to proceed.';
                } else {
                    actionBtn.disabled = false;
                    actionBtn.removeAttribute('data-submitting');
                    actionBtn.style.opacity = '1';
                    actionBtn.style.cursor = 'pointer';
                    actionBtn.title = '';
                }
            }
        }
    }

    // Auto-render on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderCart);
    } else {
        renderCart();
    }

    return {
        add: add,
        empty: empty,
        increaseQuantity: increaseQuantity,
        decreaseQuantity: decreaseQuantity,
        getTotal: getTotal,
        getQuantity: getQuantity,
        renderCart: renderCart
    };
})();
