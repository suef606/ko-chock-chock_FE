"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/commons/store/userStore";
import Image from "next/image";

interface ChatRoom {
  tradeUserId: string;
  tradeUserName: string;
  chatRoomId: string;
  lastMessage: string;
  updatedAt: string;
  opponentName: string;
  opponentProfileImage?: string;
  tradePostId: number;
  tradePostTitle?: string;
  tradePostPrice?: string;
  tradePostImage?: string;
}

// 먼저 Room 타입을 정의합니다
interface ChatRoomResponse {
  id: string;
  lastMessage?: string;
  lastMessageDateTime?: string;
  requestUserName: string;
  requestUserProfileImage?: string;
  tradePostId: number;
}

export default function ChatList() {
  const user = useUserStore((state) => state.user);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const router = useRouter();
  const userId = user?.id;

  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        console.log("📌 요청하는 userId:", userId);
        const tokenStorageStr = localStorage.getItem("token-storage");
        if (!tokenStorageStr) throw new Error("토큰이 없습니다.");

        const tokenData = JSON.parse(tokenStorageStr);
        const token = tokenData?.accessToken;
        if (!token) throw new Error("액세스 토큰이 유효하지 않습니다.");

        // 🔥 채팅방 목록 불러오기
        const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trade/my-chat-rooms`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("채팅방 목록 불러오기 실패");

        const data = await response.json();
        console.log("📌 채팅방 목록:", data);

        // 🔥 각 채팅방의 게시물 정보 가져오기
        const chatRoomsWithTradeInfo = await Promise.all(
          data.map(async (room: ChatRoomResponse) => {
            let tradePostTitle = "제목 없음";
            let tradePostPrice = "가격 미정";
            let tradePostImage = "/default-image.jpg";
            let tradeUserId = ""; // ✅ 판매자 ID 추가
            let tradeUserName = ""; // ✅ 게시물 주인 이름 추가

            try {
              const tradeResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/trade/${room.tradePostId}`, 
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (tradeResponse.ok) {
                const tradeData = await tradeResponse.json();
                tradePostTitle = tradeData.title || tradePostTitle;
                tradePostPrice = tradeData.price || tradePostPrice;
                tradePostImage = tradeData.imageUrl || tradePostImage;
                tradeUserId = tradeData.writeUserId || ""; // ✅ 판매자 ID 가져오기
                tradeUserName = tradeData.writeUserName || ""; // ✅ 판매자 이름 가져오기
                console.log("📌 게시물 정보:", tradeData);
              }
            } catch (error) {
              console.error(
                `❌ 게시물 정보 불러오기 실패 (ID: ${room.tradePostId})`,
                error
              );
            }

            return {
              chatRoomId: room.id,
              lastMessage: room.lastMessage || "메시지가 없습니다.",
              updatedAt: room.lastMessageDateTime || "알 수 없음",
              opponentName: room.requestUserName,
              opponentProfileImage:
                room.requestUserProfileImage || "/default-profile.png",
              tradePostId: room.tradePostId,
              tradePostTitle,
              tradePostPrice,
              tradePostImage,
              tradeUserId, // ✅ 판매자 ID 추가
              tradeUserName,
            };
          })
        );

        setChatRooms(chatRoomsWithTradeInfo);
      } catch (error) {
        console.error("❌ 채팅방 목록 불러오기 오류:", error);
      }
    };

    fetchChatRooms();
  }, []);

  const enterChatRoom = (room: ChatRoom) => {
    const url = `/chatList/chatRoom?roomId=${room.chatRoomId}
    &postId=${room.tradePostId}
    &tradeUserId=${room.tradeUserId || ""}
    &title=${encodeURIComponent(
      room.tradePostTitle || ""
    )}&price=${encodeURIComponent(
      room.tradePostPrice || ""
    )}&imageUrl=${encodeURIComponent(room.tradePostImage || "")}`;

    router.push(url);
  };

  {
    chatRooms.map((room) => {
      return (
        <div key={room.chatRoomId}>
          <p>{room.opponentName}</p>
        </div> // ✅ 닫는 태그 추가
      );
    });
  }

  return (
    <div className="p-4">
      {user && (
        <div className="mb-4 text-sm text-gray-600">
          <p>이름: {user.name}</p>
          <p>이메일: {user.email}</p>
          <p>ID: {user.id}</p>
        </div>
      )}

      {chatRooms.length === 0 ? (
        <p className="text-center text-gray-500 mt-5">💬 채팅방이 없습니다.</p>
      ) : (
        chatRooms.map((room) => (
          <div
            key={room.chatRoomId}
            className="flex p-4 px-5 justify-between items-start self-stretch backdrop-blur-[2px] cursor-pointer hover:bg-gray-100"
            onClick={() => enterChatRoom(room)}
          >
            <div className="flex">
              {/* 프로필 이미지 적용 */}
              <div
                className="w-12 h-12 rounded-3xl bg-center bg-cover bg-no-repeat flex-shrink-0"
                style={{
                  backgroundColor: "#d3d3d3",
                }}
              ></div>

              <div className="ml-[1rem] mr-[0.5rem]">
                <div className="flex flex-row items-center gap-1">
                  {/* 상대방 이름 적용 */}
                  <span className="overflow-hidden text-ellipsis text-[#26220D] font-suit text-[1rem] font-semibold leading-[1.5rem] tracking-[-0.025rem]">
                    {room.tradeUserName === user?.name
                      ? room.opponentName
                      : room.tradeUserName}
                  </span>
                  <span> ・ </span>
                  {/* 마지막 메시지 시간 적용 */}
                  <span className="text-[#545245] text-xs font-normal leading-[1.125rem] tracking-[-0.01875rem] font-suit">
                    {room.updatedAt}
                  </span>
                </div>
                <div>
                  {/* 마지막 메시지 적용 */}
                  <p className="overflow-hidden text-ellipsis text-[#8D8974] text-[0.875rem] font-normal leading-[1.3125rem] tracking-[-0.02188rem]">
                    {room.lastMessage}
                  </p>
                </div>
              </div>
            </div>
            <div>
              {/* 채팅방 삭제 아이콘 */}
              <Image
                className="min-w-[1.875rem]"
                src="/icons/cancel_icon_24px.svg"
                alt="Cancel Icon"
                width={30}
                height={30}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
