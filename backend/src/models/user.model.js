const { prisma } = require('../config/database');

class UserModel {
  static includeBasic() {
    return {
      vaiTro: true,
      sinhVien: { include: { lop: true } }
    };
  }

  static toDTO(user) {
    if (!user) return null;
    return {
      id: user.id,
      name: user.ho_ten,
      email: user.email,
      role: user.vaiTro?.ten_vt || 'student',
      maso: user.ten_dn,
      lop: user.sinhVien?.lop?.ten_lop || null,
      khoa: user.sinhVien?.lop?.khoa || null,
      nienkhoa: user.sinhVien?.lop?.nien_khoa || null,
      trangthai: user.trang_thai,
      ngaysinh: user.sinhVien?.ngay_sinh || null,
      gt: user.sinhVien?.gt || null,
      sdt: user.sinhVien?.sdt || null,
      createdAt: user.ngay_tao,
      updatedAt: user.ngay_cap_nhat
    };
  }

  static async findAll() {
    const users = await prisma.nguoiDung.findMany({
      include: this.includeBasic(),
      orderBy: { ngay_tao: 'desc' }
    });
    return users.map(this.toDTO);
  }

  static async findById(id) {
    const user = await prisma.nguoiDung.findUnique({
      where: { id },
      include: this.includeBasic()
    });
    return this.toDTO(user);
  }

  static async updateBasic(id, { maso, name, trangthai, ngaysinh, gt, sdt }) {
    const dataUser = { ngay_cap_nhat: new Date() };
    if (typeof maso !== 'undefined') dataUser.ten_dn = maso;
    if (typeof name !== 'undefined') dataUser.ho_ten = name;
    if (typeof trangthai !== 'undefined') dataUser.trang_thai = trangthai;

    const ops = [];
    ops.push(prisma.nguoiDung.update({ where: { id }, data: dataUser }));

    const updateSV = (typeof ngaysinh !== 'undefined') || (typeof gt !== 'undefined') || (typeof sdt !== 'undefined');
    if (updateSV) {
      const dataSv = {};
      if (typeof ngaysinh !== 'undefined') dataSv.ngay_sinh = ngaysinh ? new Date(ngaysinh) : null;
      if (typeof gt !== 'undefined') dataSv.gt = gt || null;
      if (typeof sdt !== 'undefined') dataSv.sdt = sdt || null;
      ops.push(prisma.sinhVien.updateMany({ where: { nguoi_dung_id: id }, data: dataSv }));
    }

    await prisma.$transaction(ops);
    const user = await prisma.nguoiDung.findUnique({ where: { id }, include: this.includeBasic() });
    return this.toDTO(user);
  }

  static async deleteById(id) {
    await prisma.nguoiDung.delete({ where: { id } });
    return true;
  }
}

module.exports = UserModel;
