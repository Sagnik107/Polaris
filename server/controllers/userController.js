const User = require('../models/User');
const { getPaginationMeta } = require('../utils/pagination');

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (role) query.role = role;
    const total = await User.countDocuments(query);
    const users = await User.find(query).sort('-createdAt').skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, data: users, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) { next(error); }
};

const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, role, isActive, baseId } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, role, isActive, baseId }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User deactivated.' });
  } catch (error) { next(error); }
};

module.exports = { getUsers, getUser, updateUser, deleteUser };
