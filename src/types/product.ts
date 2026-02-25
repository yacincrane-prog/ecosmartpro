export interface GlobalSettings {
  currencyRate: number;
  returnCost: number;
  operationCostPerOrder: number;
  confirmationCost: number;
}

export interface ProductInput {
  id: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  receivedOrders: number;
  confirmedOrders: number;
  deliveredOrders: number;
  adSpendUSD: number;
  deliveryDiscount: number;
  packagingCost: number;
  dateFrom: string;
  dateTo: string;
  createdAt: string;
}

export interface ProductAnalysis extends ProductInput {
  // Calculated fields
  unitProfit: number;
  grossProfitNoExpenses: number;
  adSpendDZD: number;
  returnedOrders: number;
  returnExpenses: number;
  operationExpenses: number;
  deliveryDiscountExpenses: number;
  confirmationAndDeliveryExpenses: number;
  totalExpenses: number;
  netProfit: number;
  netProfitPerUnit: number;
  // Ratios
  confirmationRate: number;
  deliveryToConfirmationRate: number;
  deliveryToReceivedRate: number;
  costPerReceivedOrder: number;
  costPerConfirmedOrder: number;
  costPerDeliveredOrder: number;
  returnRate: number;
  // Alerts
  alerts: Alert[];
}

export interface Alert {
  type: 'loss' | 'warning';
  message: string;
}

export type SortField = 'confirmationRate' | 'deliveryToConfirmationRate' | 'returnRate' | 'deliveryToReceivedRate' | 'netProfit';
export type SortOrder = 'asc' | 'desc';
