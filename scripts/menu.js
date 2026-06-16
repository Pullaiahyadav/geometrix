/**
 * Dropdown menu functions
 * Replacement for the external menu.js dependency
 */
var timeout = 500;
var closetimer = 0;
var ddmenuitem = 0;

function mopen(id) {
    mcancelclosetime();
    if (ddmenuitem) ddmenuitem.style.visibility = 'hidden';
    ddmenuitem = document.getElementById(id);
    if (ddmenuitem) ddmenuitem.style.visibility = 'visible';
}

function mclose() {
    if (ddmenuitem) ddmenuitem.style.visibility = 'hidden';
}

function mclosetime() {
    closetimer = window.setTimeout(mclose, timeout);
}

function mcancelclosetime() {
    if (closetimer) {
        window.clearTimeout(closetimer);
        closetimer = null;
    }
}

/**
 * Search method tracking
 * Adds a hidden 'method' parameter to all search forms
 * to track whether the user pressed Enter or clicked Go
 */
document.addEventListener('DOMContentLoaded', function() {
    var searchForms = document.querySelectorAll('form[action*="searchresults.html"]');
    for (var i = 0; i < searchForms.length; i++) {
        (function(form) {
            // Add hidden method field if not already present
            if (!form.querySelector('input[name="method"]')) {
                var methodField = document.createElement('input');
                methodField.type = 'hidden';
                methodField.name = 'method';
                methodField.value = 'enter';
                form.appendChild(methodField);
            }

            // Detect click on submit button
            var submitBtn = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
            if (submitBtn) {
                submitBtn.addEventListener('mousedown', function() {
                    var mf = form.querySelector('input[name="method"]');
                    if (mf) mf.value = 'click';
                });
            }
        })(searchForms[i]);
    }
});

/**
 * Product View datalayer tracking
 * Fires on product detail pages (pageType === "product")
 * Extracts product name, price, and SKU from the DOM
 */
document.addEventListener('DOMContentLoaded', function() {
    var dataLayer = window.adobeDataLayer || [];
    var isProductPage = false;
    for (var i = 0; i < dataLayer.length; i++) {
        if (dataLayer[i].event === 'pageView' && dataLayer[i].page && dataLayer[i].page.pageType === 'product') {
            isProductPage = true;
            break;
        }
    }
    if (!isProductPage) return;

    var productDiv = document.querySelector('.product');
    if (!productDiv) return;

    var nameEl = productDiv.querySelector('.search_title');
    var productName = nameEl ? nameEl.textContent.trim() : '';

    var productText = productDiv.textContent;
    var priceMatch = productText.match(/Price:\s*\$([0-9,]+\.?\d*)/);
    var price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

    var skuMatch = productText.match(/sku:\s*(\w+)/);
    var sku = skuMatch ? skuMatch[1] : '';

    if (productName && sku) {
        window.adobeDataLayer = window.adobeDataLayer || [];
        window.adobeDataLayer.push({
            event: "productView",
            product: {
                id: sku,
                name: productName,
                price: price,
                currency: "USD"
            }
        });
    }
});

// Close menu on document click
document.onclick = mclose;

/**
 * Link Click Tracking
 * Tracks clicks on global CTAs, footer CTAs, and menu navigation
 * Pushes "link click" event to adobeDataLayer
 */
document.addEventListener('DOMContentLoaded', function() {

    function getPageName() {
        var dl = window.adobeDataLayer || [];
        for (var i = 0; i < dl.length; i++) {
            if (dl[i].event === 'pageView' && dl[i].page && dl[i].page.pageName) {
                return dl[i].page.pageName;
            }
        }
        return document.title;
    }

    function getLinkType(anchor) {
        var href = anchor.getAttribute('href') || '';
        if (href === '#' || href === '') return 'internal';
        if (anchor.hostname && anchor.hostname !== window.location.hostname) return 'external';
        return 'internal';
    }

    function trackLinkClick(anchor) {
        var linkName = anchor.textContent.trim();
        if (!linkName) return;
        window.adobeDataLayer = window.adobeDataLayer || [];
        window.adobeDataLayer.push({
            event: "link click",
            link: {
                linkName: linkName,
                linkLocation: getPageName(),
                linkType: getLinkType(anchor)
            }
        });
    }

    // 1. Global CTAs (header: shopping cart, checkout, video blogs, login, sign up, logout)
    var globalCTAs = document.querySelectorAll('.checkout a, .head_logo a');
    for (var i = 0; i < globalCTAs.length; i++) {
        globalCTAs[i].addEventListener('click', function() {
            trackLinkClick(this);
        });
    }

    // 2. Footer CTAs
    var footerCTAs = document.querySelectorAll('.footer a');
    for (var j = 0; j < footerCTAs.length; j++) {
        footerCTAs[j].addEventListener('click', function() {
            trackLinkClick(this);
        });
    }

    // 3. Menu navigation (top nav and sub-menu links)
    var menuLinks = document.querySelectorAll('#sddm a');
    for (var k = 0; k < menuLinks.length; k++) {
        menuLinks[k].addEventListener('click', function() {
            trackLinkClick(this);
        });
    }
});

