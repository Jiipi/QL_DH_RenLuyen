-- CreateEnum
CREATE TYPE "public"."TrangThaiAttendanceSession" AS ENUM ('active', 'expired', 'closed');

-- CreateEnum
CREATE TYPE "public"."TrangThaiQRAttendance" AS ENUM ('pending', 'verified', 'failed');

-- CreateTable
CREATE TABLE "public"."attendance_session" (
    "id" UUID NOT NULL,
    "hd_id" UUID NOT NULL,
    "ten_buoi" VARCHAR(100) NOT NULL,
    "mo_ta" TEXT,
    "tg_bat_dau" TIMESTAMP(6) NOT NULL,
    "tg_ket_thuc" TIMESTAMP(6) NOT NULL,
    "qr_code" VARCHAR(500) NOT NULL,
    "qr_signature" VARCHAR(500) NOT NULL,
    "trang_thai" "public"."TrangThaiAttendanceSession" NOT NULL DEFAULT 'active',
    "ip_whitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gps_location" VARCHAR(100),
    "gps_radius" INTEGER DEFAULT 100,
    "ngay_tao" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."qr_attendance" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "sv_id" UUID NOT NULL,
    "hd_id" UUID NOT NULL,
    "tg_quet" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dia_chi_ip" INET,
    "vi_tri_gps" VARCHAR(100),
    "device_info" JSONB,
    "trang_thai" "public"."TrangThaiQRAttendance" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "verified_at" TIMESTAMP(6),
    "points_awarded" DECIMAL(4,2),
    "points_awarded_at" TIMESTAMP(6),

    CONSTRAINT "qr_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auto_point_calculation" (
    "id" UUID NOT NULL,
    "hd_id" UUID NOT NULL,
    "calculation_time" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_attendees" INTEGER NOT NULL DEFAULT 0,
    "points_distributed" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "error_log" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "auto_point_calculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_queue" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "priority" "public"."MucDoUuTien" NOT NULL DEFAULT 'trung_binh',
    "scheduled_at" TIMESTAMP(6) NOT NULL,
    "sent_at" TIMESTAMP(6),
    "status" "public"."TrangThaiGui" NOT NULL DEFAULT 'cho_gui',
    "method" "public"."PhuongThucGui" NOT NULL DEFAULT 'trong_he_thong',
    "metadata" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "ngay_tao" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_session_qr_code_key" ON "public"."attendance_session"("qr_code");

-- CreateIndex
CREATE UNIQUE INDEX "qr_attendance_session_id_sv_id_key" ON "public"."qr_attendance"("session_id", "sv_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_attendance_sv_id_hd_id_key" ON "public"."qr_attendance"("sv_id", "hd_id");

-- CreateIndex
CREATE UNIQUE INDEX "auto_point_calculation_hd_id_key" ON "public"."auto_point_calculation"("hd_id");

-- AddForeignKey
ALTER TABLE "public"."attendance_session" ADD CONSTRAINT "attendance_session_hd_id_fkey" FOREIGN KEY ("hd_id") REFERENCES "public"."hoat_dong"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."qr_attendance" ADD CONSTRAINT "qr_attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."qr_attendance" ADD CONSTRAINT "qr_attendance_sv_id_fkey" FOREIGN KEY ("sv_id") REFERENCES "public"."sinh_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."qr_attendance" ADD CONSTRAINT "qr_attendance_hd_id_fkey" FOREIGN KEY ("hd_id") REFERENCES "public"."hoat_dong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auto_point_calculation" ADD CONSTRAINT "auto_point_calculation_hd_id_fkey" FOREIGN KEY ("hd_id") REFERENCES "public"."hoat_dong"("id") ON DELETE CASCADE ON UPDATE CASCADE;
