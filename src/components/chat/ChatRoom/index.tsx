"use client";

import { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import Image from "next/image";
import Button from "@/commons/Button";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/commons/input";
import { useUserStore } from "@/commons/store/userStore";
import axiosInstance from "@/utils/axiosInstance";
// 수정된 Message 인터페이스
interface Message {
  createdAt?: string; // 옵셔널로 변경
  writeUserName?: string;
  writeUserProfileImage?: string;
  writeUserId?: string | number;
  message?: string;
  chatRoomId?: number;
  type: string; // 유일한 필수 필드
  text?: string;
  time?: string;
  sender?: string;
  senderId?: number;
  content?: { title: string; subtitle: string };
}

export default function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([]); // 채팅 메시지 상태
  const [inputValue, setInputValue] = useState(""); // 입력 필드 상태
  const [detail, setDetail] = useState(false); // 상세 버튼 (숨김 상태)
  const inputRef = useRef<HTMLInputElement>(null); // 입력 필드 DOM에 접근하기 위한 ref
  const messagesEndRef = useRef<HTMLDivElement>(null); // 채팅 메시지 목록의 끝을 참조하는 ref
  const router = useRouter(); // useRouter 훅 사용
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId"); // ✅ URL에서 roomId 가져오기
  const postId = searchParams.get("postId"); // 해당 게시물의 ID
  const title = searchParams.get("title");
  const price = searchParams.get("price");
  const imageUrl = searchParams.get("imageUrl");
  const tradeUserId = searchParams.get("tradeUserId") || ""; // 🔥 게시물 ID 추가
  const user = useUserStore((state) => state.user); // 로그인한 유저정보 가져옴
  const stompClientRef = useRef<Client | null>(null);
  // const [messageType, _setMessageType] = useState("TEXT"); // 언더스코어 추가로 경고 억제
// 대신 상수 추가
const MESSAGE_TYPE = "TEXT";
  useEffect(() => {
    console.log("📡 WebSocket 연결 시도 중...");
    console.log("🔍 구독하는 roomId 타입:", typeof roomId, roomId);
  
    const socket = new SockJS('/ws');
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("✅ WebSocket 연결 성공!");
  
        const subscribePath = `/topic/chat/${Number(roomId)}`;
  
        stompClient.subscribe(subscribePath, (message) => {
          try {
            console.log("📩 메시지 수신됨:", message.body);
            const receivedMessage = JSON.parse(message.body);
            console.log("✅ 파싱된 메시지:", receivedMessage);
  
            setMessages((prevMessages) => {
              console.log("📌 업데이트될 messages 상태:", [
                ...prevMessages,
                receivedMessage,
              ]);
              return [...prevMessages, receivedMessage];
            });
          } catch (error) {
            console.error("🚨 메시지 파싱 오류:", error);
          }
        });
      },
      onStompError: (frame) => {
        console.error("🚨 STOMP 오류 발생:", frame);
      },
    });
  
    stompClient.activate();
    stompClientRef.current = stompClient;
  
    return () => {
      if (stompClientRef.current) {
        console.log("🛑 WebSocket 연결 해제");
        stompClientRef.current.deactivate();
      }
    };
  }, [roomId]); // messages 참조 제거

  // API를 요청해서 해당방의 이전 메세지 기록을 불러옴
  useEffect(() => {
    axiosInstance
      .get(`/api/trade/${postId}/chat-rooms/${roomId}/messages`)
      .then((response) => {
        setMessages(response.data.reverse()); // ✅ 최신 메시지가 아래로 정렬되도록 수정
      })
      .catch((error) =>
        console.error("채팅 내역 불러오기 실패:", error.message)
      );
  }, [roomId, postId]); // postId 의존성 추가

  // ✅ 채팅방 하단 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onClickDetailBtn = () => {
    setDetail((prev) => !prev); // 현재 상태를 반대로 변경 (토글 기능)
  };

  // ✅ 메시지 전송
  const sendMessage = () => {
    if (!inputValue.trim()) return; // 빈 메세지 방지

    const chatMessage: Message = {
      chatRoomId: Number(roomId),
      type: MESSAGE_TYPE, // messageType을 MESSAGE_TYPE으로 변경
      message: inputValue,
      createdAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      writeUserName: user?.name,
      writeUserProfileImage: "",
      writeUserId: user?.id,
    };
    console.log("📤 메시지 전송:", chatMessage);

    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: "/app/chat/send", // 🔥 이 부분이 서버에서 받는 경로야
        body: JSON.stringify(chatMessage),
      });
      console.log("✅ 메시지 전송 성공!");
    } else {
      console.error("🚨 WebSocket 연결 안됨! 메시지 전송 실패");
    }

    // setMessages((prev) => [...prev, chatMessage]); // 메시지 즉시 반영
    setInputValue("");
    inputRef.current?.focus();
  };

  // 지도 페이지로 이동
  const onClickMap = () => {
    router.push("/map");
  };

  // 산책 승인 메시지 전송
  const onClickApprove = () => {
    const newMessage: Message = {
      type: "system",
      content: {
        title: "산책을 시작하려 해요!",
        subtitle: "우리 반려동물의 위치를 확인해 보세요!",
      },
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sender: "System",
      senderId: 0,
      createdAt: new Date().toISOString(), // createdAt 속성 추가
    };

    // socket.emit("message", newMessage); // 서버로 메시지 전송
    setMessages((prev) => [...prev, newMessage]); // 자신의 화면에 즉시 반영
  };

  console.log("📌 현재 방 정보:", {
    roomId,
    title,
    price,
    imageUrl,
    tradeUserId,
    postId,
  });

  return (
    <main className="flex flex-col h-[94dvh] max-h-[94dvh] overflow-hidden text-[#26220D] font-suit text-base">
      <section className="px-8 py-2 border-t border-b border-gray-300 mb-4">
        <div className="flex">
          <div
            className="w-12 h-12 mr-2 rounded-2xl bg-center bg-cover bg-no-repeat flex-shrink-0"
            style={{
              backgroundColor: "#d3d3d3",
            }}
          ></div>
          <div className="w-full">
            <div className="flex justify-between">
              <span className="max-w-[250px] truncate">{title}</span>
              <span className="font-extrabold">구인중</span>
            </div>
            <div>
              <span className="font-extrabold">{price} 원</span>
            </div>
          </div>
        </div>
      </section>

      {/* 채팅 메시지 목록 */}
      <section className="mb-[8px] mx-4 flex flex-col items-start gap-6 overflow-y-auto flex-1">
        {messages.map((message, index) => {
          console.log("🖥 렌더링되는 message:", message); // ✅ 확인용 로그 추가
          console.log("🔍 message.sender:", message.sender);
          console.log("🔍 message.writeUserName:", message.writeUserName);
          console.log("🔍 user.name:", user?.name);

          return (
            <div
              key={index}
              className={`w-full flex ${
                (message.sender || message.writeUserName) === user?.name
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              {message.type === "system" ? (
                <div className="w-full min-h-[120px] flex flex-col p-2 px-5 items-start gap-4 self-stretch border-l-[2.5px] border-[#72C655]">
                  <div className="flex flex-col self-stretch text-[#26220D] font-suit text-base font-medium leading-[1.5rem] tracking-[-0.025rem]">
                    <span>{message.content?.title}</span>
                    <span>{message.content?.subtitle}</span>
                  </div>
                  <Button design="design2" onClick={onClickMap}>
                    <Image
                      className="mr-1"
                      src="/icons/chat_location_icon_20px.svg"
                      alt="location Icon"
                      width={20}
                      height={20}
                    />
                    위치 확인하기
                  </Button>
                </div>
              ) : (
                <>
                  {/* 내가 보낸 메시지라면 시간은 왼쪽에 표시 */}
                  {(message.sender || message.writeUserName) === user?.name && (
                    <span className="flex items-end min-w-[3.8125rem] mr-[5px] text-[#8D8974] text-center text-sm font-medium leading-5 tracking-[-0.01875rem]">
                      {message.createdAt || "시간 없음"}
                    </span>
                  )}

                  {/* 상대 아이콘 */}
                  {(message.sender || message.writeUserName) !== user?.name && (
                    <div
                      className="w-[40px] h-[40px] mr-2 rounded-3xl bg-center bg-cover bg-no-repeat flex-shrink-0"
                      style={{
                        backgroundColor: "#d3d3d3",
                      }}
                    ></div>
                  )}

                  <div
                    className={`max-w-[79%] px-3 py-2 ${
                      (message.sender || message.writeUserName) === user?.name
                        ? "bg-[#E9E8E3] rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none"
                        : "bg-[#BFE5B3] rounded-tl-none rounded-tr-lg rounded-bl-lg rounded-br-lg "
                    } text-[#26220D] text-base font-medium leading-6 tracking-[-0.025rem]`}
                  >
                    {message.text || message.message}
                  </div>

                  {/* 상대가 보낸 메세지라면 시간은 오른쪽에 표시 */}
                  {(message.sender || message.writeUserName) !== user?.name && (
                    <span className="flex items-end min-w-[3.8125rem] ml-[5px] text-[#8D8974] text-center text-sm font-medium leading-5 tracking-[-0.01875rem]">
                      {message.createdAt}
                    </span>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          );
        })}
      </section>

      {/* 버튼 클릭 시 div가 나타나도록 설정 */}
      {detail && (
        <div className="flex w-full px-5 pb-5 pt-0 flex-col items-center rounded-t-[1.75rem] bg-[#FDFCF8]">
          <div className="w-1/6 h-[0.25rem] rounded-[6.25rem] bg-[#BBB8AB] my-4">
            {/* 바 */}
          </div>
          <div className="flex w-full gap-3 ">
            {/* 사진 보내기 */}
            <Image
              className=""
              src="/images/chat_image_upload_btn_img_44px.svg"
              alt="send Icon"
              width={44}
              height={44}
            />

            {/* 산책 시작하기 */}
            {Number(tradeUserId) === user?.id && (
              <Image
                onClick={onClickApprove}
                className=""
                src="/images/chat_walking_dog_outside_BTN_44px.svg"
                alt="send Icon"
                width={44}
                height={44}
              />
            )}
          </div>
        </div>
      )}
      <div className="w-full">
        {/* 입력 필드 및 버튼 */}
        <footer className="flex w-full items-end flex-shrink-0">
          <div className="mx-0 flex justify-between p-4 items-center gap-2 w-full bg-[#FDFCF8]">
            <div className="min-w-[3rem] h-full" onClick={onClickDetailBtn}>
              <Image
                src={
                  detail
                    ? "/images/chat_collapse_BTN_44px.svg"
                    : "/images/chat_expand_BTN_44px.svg"
                }
                alt="photo Icon"
                width={44}
                height={44}
              />
            </div>

            <div className="w-full">
              <Input
                ref={inputRef}
                className="w-full max-h-[3rem] flex items-center gap-2 rounded-[5rem] border border-[#BBB8AB] bg-[#F4F3F1] text-base font-medium leading-[1.5rem] tracking-[-0.025rem]"
                placeholder="메세지를 입력해주세요."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>

            <div className="min-w-[3rem] h-full" onClick={sendMessage}>
              <Image
                src="/images/chat_send_btn_img_44px.svg"
                alt="send Icon"
                width={44}
                height={44}
              />
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
