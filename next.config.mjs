/** @type {import('next').NextConfig} */

// 수정된 부분:
// 1. 추가 WebSocket 경로 리다이렉트 추가 (/ws/:path*)
// 2. basePath: false 설정으로 리다이렉트 정확도 향상
// 3. CORS 관련 헤더 설정 추가 (Access-Control-Allow-Origin 등)

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kmong-s3.s3.ap-northeast-2.amazonaws.com",
      },
    ],
  },
  // CORS 관련 설정 추가
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin", 
            value: "*"
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization"
          }
        ]
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://3.36.40.240:8001/api/:path*",
        basePath: false
      },
      {
        source: "/ws",
        destination: "http://3.36.40.240:8001/ws",
        basePath: false
      },
      {
        source: "/ws/:path*",
        destination: "http://3.36.40.240:8001/ws/:path*",
        basePath: false
      }
    ];
  },
  webpack: (config) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
    });
    return config;
  },
};

export default nextConfig;