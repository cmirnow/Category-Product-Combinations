/* 
 * @author Pavel Alexeev <Pahan@Hubbitus.info>
 * @url http://hubbitus.info
 * Module to show product attribute combinations right in directory listing.
 * Allow select attributes and see images and price change, place selected in cart
 */

// Unfortunately data may placed where hook present. But Grid/List swith will
// copy only some part of data and manually hack new markup (with .html()).
// .left-block seames copied, so move there to do not lose data
// Some sort of hack to do not change PrestaShop ugly swith implementation
originalDisplay = display;
/**
 * Copy .right-block.product-combinations information too. And use DOM
 * manipulation (contrary to base display implementation) to transfer also
 * all event handlers
 */
display = function(view){
	productCombinations = $('.product_list > li .product-combinations').detach();
	originalDisplay(view);
	$('.product_list > li').each(function(index, element){
		$(productCombinations[index]).prependTo( $(element).find('.button-container') );
	});
	rebindAjaxAddToCart();
};

$(document).ready(function(){
	categoryCombinationsFixPlacement();
	
	$('.attribute_radio').live('change',
		function (event) {
			updateCombination(event.target);
		}
	);
});

// Blocklayered.js use AJAX to reload products, but does not provide any hooks
// into success event. So, observe product mutations directly (unfortunately
// also jQuery in core functionality support only depracated DOMSubtreeModified buggy event)
var MutationObserver  = window.MutationObserver || window.WebKitMutationObserver;
var observer          = new MutationObserver(mutationHandler);

if ($('.product_list').length > 0)
	observer.observe($('.product_list').parent()[0], { childList: true, characterData: false, attributes: false, subtree: true });

function mutationHandler(mutationRecords) {
	// Trigger only on eelements (any) add. Check of needs to do anything in function itself
	if ( $(mutationRecords).filter(function(index, mutation){ return mutation.addedNodes.length > 0; }).length > 0 ){
		categoryCombinationsFixPlacement();
	}
}

/**
* Unfortunately data may be placed only where hook present.
* Move to .button-container
* To show by default only on hovered item
**/
function categoryCombinationsFixPlacement(){
	$('.product-combinations').each(function(i, element){
		if (0 === $(element).parents('.product-container').find('.button-container').find(element).length){ // Break Mutation loop
			$(element).prependTo($(element).parents('.product-container').find('.button-container'));
			
			rebindAjaxAddToCart();
		}
	});
}

// Rebind with variant in Product used. in ajax-cart.js for category it does not use combination id
function rebindAjaxAddToCart(){
	$(document).off('click', '.ajax_add_to_cart_button');
	$('.ajax_add_to_cart_button').live('click',
		function (e) {
			e.preventDefault();
			ajaxCart.add($(e.target).parents('a.ajax_add_to_cart_button').data('id-product'), $(e.target).parents('a.ajax_add_to_cart_button').attr('data-id-combination'), true, null, 1, null);
		}
	);
}

/**
 * Initially borrowed updatePrice() from product.js. Heavly rewritten
 *
 * @param input - radioInput field which have specific information in their dataset
 * @returns void
 */
function updateCombination(input){
	var product = $(input).parents('.product-combinations')[0];

	// Parse all values from strings to their types
	// JSON used as fast and easy values convertor from string data attributes - http://stackoverflow.com/a/7833897/307525
	var comb = input.dataset;
	var combination = {};
	$.each(comb, function(k, v){
		if ("undefined" !== typeof v && "" !== v){
			combination[k] = JSON.parse(v);
		}
	});

	updateCombinationPrice(product, combination);

	/////////+ Update image too:
	if (combination.id_image){
		var img = $(product).parents('.product-container').find('.product-image-container img');
		img.attr('src', img.attr('src').replace(/\/\d+/, '/' + combination.id_image));
	}

	/////////+ Update combination for order
	$(product).parents('.product-container').find('a.ajax_add_to_cart_button').attr('data-id-combination', combination.id_combination);
}

/**
 * Initially borrowed updatePrice() from product.js
 *
 * @param product
 * @param combination
 * @returns void
 */
