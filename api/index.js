// Vercel Serverless Function — 将请求转发给 Express app
const { getApp } = require('../server/index');

module.exports = async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
};
