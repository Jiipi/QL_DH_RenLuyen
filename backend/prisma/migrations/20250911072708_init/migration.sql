-- CreateEnum
CREATE TYPE "public"."GioiTinh" AS ENUM ('nam', 'nu', 'khac');

-- CreateEnum
CREATE TYPE "public"."TrangThaiTaiKhoan" AS ENUM ('hoat_dong', 'khong_hoat_dong', 'khoa');

-- CreateEnum
CREATE TYPE "public"."TrangThaiHoatDong" AS ENUM ('cho_duyet', 'da_duyet', 'tu_choi', 'da_huy', 'ket_thuc');

-- CreateEnum
CREATE TYPE "public"."TrangThaiDangKy" AS ENUM ('cho_duyet', 'da_duyet', 'tu_choi', 'da_tham_gia');

-- CreateEnum
CREATE TYPE "public"."PhuongThucDiemDanh" AS ENUM ('qr', 'ma_vach', 'truyen_thong');

-- CreateEnum
CREATE TYPE "public"."TrangThaiThamGia" AS ENUM ('co_mat', 'vang_mat', 'muon', 've_som');

-- CreateEnum
CREATE TYPE "public"."MucDoUuTien" AS ENUM ('thap', 'trung_binh', 'cao', 'khan_cap');

-- CreateEnum
CREATE TYPE "public"."TrangThaiGui" AS ENUM ('cho_gui', 'da_gui', 'that_bai');

-- CreateEnum
CREATE TYPE "public"."PhuongThucGui" AS ENUM ('email', 'sdt', 'trong_he_thong');

-- CreateEnum
CREATE TYPE "public"."HocKy" AS ENUM ('hoc_ky_1', 'hoc_ky_2');

