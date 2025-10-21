const { prisma } = require('../libs/prisma');

exports.findAll = () => prisma.user.findMany();

exports.create = ({ email, name }) => prisma.user.create({
  data: { email, name }
});