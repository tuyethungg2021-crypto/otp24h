
export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'user';
  balance: number;
}

export interface SiteConfig {
  siteName: string;
  logoInitial: string;
  telegramLink: string;
  masterApiKey: string;
  announcement: string; // Thông báo toàn trang
  // Bank info
  bankName: string;
  bankAccountNumber: string;
  bankBeneficiary: string;
  bankQrUrl: string;
  // Momo info
  momoNumber: string;
  momoBeneficiary: string;
  momoQrUrl: string;
}

export interface SimService {
  id: number;
  name: string;
  code: string;
  price: number;
}

export interface ActiveOrder {
  id: string;
  simId: number;
  phoneNumber: string;
  serviceName: string;
  otp: string | null;
  status: 'WAITING' | 'RECEIVED' | 'EXPIRED' | 'CANCELLED';
  content?: string;
  expiresAt: number;
  createdAt: number;
  ownerId: string;
}

export interface TopupRequest {
  id: string;
  userId: string;
  username: string;
  amount: number;
  method: 'BANK' | 'MOMO';
  content: string;
  status: 'PENDING' | 'SUCCESS' | 'CANCELLED';
  createdAt: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
