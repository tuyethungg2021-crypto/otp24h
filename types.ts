
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
  announcement: string;
  // Profit settings
  globalMarkup: number; // Ví dụ: 1.5 là cộng thêm 50%
  customPrices: Record<number, number>; // Mapping ID dịch vụ -> Giá bán cố định
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
  originalPrice?: number; // Giá gốc từ API để Admin so sánh
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
