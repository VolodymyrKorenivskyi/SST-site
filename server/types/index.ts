// Базові типи для проекту

export interface Terminal {
  id?: number;
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id?: number;
  terminalId: number;
  amount: number;
  type: 'card_topup' | 'account_topup';
  status: 'pending' | 'completed' | 'failed';
  createdAt?: string;
}

export interface Card {
  id?: number;
  cardNumber: string;
  balance: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Account {
  id?: number;
  accountNumber: string;
  balance: number;
  createdAt?: string;
  updatedAt?: string;
}
