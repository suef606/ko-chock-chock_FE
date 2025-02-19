import axios from "axios";

// 엑세스 토큰 가져옴
const getAccessToken = (): string | null => {
  const tokenStorageStr = localStorage.getItem("token-storage");
  if (!tokenStorageStr) return null;
  const tokenData = JSON.parse(tokenStorageStr);
  return tokenData?.accessToken || null;
};

// ✅ 현재 로그인한 사용자 ID 가져오기 (추가)
const getUserId = (): number | null => {
  const userStorageStr = localStorage.getItem("user-storage");
  if (!userStorageStr) return null; // ❌ 데이터가 없을 경우 null 반환

  try {
    const userStorageData = JSON.parse(userStorageStr);
    return userStorageData?.state?.user?.id || null; // ✅ user ID 가져오기
  } catch (error) {
    console.error("❌ 유저 ID 파싱 실패:", error);
    return null;
  }
};

const token = getAccessToken();
const loggedInUserId = getUserId(); // ✅ 로그인한 사용자 ID 가져오기

// ✅ Axios 인스턴스 생성
const axiosInstance = axios.create({
  baseURL: "http://3.36.40.240:8001", // 백엔드 API 주소
  timeout: 5000, // 요청 제한 시간 (5초)
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

// ✅ 요청 인터셉터 (Authorization 토큰 자동 추가)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken"); // ✅ localStorage에서 토큰 가져오기

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("🚨 인증 토큰 없음! 요청이 거부될 수 있음");
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ 응답 인터셉터 (에러 처리)
axiosInstance.interceptors.response.use(
  (response) => ({
    success: true,
    data: response.data,
  }),
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
