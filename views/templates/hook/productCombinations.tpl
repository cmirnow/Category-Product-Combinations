{if isset($product.combinations)}
	<!-- combinations -->
	<div class="product-combinations" data-product_base_price_tax_excl="{$product.price_tax_exc|escape:'html':'UTF-8'}" data-group_reduction="{$product.groupReduction|escape:'html':'UTF-8'}" data-no_tax_for_this_product="{$product.noTaxForThisProduct|escape:'html':'UTF-8'}" data-customer_group_without_tax="{$product.customerGroupWithoutTax|escape:'html':'UTF-8'}" data-tax_rate="{$product.taxRate|escape:'html':'UTF-8'}" data-product_unit_price_ratio="{$product.unit_price_ratio|escape:'html':'UTF-8'}">
		<div class="clearfix"></div>
		{foreach from=$product.combinations key=id_attribute_group item=group}
			{if $group.combinations|@count}
				<fieldset class="attribute_fieldset">
					<label class="attribute_label" {if $group.group_type != 'color' && $group.group_type != 'radio'}for="group_{$id_attribute_group|intval}"{/if}>{$group.group_name|escape:'html':'UTF-8'}&nbsp;</label>
					{assign var="groupName" value="group_$id_attribute_group"}
					<div class="attribute_list">
						{if ($group.group_type == 'select')}
							<select name="{$groupName}" id="group_{$id_attribute_group|intval}" class="form-control attribute_select no-print">
								{foreach from=$group.combinations key=id_attribute item=combination}
									<option value="{$id_attribute|intval}"{if (isset($smarty.get.$groupName) && $smarty.get.$groupName|intval == $id_attribute) || $combination.default_on == '1'} selected="selected"{/if} title="{$combination.attribute_name|escape:'html':'UTF-8'}">{$combination.attribute_name|escape:'html':'UTF-8'}</option>
								{/foreach}
							</select>
						{elseif ($group.group_type == 'color')}
							<ul id="color_to_pick_list" class="clearfix">
								{assign var="default_colorpicker" value=""}
								{foreach from=$group.combinations key=id_attribute item=combination}
									{assign var='img_color_exists' value=file_exists($col_img_dir|cat:$id_attribute|cat:'.jpg')}
									<li{if $combination.default_on == '1'} class="selected"{/if}>
										<a href="{$link->getProductLink($product)|escape:'html':'UTF-8'}" id="color_{$id_attribute|intval}" name="{$colors.$id_attribute.name|escape:'html':'UTF-8'}" class="color_pick{if ($combination.default_on == '1')} selected{/if}"{if !$img_color_exists && isset($colors.$id_attribute.value) && $colors.$id_attribute.value} style="background:{$colors.$id_attribute.value|escape:'html':'UTF-8'};"{/if} title="{$colors.$id_attribute.name|escape:'html':'UTF-8'}">
											{if $img_color_exists}
												<img src="{$img_col_dir}{$id_attribute|intval}.jpg" alt="{$colors.$id_attribute.name|escape:'html':'UTF-8'}" title="{$colors.$id_attribute.name|escape:'html':'UTF-8'}" width="20" height="20" />
											{/if}
										</a>
									</li>
									{if ($combination.default_on == '1')}
										{$default_colorpicker = $id_attribute}
									{/if}
								{/foreach}
							</ul>
							<input type="hidden" class="color_pick_hidden" name="{$groupName|escape:'html':'UTF-8'}" value="{$default_colorpicker|intval}" />
						{elseif ($group.group_type == 'radio')}
							<ul>
								{foreach from=$group.combinations key=id_attribute item=combination}
									<li>
										<input id="id{$product.id_product}-{$combination.id_product_attribute}" type="radio" class="attribute_radio" name="{$groupName|escape:'html':'UTF-8'}" value="{$combination.id_product_attribute}" data-id_combination="{$combination.id_product_attribute}" {if ($combination.default_on == '1')} checked="checked"{/if} data-price="{$combination.price|escape:'html':'UTF-8'}" data-specific_price="{if isset($combination.specific_price)}{$combination.specific_price|escape:'html':'UTF-8'}{/if}" data-ecotax="{$combination.ecotax|escape:'html':'UTF-8'}" data-id_image="{if $combination.images}{$combination.images.id_image|escape:'html':'UTF-8'}{/if}"/>
										<label for="id{$product.id_product}-{$combination.id_product_attribute}">{$combination.attribute_name|escape:'html':'UTF-8'}</label>
									</li>
								{/foreach}
							</ul>
						{/if}
					</div>
				</fieldset>
			{/if}
		{/foreach}
	</div>
	<!-- end combinations -->
{/if}