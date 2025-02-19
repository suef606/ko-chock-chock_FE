/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/commons/Button";
import Input from "@/commons/input";
import Image from "next/image";

import { useParams, useRouter } from "next/navigation";
import RegionDropdown from "@/commons/regionsDropdown";
import { useUserStore } from "@/store/userStore";

const jobFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  mainRegion: z.string().min(1, "지역을 선택해주세요"),
  subRegion: z.string().min(1, "세부 지역을 선택해주세요"),
  price: z
    .string()
    .min(1, "금액을 입력해주세요")
    .regex(/^[0-9,]+$/, "올바른 금액 형식을 입력해주세요"),
  contents: z.string().min(1, "상세 내용을 입력해주세요"),
  images: z.array(z.instanceof(File)).optional(),
});

type JobFormData = z.infer<typeof jobFormSchema>;

interface JobListNewProps {
  isEdit: boolean;
}

const JobListNew = ({ isEdit }: JobListNewProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const param = useParams();
  const [boardData, setBoardData] = useState(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "",
      mainRegion: "",
      subRegion: "",
      price: "",
      contents: "",
      images: [],
    },
  });

  const images = watch("images") || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setValue("images", [...images, ...newFiles]);
    }
  };

  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onSubmit = async (data: JobFormData) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("토큰이 없습니다. 로그인이 필요합니다.");
      }

      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("price", data.price.replace(/,/g, ""));
      formData.append("contents", data.contents);
      formData.append("status", "구인중");
      formData.append("location", `${data.mainRegion} ${data.subRegion}`);

      if (data.images) {
        data.images.forEach((image) => {
          formData.append("files", image);
        });
      }

      const response = await fetch(
        `https://api.kochokchok.shop/api/v1/boards/newBoard`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }

      alert("게시물이 성공적으로 등록되었습니다.");
      router.push("/jobList");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "등록에 실패했습니다. 다시 시도해주세요."
      );
    }
  };

  const onEdit = async (data: JobFormData) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("토큰이 없습니다. 로그인이 필요합니다.");
      }

      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("price", data.price.replace(/,/g, ""));
      formData.append("contents", data.contents);
      formData.append("status", "구인중");
      formData.append("location", `${data.mainRegion} ${data.subRegion}`);

      if (data.images) {
        data.images.forEach((image) => {
          formData.append("files", image);
        });
      }

      const response = await fetch(
        `https://api.kochokchok.shop/api/v1/boards/${param.boardId}/edit`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }

      alert("게시물이 성공적으로 수정되었습니다.");
      router.push(`/jobList/${param.boardId}`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "수정에 실패했습니다. 다시 시도해주세요."
      );
    }
  };

  //수정페이지경우 데이터 받아오기
  useEffect(() => {
    const fetchEditData = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.error("토큰이 없습니다. 로그인이 필요합니다.");
        return;
      }

      try {
        const response = await fetch(
          `https://api.kochokchok.shop/api/v1/boards/${param.boardId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        setBoardData(data);
        console.log("수정모드데이터", data);

        setValue("title", data.data.title || "");
        const [mainRegion, subRegion] = (data.data.location || "").split(" ");
        setValue("mainRegion", mainRegion || "");
        setValue("subRegion", subRegion || "");
        setValue("price", data.data.price || "");
        setValue("contents", data.data.contents || "");
        const imageUrls = data.images?.map(
          (img: { image_url: string }) => img.image_url
        );

        setValue("images", imageUrls); // 이미지 URL 설정
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    if (isEdit) {
      fetchEditData();
    }
  }, [param.boardId, isEdit]);

  return (
    <div className="min-h-screen flex flex-col">
      <form
        onSubmit={handleSubmit(isEdit ? onEdit : onSubmit)}
        className="p-4 space-y-6 flex-1"
      >
        <div>
          <label className="block text-sm text-text-secondary mb-1">제목</label>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="제목을 입력해주세요"
                className="w-full"
              />
            )}
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">
            지역 선택
          </label>
          <Controller
            name="mainRegion"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Controller
                name="subRegion"
                control={control}
                render={({
                  field: { value: subValue, onChange: subOnChange },
                }) => (
                  <RegionDropdown
                    selectedMainRegion={value}
                    setSelectedMainRegion={onChange}
                    selectedSubRegion={subValue}
                    setSelectedSubRegion={subOnChange}
                    buttonClassName="w-full flex px-4 py-4 items-center gap-2 self-stretch rounded-xl border focus:border-[rgba(27,141,90,0.93)] focus:outline-none"
                  />
                )}
              />
            )}
          />
          {(errors.mainRegion || errors.subRegion) && (
            <p className="text-red-500 text-sm mt-1">지역을 선택해주세요</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">금액</label>
          <Controller
            name="price"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="₩ 1,000"
                className="w-full"
              />
            )}
          />
          {errors.price && (
            <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">
            상세 내용
          </label>
          <Controller
            name="contents"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                placeholder="내용을 입력해주세요"
                className="resize-none flex w-full h-[13rem] px-4 py-4 items-center gap-2 self-stretch rounded-xl border focus:border-[rgba(27,141,90,0.93)] focus:outline-none"
              />
            )}
          />
          {errors.contents && (
            <p className="text-red-500 text-sm mt-1">
              {errors.contents.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            사진 첨부
          </label>
          <div className="flex gap-4 flex-wrap">
            {/* 사진 파일 선택부분 */}
            <div
              className="w-[100px] h-[100px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
              onClick={handleOpenFileDialog}
            >
              <Image
                src="/icons/camera.png"
                alt="Upload Image"
                width={40}
                height={40}
              />
            </div>

            {/* 이미지 썸네일 */}
            {images.length > 0 &&
              images.map((image, index) => (
                <div key={index} className="w-[100px] h-[100px] relative group">
                  <Image
                    src={URL.createObjectURL(image)}
                    alt={`uploaded-${index}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                  {/* Optional: Add delete button */}
                  <button
                    onClick={() => {
                      const newImages = [...images];
                      newImages.splice(index, 1);
                      setValue("images", newImages);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="w-full px-5 pb-[1rem]">
          <Button
            type="submit"
            design="design1"
            width="full"
            className="h-[3.5rem]"
          >
            등록하기
          </Button>
        </div>
      </form>
    </div>
  );
};

export default JobListNew;
