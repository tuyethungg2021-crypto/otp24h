
// Hệ thống hỗ trợ Proxy để vượt rào cản CORS khi chạy trên trình duyệt
const PROXIES = [
  {
    name: "AllOrigins Raw",
    wrap: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  },
  {
    name: "Codetabs",
    wrap: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  },
  {
    name: "ThingProxy",
    wrap: (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`
  }
];

let currentProxyIndex = 0;

const safeFetch = async (url: string, retryCount = 0): Promise<any> => {
  const proxy = PROXIES[currentProxyIndex];
  try {
    // Thêm cache-buster để đảm bảo dữ liệu luôn mới nhất từ server
    const separator = url.includes('?') ? '&' : '?';
    const finalUrl = `${url}${separator}_cb=${Date.now()}`;
    const requestUrl = proxy.wrap(finalUrl);

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status} from ${proxy.name}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.warn(`[Proxy: ${proxy.name}] Thất bại:`, error.message);

    if (retryCount < PROXIES.length - 1) {
      currentProxyIndex = (currentProxyIndex + 1) % PROXIES.length;
      return safeFetch(url, retryCount + 1);
    }
    throw new Error("Không thể kết nối tới máy chủ API. Vui lòng kiểm tra lại mạng hoặc khóa API của bạn.");
  }
};

const BASE_URL = "https://apisim.codesim.net";

export const otpApi = {
  getAccountInfo: (apiKey: string) => 
    safeFetch(`${BASE_URL}/yourself/information-by-api-key?api_key=${apiKey}`),
  
  getServices: (apiKey: string) => 
    safeFetch(`${BASE_URL}/service/get_service_by_api_key?api_key=${apiKey}`),
  
  rentSim: (serviceId: number, apiKey: string) => 
    safeFetch(`${BASE_URL}/sim/get_sim?service_id=${serviceId}&api_key=${apiKey}`),
  
  checkOtp: (otpId: number | string, apiKey: string) => 
    safeFetch(`${BASE_URL}/otp/get_otp_by_phone_api_key?otp_id=${otpId}&api_key=${apiKey}`),
  
  cancelSim: (simId: number, apiKey: string) => 
    safeFetch(`${BASE_URL}/sim/cancel_api_key/${simId}?api_key=${apiKey}`)
};