function updateCombinationPrice(product, combination){
	if (!product) return; // Possible on full product page
	var productData = product.dataset;
	
	product = $(product).parents('.product-container'); // Data defined, this for simplicity manage representation

	// Try satisfy initial updatePrice() needs as is we try initialise vars with teir initial names to do not change algorithms
	var group_reduction = JSON.parse(productData.group_reduction);
	var noTaxForThisProduct = JSON.parse(productData.no_tax_for_this_product);
	var customerGroupWithoutTax = JSON.parse(productData.customer_group_without_tax);
	var taxRate = JSON.parse(productData.tax_rate);
	var productUnitPriceRatio = JSON.parse(productData.product_unit_price_ratio);
	var default_eco_tax = JSON.parse(combination.ecotax);
	// Set product (not the combination) base price
	var basePriceWithoutTax = JSON.parse(productData.product_base_price_tax_excl);

	// Main calculation
	var priceWithGroupReductionWithoutTax = 0;

	// Apply combination price impact
	// 0 by default, +x if price is inscreased, -x if price is decreased
	basePriceWithoutTax = basePriceWithoutTax + combination.price;

	// If a specific price redefine the combination base price
	if (combination.specific_price && combination.specific_price.price > 0)
		basePriceWithoutTax = combination.specific_price.price;

	// Apply group reduction
	priceWithGroupReductionWithoutTax = basePriceWithoutTax * (1 - group_reduction);
	var priceWithDiscountsWithoutTax = priceWithGroupReductionWithoutTax;

	// Apply Tax if necessary
	if (noTaxForThisProduct || customerGroupWithoutTax){
		basePriceDisplay = basePriceWithoutTax;
		priceWithDiscountsDisplay = priceWithDiscountsWithoutTax;
	}
	else{
		basePriceDisplay = basePriceWithoutTax * (taxRate/100 + 1);
		priceWithDiscountsDisplay = priceWithDiscountsWithoutTax * (taxRate/100 + 1);
	}

	if (default_eco_tax){
		// combination.ecotax doesn't modify the price but only the display
		basePriceDisplay = basePriceDisplay + default_eco_tax * (1 + ecotaxTax_rate / 100);
		priceWithDiscountsDisplay = priceWithDiscountsDisplay + default_eco_tax * (1 + ecotaxTax_rate / 100);
	}

	// Apply specific price (discount)
	// Note: Reduction amounts are given after tax
	if (combination.specific_price && combination.specific_price.reduction > 0){
		if (combination.specific_price.reduction_type == 'amount'){
			priceWithDiscountsDisplay = priceWithDiscountsDisplay - combination.specific_price.reduction;
			// We recalculate the price without tax in order to keep the data consistency
			priceWithDiscountsWithoutTax = priceWithDiscountsDisplay * ( 1/(1+taxRate) / 100 );
		}
		else if (combination.specific_price.reduction_type == 'percentage'){
			priceWithDiscountsDisplay = priceWithDiscountsDisplay * (1 - combination.specific_price.reduction);
			// We recalculate the price without tax in order to keep the data consistency
			priceWithDiscountsWithoutTax = priceWithDiscountsDisplay * ( 1/(1+taxRate) / 100 );
		}
	}

	// Compute discount value and percentage
	// Done just before display update so we have final prices
	if (basePriceDisplay != priceWithDiscountsDisplay)
	{
		var discountValue = basePriceDisplay - priceWithDiscountsDisplay;
		var discountPercentage = (1-(priceWithDiscountsDisplay/basePriceDisplay))*100;
	}

	/*  Update the page content, no price calculation happens after */

	// Hide everything then show what needs to be shown
	product.find('.price-percent-reduction').hide();
/*?	$('#reduction_amount').hide();*/
	product.find('.old-price').hide();
/*?	product.find('.price-ecotax').hide();
	product.find('.unit-price').hide();*/


	product.find('.product-price').text(formatCurrency(priceWithDiscountsDisplay * currencyRate, currencyFormat, currencySign, currencyBlank));

	// If the calculated price (after all discounts) is different than the base price
	// we show the old price striked through
	if (priceWithDiscountsDisplay.toFixed(2) != basePriceDisplay.toFixed(2))
	{
		product.find('.old-price').text(formatCurrency(basePriceDisplay * currencyRate, currencyFormat, currencySign, currencyBlank));
		product.find('.old-price').show();

		// Then if it's not only a group reduction we display the discount in red box
		if (priceWithDiscountsWithoutTax != priceWithGroupReductionWithoutTax)
		{
/*
			if (combination.specific_price.reduction_type == 'amount')
			{
				$('#reduction_amount_display').html('-' + formatCurrency(parseFloat(discountValue), currencyFormat, currencySign, currencyBlank));
				$('#reduction_amount').show();
			}
			else{
*/
				product.find('.price-percent-reduction').html('-' + parseFloat(discountPercentage).toFixed(0) + '%');
				product.find('.price-percent-reduction').show();
/*			}*/
		}
	}

	// Green Tax (Eco tax)
	// Update display of Green Tax
	if (default_eco_tax)
	{
		ecotax = default_eco_tax;

		// If the default product ecotax is overridden by the combination
		if (combination.ecotax)
			ecotax = combination.ecotax;

		if (!noTaxForThisProduct)
			ecotax = ecotax * (1 + ecotaxTax_rate/100)

		product.find('.ecotax_price_display').text(formatCurrency(ecotax * currencyRate, currencyFormat, currencySign, currencyBlank));
		product.find('.price-ecotax').show();
	}

	// Unit price are the price per piece, per Kg, per m²
	// It doesn't modify the price, it's only for display
/*	if (productUnitPriceRatio > 0)
	{
		unit_price = priceWithDiscountsDisplay / productUnitPriceRatio;
		$('#unit_price_display').text(formatCurrency(unit_price * currencyRate, currencyFormat, currencySign, currencyBlank));
		$('.unit-price').show();
	}
*/
	// If there is a quantity discount table,
	// we update it according to the new price
/*??	updateDiscountTable(priceWithDiscountsDisplay);*/
}