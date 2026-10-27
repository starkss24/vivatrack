const asyncHandler = require('../utils/asyncHandler');
const chatService = require('../services/chatService');

exports.conversations = asyncHandler(async (req, res) => res.json({ conversations: await chatService.listConversations(req.user, req.query) }));
exports.messages = asyncHandler(async (req, res) => res.json(await chatService.getMessages(req.user, req.query)));
exports.send = asyncHandler(async (req, res) => {
  const { message, created } = await chatService.sendMessage(req.user, req.body);
  res.status(created ? 201 : 200).json({ message });
});