/**
 * Form Start datalayer tracking
 * Fires once when the user first interacts with any form field after page load
 * Uses page URL to determine form name (avoids malformed HTML DOM issues)
 */
document.addEventListener('DOMContentLoaded', function() {
    var path = window.location.pathname || window.location.href;

    var formNameMap = [
        { match: 'chargecard_application1', formName: 'Charge Card Application Step 1' },
        { match: 'chargecard_application2', formName: 'Charge Card Application Step 2' },
        { match: 'newsletter1',            formName: 'Newsletter Signup' },
        { match: 'travel1',                formName: 'Travel Booking' }
    ];

    var formName = '';
    for (var i = 0; i < formNameMap.length; i++) {
        if (path.indexOf(formNameMap[i].match) > -1) {
            formName = formNameMap[i].formName;
            break;
        }
    }
    if (!formName) return;

    var fired = false;
    // Select all form fields on the page except those inside the header search box
    var allFields = document.querySelectorAll('input, select, textarea');

    for (var j = 0; j < allFields.length; j++) {
        // Skip fields inside the header search box
        var field = allFields[j];
        if (field.closest && field.closest('.search_box')) continue;
        if (field.id === 'searchfield') continue;

        field.addEventListener('focus', fireFormStart);
        field.addEventListener('change', fireFormStart);
    }

    function fireFormStart() {
        if (fired) return;
        fired = true;
        window.adobeDataLayer = window.adobeDataLayer || [];
        window.adobeDataLayer.push({
            event: "formStart",
            form: {
                formName: formName
            }
        });
    }
});

/**
 * Form Complete datalayer tracking
 * Fires on form submit for single-page forms that navigate to a thank-you page
 */
document.addEventListener('DOMContentLoaded', function() {
    var formCompleteMap = [
        { actionMatch: 'newsletter2', formName: 'Newsletter Signup' },
        { actionMatch: 'travel2',     formName: 'Travel Booking' }
    ];

    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
        (function(form) {
            var action = form.getAttribute('action') || '';
            for (var j = 0; j < formCompleteMap.length; j++) {
                if (action.indexOf(formCompleteMap[j].actionMatch) > -1) {
                    var formName = formCompleteMap[j].formName;
                    form.addEventListener('submit', function() {
                        window.adobeDataLayer = window.adobeDataLayer || [];
                        window.adobeDataLayer.push({
                            event: "formComplete",
                            form: {
                                formName: formName
                            }
                        });
                    });
                    break;
                }
            }
        })(forms[i]);
    }
});

/**
 * Form Step datalayer tracking
 * Fires on page load for pages that are part of a multi-step form flow
 * Only applies to forms with 2+ step pages (not single-page forms)
 */
document.addEventListener('DOMContentLoaded', function() {
    var path = window.location.pathname || window.location.href;

    var stepMap = [
        // Charge Card Application flow
        { match: 'chargecard_application1',  formName: 'Charge Card Application', stepName: 'Employment Details',    stepNumber: 1 },
        { match: 'chargecard_application2',  formName: 'Charge Card Application', stepName: 'Personal Information',  stepNumber: 2 }
    ];

    for (var i = 0; i < stepMap.length; i++) {
        if (path.indexOf(stepMap[i].match) > -1) {
            window.adobeDataLayer = window.adobeDataLayer || [];
            window.adobeDataLayer.push({
                event: "formStep",
                form: {
                    formName: stepMap[i].formName,
                    stepName: stepMap[i].stepName,
                    stepNumber: stepMap[i].stepNumber
                }
            });
            break;
        }
    }
});
