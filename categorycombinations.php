<?php
/*
 * @author Pavel Alexeev <Pahan@Hubbitus.info>
 * Module to show product attribute combinations right in directory listing.
 * Allow select attributes and see images and price change, place selected in cart
 */

if (!defined('_PS_VERSION_'))
  exit;

class CategoryCombinations extends Module
{
	public function __construct()
	{
		$this->name = 'categorycombinations';
		$this->tab = 'front_office_features';
		$this->version = '0.1.0';
		$this->author = 'Pavel Alexeev http://hubbitus.info';
		$this->need_instance = 0;
		$this->ps_versions_compliancy = array('min' => '1.6', 'max' => _PS_VERSION_);
		$this->bootstrap = true;

		parent::__construct();

		$this->displayName = $this->l('Category Product Combinations');
		$this->description = $this->l('Module to show product attribute combinations right in directory listing.
 Allow select attributes and see images and price change, place selected in cart');

		$this->confirmUninstall = $this->l('Are you sure you want to uninstall?');

		if (!Configuration::get($this->name)) {
			$this->warning = $this->l('No name provided');
		}
	}

	public function install()
	{
		if (Shop::isFeatureActive()) {
			Shop::setContext(Shop::CONTEXT_ALL);
		}
		return parent::install() &&
			$this->registerHook('header') &&
			$this->registerHook('displayProductListReviews') &&
				Configuration::updateValue($this->name, $this->displayName);;
	}

	public function uninstall()
	{
		return parent::uninstall();
	}

	public function hookDisplayHeader()
	{
		// FrontController used in blocklayered module for ajax product loading. Other (liske auth, admin, cart all excluded)
		if ($this->context->controller instanceof CategoryController or $this->context->controller instanceof FrontController){
			Media::addJsDef(array(
				'currencySign' => $this->context->currency->sign,
				'currencyRate' => $this->context->currency->conversion_rate,
				'currencyFormat' => $this->context->currency->format,
				'currencyBlank' => $this->context->currency->blank
			));
			$this->context->controller->addJS($this->_path.'/js/categoryCombinations.js', 'all');
		}
	}

	public function hookDisplayProductListReviews($params)
	{
		if ($this->context->controller instanceof CategoryController or $this->context->controller instanceof FrontController){
			$this->addProductCombinationsInfo($params['product']);
			$this->smarty->assign(array(
				'product' => $params['product'],
			));
			return $this->display(__FILE__, 'productCombinations.tpl');
		}
	}

	/**
	 * Add information about posssible combination into product
	 *
	 * @param type $prod
	 */
	protected function addProductCombinationsInfo(array &$prod){
		// load product object
		$product = new Product($prod['id_product'], $this->context->language->id);
		$attrubuteGroups = $product->getAttributesGroups($this->context->language->id);
		$combinationImages = $product->getCombinationImages($this->context->language->id);
		$productCombinations = [];// Change 0, 1, 2 ordered keys to group_id to fast reference them later
		foreach ($attrubuteGroups as $key => &$group) {
			if (!isset($productCombinations[$group['id_attribute_group']])){
				$productCombinations[$group['id_attribute_group']] = array(
					'group_type' => $group['group_type']
				);
			}
			// Using $key important for ordering
			$productCombinations[$group['id_attribute_group']]['combinations'][$key] = $group;
			$productCombinations[$group['id_attribute_group']]['combinations'][$key]['images'] = $combinationImages[$group['id_product_attribute']][0];
		}

		$prod['combinations'] = $productCombinations;

		$this->addProductPriceInfo($prod, $product);
	}

	/**
	 * Add product price-related information like taxes, discounts and so on
	 *
	 * @param array $prod
	 * @param Product $product
	 */
	protected function addProductPriceInfo(array &$prod, Product $product){
		// Rest for price calculation
		$address = new Address($this->context->cart->{Configuration::get('PS_TAX_ADDRESS_TYPE')});
		$prod['noTaxForThisProduct'] = Tax::excludeTaxeOption() || !$product->getTaxesRate($address);
		$prod['customerGroupWithoutTax'] = Group::getPriceDisplayMethod($this->context->customer->id_default_group);
		$prod['taxRate'] = (float)$product->getTaxesRate($address);

		$groupReduction = GroupReduction::getValueForProduct($product->id, (int)Group::getCurrent()->id);
		if ($groupReduction === false){
			$groupReduction = Group::getReduction((int)$this->context->cookie->id_customer) / 100;
		}
		$prod['groupReduction'] = $groupReduction;

		$prod['packItems'] = $product->cache_is_pack ? Pack::getItemTable($product->id, $this->context->language->id, true) : array();
	}
}