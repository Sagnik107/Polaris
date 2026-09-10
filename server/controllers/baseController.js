const Base = require('../models/Base');
const Personnel = require('../models/Personnel');
const Inventory = require('../models/Inventory');
const Asset = require('../models/Asset');
const Cargo = require('../models/Cargo');
const Alert = require('../models/Alert');

const { mockBases } = require('../services/mockDataService');

const getBases = async (req, res, next) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.json({ success: true, data: mockBases });
    }
    const bases = await Base.find().sort('name');
    res.json({ success: true, data: bases });
  } catch (error) { next(error); }
};

const getBase = async (req, res, next) => {
  try {
    const base = await Base.findById(req.params.id);
    if (!base) return res.status(404).json({ success: false, message: 'Base not found.' });
    // Aggregate linked data
    const [personnel, inventory, assets, cargo, alerts] = await Promise.all([
      Personnel.find({ currentBase: base._id }).select('name status designation'),
      Inventory.find({ base: base._id }).select('itemName quantity minThreshold category unit'),
      Asset.find({ base: base._id }).select('assetName condition category'),
      Cargo.find({ destinationBase: base._id, status: { $nin: ['Delivered'] } }).select('cargoCode status priority'),
      Alert.find({ isRead: false }).limit(10),
    ]);
    res.json({ success: true, data: { ...base.toObject(), personnel, inventory, assets, cargo, alerts } });
  } catch (error) { next(error); }
};

const updateBase = async (req, res, next) => {
  try {
    const base = await Base.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!base) return res.status(404).json({ success: false, message: 'Base not found.' });
    res.json({ success: true, data: base });
  } catch (error) { next(error); }
};

const createBase = async (req, res, next) => {
  try {
    const base = await Base.create(req.body);
    res.status(201).json({ success: true, data: base });
  } catch (error) { next(error); }
};

module.exports = { getBases, getBase, updateBase, createBase };