-- CreateTable
CREATE TABLE "public"."lop" (
    "id" UUID NOT NULL,
    "ten_lop" VARCHAR(30) NOT NULL,
    "khoa" VARCHAR(50) NOT NULL,
    "nien_khoa" VARCHAR(20) NOT NULL,
    "nam_nhap_hoc" DATE NOT NULL,
    "nam_tot_nghiep" DATE,
    "chu_nhiem" UUID NOT NULL,
    "lop_truong" UUID,

    CONSTRAINT "lop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vai_tro" (
    "id" UUID NOT NULL,
    "ten_vt" VARCHAR(50) NOT NULL,
    "mo_ta" TEXT,
    "quyen_han" JSONB,
    "ngay_tao" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vai_tro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nguoi_dung" (
    "id" UUID NOT NULL,
    "ten_dn" VARCHAR(50) NOT NULL,
    "mat_khau" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "ho_ten" VARCHAR(50),
    "vai_tro_id" UUID NOT NULL,
    "trang_thai" "public"."TrangThaiTaiKhoan" NOT NULL DEFAULT 'hoat_dong',
    "ngay_tao" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lan_cuoi_dn" TIMESTAMP(6),
    "token_reset" VARCHAR(255),
    "tg_het_han_token" TIMESTAMP(6),
    "anh_dai_dien" VARCHAR(255),

    CONSTRAINT "nguoi_dung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sinh_vien" (
    "id" UUID NOT NULL,
    "nguoi_dung_id" UUID NOT NULL,
    "mssv" VARCHAR(10) NOT NULL,
    "ngay_sinh" DATE NOT NULL,
    "gt" "public"."GioiTinh",
    "lop_id" UUID NOT NULL,
    "dia_chi" TEXT,
    "sdt" VARCHAR(10),

    CONSTRAINT "sinh_vien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."loai_hoat_dong" (
    "id" UUID NOT NULL,
    "ten_loai_hd" VARCHAR(50) NOT NULL,
    "mo_ta" TEXT,
    "diem_mac_dinh" DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    "diem_toi_da" DECIMAL(4,2) NOT NULL DEFAULT 10.00,
    "mau_sac" VARCHAR(7),
    "nguoi_tao_id" UUID,
    "ngay_tao" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loai_hoat_dong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hoat_dong" (
    "id" UUID NOT NULL,
    "ma_hd" VARCHAR(50),
    "ten_hd" VARCHAR(200) NOT NULL,
    "mo_ta" TEXT,
    "loai_hd_id" UUID NOT NULL,
    "diem_rl" DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    "dia_diem" VARCHAR(200),
    "ngay_bd" TIMESTAMP(6) NOT NULL,
    "ngay_kt" TIMESTAMP(6) NOT NULL,
    "han_dk" TIMESTAMP(6),
    "sl_toi_da" INTEGER NOT NULL DEFAULT 1,
    "don_vi_to_chuc" TEXT,
    "yeu_cau_tham_gia" TEXT,
    "trang_thai" "public"."TrangThaiHoatDong" NOT NULL DEFAULT 'cho_duyet',
    "ly_do_tu_choi" TEXT,
    "qr" VARCHAR(32),
    "hinh_anh" TEXT[],
    "tep_dinh_kem" TEXT[],
    "nguoi_tao_id" UUID NOT NULL,
    "ngay_tao" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "co_chung_chi" BOOLEAN NOT NULL DEFAULT false,
    "hoc_ky" "public"."HocKy" NOT NULL DEFAULT 'hoc_ky_1',
    "nam_hoc" VARCHAR(15),

    CONSTRAINT "hoat_dong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dang_ky_hoat_dong" (
    "id" UUID NOT NULL,
    "sv_id" UUID NOT NULL,
    "hd_id" UUID NOT NULL,
    "ngay_dang_ky" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trang_thai_dk" "public"."TrangThaiDangKy" NOT NULL DEFAULT 'cho_duyet',
    "ly_do_dk" TEXT,
    "ly_do_tu_choi" TEXT,
    "ngay_duyet" TIMESTAMP(6),
    "ghi_chu" TEXT,

    CONSTRAINT "dang_ky_hoat_dong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."diem_danh" (
    "id" UUID NOT NULL,
    "nguoi_diem_danh_id" UUID NOT NULL,
    "sv_id" UUID NOT NULL,
    "hd_id" UUID NOT NULL,
    "tg_diem_danh" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phuong_thuc" "public"."PhuongThucDiemDanh" NOT NULL DEFAULT 'qr',
    "trang_thai_tham_gia" "public"."TrangThaiThamGia" NOT NULL DEFAULT 'co_mat',
    "ghi_chu" TEXT,
    "dia_chi_ip" INET,
    "vi_tri_gps" TEXT,
    "xac_nhan_tham_gia" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "diem_danh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."loai_thong_bao" (
    "id" UUID NOT NULL,
    "ten_loai_tb" VARCHAR(50) NOT NULL,
    "mo_ta" TEXT,

    CONSTRAINT "loai_thong_bao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."thong_bao" (
    "id" UUID NOT NULL,
    "tieu_de" VARCHAR(200) NOT NULL,
    "noi_dung" TEXT NOT NULL,
    "loai_tb_id" UUID NOT NULL,
    "nguoi_gui_id" UUID NOT NULL,
    "nguoi_nhan_id" UUID NOT NULL,
    "da_doc" BOOLEAN NOT NULL DEFAULT false,
    "muc_do_uu_tien" "public"."MucDoUuTien" NOT NULL DEFAULT 'trung_binh',
    "ngay_gui" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_doc" TIMESTAMP(6),
    "trang_thai_gui" "public"."TrangThaiGui",
    "phuong_thuc_gui" "public"."PhuongThucGui" NOT NULL DEFAULT 'email',

    CONSTRAINT "thong_bao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lop_ten_lop_key" ON "public"."lop"("ten_lop");

-- CreateIndex
CREATE UNIQUE INDEX "vai_tro_ten_vt_key" ON "public"."vai_tro"("ten_vt");

-- CreateIndex
CREATE UNIQUE INDEX "nguoi_dung_ten_dn_key" ON "public"."nguoi_dung"("ten_dn");

-- CreateIndex
CREATE UNIQUE INDEX "nguoi_dung_email_key" ON "public"."nguoi_dung"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sinh_vien_nguoi_dung_id_key" ON "public"."sinh_vien"("nguoi_dung_id");

-- CreateIndex
CREATE UNIQUE INDEX "sinh_vien_mssv_key" ON "public"."sinh_vien"("mssv");

-- CreateIndex
CREATE UNIQUE INDEX "loai_hoat_dong_ten_loai_hd_key" ON "public"."loai_hoat_dong"("ten_loai_hd");

-- CreateIndex
CREATE UNIQUE INDEX "hoat_dong_ma_hd_key" ON "public"."hoat_dong"("ma_hd");

-- CreateIndex
CREATE UNIQUE INDEX "hoat_dong_qr_key" ON "public"."hoat_dong"("qr");

-- CreateIndex
CREATE UNIQUE INDEX "dang_ky_hoat_dong_sv_id_hd_id_key" ON "public"."dang_ky_hoat_dong"("sv_id", "hd_id");

-- CreateIndex
CREATE UNIQUE INDEX "diem_danh_sv_id_hd_id_key" ON "public"."diem_danh"("sv_id", "hd_id");

-- CreateIndex
CREATE UNIQUE INDEX "loai_thong_bao_ten_loai_tb_key" ON "public"."loai_thong_bao"("ten_loai_tb");

-- AddForeignKey
ALTER TABLE "public"."lop" ADD CONSTRAINT "lop_chu_nhiem_fkey" FOREIGN KEY ("chu_nhiem") REFERENCES "public"."nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lop" ADD CONSTRAINT "lop_lop_truong_fkey" FOREIGN KEY ("lop_truong") REFERENCES "public"."sinh_vien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nguoi_dung" ADD CONSTRAINT "nguoi_dung_vai_tro_id_fkey" FOREIGN KEY ("vai_tro_id") REFERENCES "public"."vai_tro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sinh_vien" ADD CONSTRAINT "sinh_vien_nguoi_dung_id_fkey" FOREIGN KEY ("nguoi_dung_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sinh_vien" ADD CONSTRAINT "sinh_vien_lop_id_fkey" FOREIGN KEY ("lop_id") REFERENCES "public"."lop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hoat_dong" ADD CONSTRAINT "hoat_dong_loai_hd_id_fkey" FOREIGN KEY ("loai_hd_id") REFERENCES "public"."loai_hoat_dong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hoat_dong" ADD CONSTRAINT "hoat_dong_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dang_ky_hoat_dong" ADD CONSTRAINT "dang_ky_hoat_dong_sv_id_fkey" FOREIGN KEY ("sv_id") REFERENCES "public"."sinh_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dang_ky_hoat_dong" ADD CONSTRAINT "dang_ky_hoat_dong_hd_id_fkey" FOREIGN KEY ("hd_id") REFERENCES "public"."hoat_dong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diem_danh" ADD CONSTRAINT "diem_danh_nguoi_diem_danh_id_fkey" FOREIGN KEY ("nguoi_diem_danh_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diem_danh" ADD CONSTRAINT "diem_danh_sv_id_fkey" FOREIGN KEY ("sv_id") REFERENCES "public"."sinh_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diem_danh" ADD CONSTRAINT "diem_danh_hd_id_fkey" FOREIGN KEY ("hd_id") REFERENCES "public"."hoat_dong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."thong_bao" ADD CONSTRAINT "thong_bao_loai_tb_id_fkey" FOREIGN KEY ("loai_tb_id") REFERENCES "public"."loai_thong_bao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."thong_bao" ADD CONSTRAINT "thong_bao_nguoi_gui_id_fkey" FOREIGN KEY ("nguoi_gui_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."thong_bao" ADD CONSTRAINT "thong_bao_nguoi_nhan_id_fkey" FOREIGN KEY ("nguoi_nhan_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
