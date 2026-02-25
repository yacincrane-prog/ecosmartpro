import { ProductInput, ProductAnalysis, Alert, GlobalSettings } from '@/types/product';

export function calculateAnalysis(input: ProductInput, settings: GlobalSettings): ProductAnalysis {
  const unitProfit = input.sellingPrice - input.purchasePrice;
  const grossProfitNoExpenses = unitProfit * input.deliveredOrders;
  const adSpendDZD = input.adSpendUSD * settings.currencyRate;
  const returnedOrders = input.confirmedOrders - input.deliveredOrders;
  const returnExpenses = returnedOrders * settings.returnCost;
  const operationExpenses = input.deliveredOrders * settings.operationCostPerOrder;
  const deliveryDiscountExpenses = input.deliveryDiscount * input.deliveredOrders;
  const confirmationAndDeliveryExpenses = (settings.confirmationCost + input.deliveryDiscount + input.packagingCost) * input.deliveredOrders;
  const totalExpenses = adSpendDZD + returnExpenses + operationExpenses + confirmationAndDeliveryExpenses;
  const netProfit = grossProfitNoExpenses - totalExpenses;
  const netProfitPerUnit = input.deliveredOrders > 0 ? netProfit / input.deliveredOrders : 0;

  const confirmationRate = input.receivedOrders > 0 ? (input.confirmedOrders / input.receivedOrders) * 100 : 0;
  const deliveryToConfirmationRate = input.confirmedOrders > 0 ? (input.deliveredOrders / input.confirmedOrders) * 100 : 0;
  const deliveryToReceivedRate = input.receivedOrders > 0 ? (input.deliveredOrders / input.receivedOrders) * 100 : 0;
  const costPerReceivedOrder = input.receivedOrders > 0 ? adSpendDZD / input.receivedOrders : 0;
  const costPerConfirmedOrder = input.confirmedOrders > 0 ? adSpendDZD / input.confirmedOrders : 0;
  const costPerDeliveredOrder = input.deliveredOrders > 0 ? adSpendDZD / input.deliveredOrders : 0;
  const returnRate = input.confirmedOrders > 0 ? (returnedOrders / input.confirmedOrders) * 100 : 0;

  const alerts: Alert[] = [];
  if (netProfit < 0) alerts.push({ type: 'loss', message: 'الفائدة الصافية سالبة - خسارة!' });
  if (deliveryToReceivedRate < 60 && input.receivedOrders > 0) alerts.push({ type: 'warning', message: 'نسبة التوصيل أقل من 60%' });
  if (returnRate > 30) alerts.push({ type: 'warning', message: 'نسبة الإرجاع أكبر من 30%' });

  return {
    ...input,
    unitProfit,
    grossProfitNoExpenses,
    adSpendDZD,
    returnedOrders,
    returnExpenses,
    operationExpenses,
    deliveryDiscountExpenses,
    confirmationAndDeliveryExpenses,
    totalExpenses,
    netProfit,
    netProfitPerUnit,
    confirmationRate,
    deliveryToConfirmationRate,
    deliveryToReceivedRate,
    costPerReceivedOrder,
    costPerConfirmedOrder,
    costPerDeliveredOrder,
    returnRate,
    alerts,
  };
}
