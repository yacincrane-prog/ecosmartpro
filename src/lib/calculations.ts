import { ProductInput, ProductAnalysis, Alert, GlobalSettings, PeriodInput } from '@/types/product';

export function calculateAnalysis(input: ProductInput, settings: GlobalSettings): ProductAnalysis {
  const unitProfit = input.sellingPrice - input.purchasePrice;
  const grossProfitNoExpenses = unitProfit * input.deliveredOrders;
  const adSpendDZD = input.adSpendUSD * settings.currencyRate;
  const returnedOrders = input.confirmedOrders - input.deliveredOrders;
  const returnExpenses = returnedOrders * settings.returnCost;
  const operationExpenses = input.deliveredOrders * settings.operationCostPerOrder;
  // deliveryDiscountExpenses is for display only — already included in confirmationAndDeliveryExpenses
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

export function periodToProductInput(period: PeriodInput, productName: string): ProductInput {
  return {
    id: period.productId,
    name: productName,
    purchasePrice: period.purchasePrice,
    sellingPrice: period.sellingPrice,
    receivedOrders: period.receivedOrders,
    confirmedOrders: period.confirmedOrders,
    deliveredOrders: period.deliveredOrders,
    adSpendUSD: period.adSpendUSD,
    deliveryDiscount: period.deliveryDiscount,
    packagingCost: period.packagingCost,
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    createdAt: period.createdAt,
  };
}

export function aggregatePeriods(periods: PeriodInput[], productName: string): ProductInput {
  if (periods.length === 0) {
    return {
      id: '', name: productName, purchasePrice: 0, sellingPrice: 0,
      receivedOrders: 0, confirmedOrders: 0, deliveredOrders: 0,
      adSpendUSD: 0, deliveryDiscount: 0, packagingCost: 0,
      dateFrom: '', dateTo: '', createdAt: '',
    };
  }
  if (periods.length === 1) return periodToProductInput(periods[0], productName);

  const sorted = [...periods].sort((a, b) => a.dateFrom.localeCompare(b.dateFrom));
  // For aggregation: sum quantities, weighted average prices
  const totalDelivered = periods.reduce((s, p) => s + p.deliveredOrders, 0);
  const avgPurchasePrice = totalDelivered > 0
    ? periods.reduce((s, p) => s + p.purchasePrice * p.deliveredOrders, 0) / totalDelivered
    : periods[0].purchasePrice;
  const avgSellingPrice = totalDelivered > 0
    ? periods.reduce((s, p) => s + p.sellingPrice * p.deliveredOrders, 0) / totalDelivered
    : periods[0].sellingPrice;
  const avgDeliveryDiscount = totalDelivered > 0
    ? periods.reduce((s, p) => s + p.deliveryDiscount * p.deliveredOrders, 0) / totalDelivered
    : periods[0].deliveryDiscount;
  const avgPackagingCost = totalDelivered > 0
    ? periods.reduce((s, p) => s + p.packagingCost * p.deliveredOrders, 0) / totalDelivered
    : periods[0].packagingCost;

  return {
    id: periods[0].productId,
    name: productName,
    purchasePrice: avgPurchasePrice,
    sellingPrice: avgSellingPrice,
    receivedOrders: periods.reduce((s, p) => s + p.receivedOrders, 0),
    confirmedOrders: periods.reduce((s, p) => s + p.confirmedOrders, 0),
    deliveredOrders: totalDelivered,
    adSpendUSD: periods.reduce((s, p) => s + p.adSpendUSD, 0),
    deliveryDiscount: avgDeliveryDiscount,
    packagingCost: avgPackagingCost,
    dateFrom: sorted[0].dateFrom,
    dateTo: sorted[sorted.length - 1].dateTo,
    createdAt: sorted[0].createdAt,
  };
}
