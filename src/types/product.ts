export interface GlobalSettings {
  currencyRate: number;
  returnCost: number;
  operationCostPerOrder: number;
  confirmationCost: number;
}

export interface ProductBase {
  id: string;
  name: string;
  createdAt: string;
}

export interface PeriodInput {
  id: string;
  productId: string;
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

export interface ProductWithPeriods extends ProductBase {
  periods: PeriodInput[];
}

// For backward compatibility with calculations
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
  periodId?: string;
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
  confirmationRate: number;
  deliveryToConfirmationRate: number;
  deliveryToReceivedRate: number;
  costPerReceivedOrder: number;
  costPerConfirmedOrder: number;
  costPerDeliveredOrder: number;
  returnRate: number;
  alerts: Alert[];
}

export interface Alert {
  type: 'loss' | 'warning';
  message: string;
}

export type SortField = 'confirmationRate' | 'deliveryToConfirmationRate' | 'returnRate' | 'deliveryToReceivedRate' | 'netProfit';
export type SortOrder = 'asc' | 'desc';
