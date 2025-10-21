# Documentation

Thư mục này chứa tất cả tài liệu kỹ thuật và hướng dẫn của dự án.

## Deployment & Infrastructure

- **AWS_DEPLOYMENT_GUIDE.md** - Hướng dẫn deploy lên AWS chi tiết
- **AWS_DEPLOYMENT_COMPLETE.md** - Tài liệu về deployment hoàn chỉnh
- **AWS_DEPLOYMENT_SUMMARY.md** - Tóm tắt quá trình deployment
- **AWS_QUICK_REFERENCE.md** - Tham khảo nhanh các lệnh AWS

## Features & UI/UX

- **UI_PREVIEW_BULK_SEMESTER.md** - Preview giao diện quản lý đóng học kỳ hàng loạt
- **UI_UX_IMPROVEMENTS_SUMMARY.md** - Tóm tắt các cải tiến UI/UX
- **USERS_BY_ROLE_ENHANCEMENT.md** - Cải tiến quản lý người dùng theo vai trò

## Technical Specifications

- **tkht.md** - Tài liệu kỹ thuật hệ thống
- **TEST_REPORTS_FIX.md** - Tài liệu sửa lỗi báo cáo

## Project Structure

```
project-root/
├── backend/          # Backend API (Node.js + Prisma + PostgreSQL)
├── frontend/         # Frontend UI (React)
├── docs/            # Documentation (this folder)
├── scripts/         # Deployment và utility scripts
├── tests/           # Test files (E2E, integration)
├── nginx/           # Nginx configuration
├── aws/             # AWS deployment files
└── deployment-package/  # Production deployment artifacts
```

## Xem thêm

- [Main README](../README.md) - Hướng dẫn chính của dự án
- [Backend README](../backend/README.md) - Hướng dẫn backend
- [Frontend README](../frontend/README.md) - Hướng dẫn frontend
