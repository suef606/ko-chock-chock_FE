// 수정된 부분:
// 1. fetchAPI 함수에서 하드코딩된 기본 URL 제거
//    - 이전: const baseUrl = `${httpProtocol}://3.36.40.240:8001${url}`;
//    - 변경: 상대 경로 사용 (URL 그대로 사용)
// 2. 이유: 프록시 리다이렉트를 활용하여 next.config.mjs와 vercel.json에서 정의한 리다이렉트 규칙이 적용되도록 합니다.
// 3. 추가: 배포 환경 감지 및 API 경로 설정 로직 추가
//    - Vercel 배포 환경에서는 직접 백엔드 서버 URL 사용

const getAccessToken = (): string | null => {
  const tokenStorageStr = localStorage.getItem("token-storage");
  if (!tokenStorageStr) return null;
  const tokenData = JSON.parse(tokenStorageStr);
  return tokenData?.accessToken || null;
};

// 배포 환경 확인 함수
const isProductionEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'ko-chock-chock.vercel.app' || window.location.protocol === 'https:';
};

// API 기본 URL 가져오기
const getApiBaseUrl = (): string => {
  // 배포 환경에서는 직접 백엔드 URL 사용, 개발 환경에서는 상대 경로 사용
  return isProductionEnvironment() ? 'http://3.36.40.240:8001' : '';
};

// ✅ 공통 Fetch API 함수 (제네릭 활용)
export const fetchAPI = async <T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; message?: string }> => {
  const token = getAccessToken();
  if (!token) {
    console.warn("🚨 인증 토큰 없음! 요청이 거부될 수 있음");
  }

  try {
    // 환경에 따라 기본 URL 설정
    const baseUrl = getApiBaseUrl();
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    console.log(`🌐 API 요청: ${method} ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // ✅ 응답 처리
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "서버 요청 실패");
    }

    const responseData: T = await response.json();
    return { success: true, data: responseData };
  } catch (error) {
    console.error("❌ API 요청 실패:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "알 수 없는 오류 발생",
    };
  }
};

// ✅ 데이터 가져오기 (GET)
export const fetchData = async <T>(
  url: string
): Promise<{ success: boolean; data?: T; message?: string }> => {
  return fetchAPI<T>(url, "GET");
};

// ✅ 데이터 생성하기 (POST)
export const postData = async <T>(
  url: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; data?: T; message?: string }> => {
  return fetchAPI<T>(url, "POST", body);
};

// ✅ 데이터 수정하기 (PUT)
export const putData = async <T>(
  url: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; data?: T; message?: string }> => {
  return fetchAPI<T>(url, "PUT", body);
};

// ✅ 데이터 삭제하기 (DELETE)
export const deleteData = async <T>(
  url: string
): Promise<{ success: boolean; data?: T; message?: string }> => {
  return fetchAPI<T>(url, "DELETE");
};