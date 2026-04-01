ALTER TABLE public.synced_product_inputs
ADD COLUMN sale_price_override numeric DEFAULT NULL,
ADD COLUMN purchase_price_override numeric DEFAULT NULL,
ADD COLUMN delivery_discount_override numeric DEFAULT NULL;