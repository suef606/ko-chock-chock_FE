import axios, { AxiosResponse } from "axios";

// 엑세스 토큰 가져옴
const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null; // 서버 사이드에서 실행 시 예외 처리
  
  const tokenStorageStr = localStorage.getItem("token-storage");
  if (!tokenStorageStr) return null;
  const tokenData = JSON.parse(tokenStorageStr);
  return tokenData?.accessToken || null;
};

// 브라우저 환경에서만 실행되도록 조건 추가
const token = typeof window !== 'undefined' ? getAccessToken() : null;

// 응답 타입 정의
interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

// ✅ Axios 인스턴스 생성
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL, // 백엔드 API 주소
  timeout: 5000, // 요청 제한 시간 (5초)
  headers: {
    Authorization: token ? `Bearer ${token}` : undefined,
    "Content-Type": "application/json",
  },
});

// ✅ 요청 인터셉터 (Authorization 토큰 자동 추가)
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const tokenStorageStr = localStorage.getItem("token-storage");
      if (tokenStorageStr) {
        const tokenData = JSON.parse(tokenStorageStr);
        const token = tokenData?.accessToken;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn("🚨 인증 토큰 없음! 요청이 거부될 수 있음");
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ 응답 인터셉터 (에러 처리) - 타입 수정
axiosInstance.interceptors.response.use(
  <T>(response: AxiosResponse<T>): AxiosResponse<ApiResponse<T>> => {
    // 원래 AxiosResponse 객체의 구조를 유지하면서 data만 수정
    return {
      ...response,
      data: {
        success: true,
        data: response.data
      }
    };
  },
  (error) => {
    console.error("API Error:", error);

    const serverResponse = error.response?.data || {};
    return Promise.reject({
      success: false,
      message: serverResponse.message || "서버와의 연결이 끊어졌습니다.",
      data: serverResponse.data || null,
    });
  }
);

export default axiosInstance;