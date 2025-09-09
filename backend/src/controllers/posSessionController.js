const PosSession = require('../models/PosSession');
const Order = require('../models/Order');

// Get current open session for branch (and optionally cashier)
exports.getCurrent = async (req, res) => {
  try {
  let { branchId, cashierId } = req.query;
  if (!branchId && req.user?.branchId) branchId = req.user.branchId;
  if (!cashierId && (req.user?._id || req.user?.id)) cashierId = req.user._id || req.user.id;
  if (!branchId) return res.status(400).json({ message: 'branchId is required' });
    const query = { status: 'open', branchId };
    if (cashierId) query.cashierId = cashierId;
    const session = await PosSession.findOne(query).sort({ openAt: -1 });
    return res.json({ session });
  } catch (err) {
    console.error('getCurrent session error:', err);
    return res.status(500).json({ message: 'Failed to fetch current session' });
  }
};

// Open new session (one open per branch at a time; cashier scope optional)
exports.open = async (req, res) => {
  try {
    let { branchId, restaurantId, cashierId, openingFloat = 0, notes = '' } = req.body || {};
    // Fallback to authenticated user context if not provided explicitly
    if (!branchId && req.user?.branchId) branchId = req.user.branchId;
    if (!cashierId && (req.user?._id || req.user?.id)) cashierId = req.user._id || req.user.id;
    if (!restaurantId && req.user?.restaurantId) restaurantId = req.user.restaurantId;
    if (!branchId || !cashierId) {
      return res.status(400).json({ message: 'branchId and cashierId are required' });
    }
    const existing = await PosSession.findOne({ status: 'open', branchId });
    if (existing) return res.status(400).json({ message: 'A session is already open for this branch.' });

    const session = await PosSession.create({
      branchId,
  restaurantId: restaurantId || undefined,
      cashierId,
      openingFloat: Number(openingFloat) || 0,
      notes
    });
    return res.status(201).json({ session });
  } catch (err) {
    console.error('open session error:', err);
    return res.status(500).json({ message: 'Failed to open session' });
  }
};

// Close session by id
exports.close = async (req, res) => {
  try {
    const { id } = req.params;
  const { closingCash = 0, expectedCash = 0, totals = {}, notes = '' } = req.body || {};
    const session = await PosSession.findById(id);
    if (!session || session.status !== 'open') {
      return res.status(404).json({ message: 'Open session not found' });
    }

    // Aggregate orders linked to this session using a robust pipeline
    const now = new Date();
    let match = {};
    try {
      const hasTagged = await Order.exists({ sessionId: session._id });
      if (hasTagged) {
        match = { sessionId: session._id };
      } else {
        match = {
          branchId: session.branchId,
          createdAt: { $gte: session.openAt || session.createdAt || new Date(0), $lte: now }
        };
        if (session.restaurantId) match.restaurantId = session.restaurantId;
      }
    } catch (_) {
      match = { branchId: session.branchId, createdAt: { $gte: session.openAt || new Date(0), $lte: now } };
    }

    let agg = { ordersCount: 0, grossSales: 0, byPayment: { cash: 0, card: 0, online: 0 }, discounts: 0, refunds: 0 };
    try {
      const aggRes = await Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            ordersCount: { $sum: 1 },
            grossSales: { $sum: { $ifNull: ['$totalAmount', 0] } },
            cash: {
              $sum: {
                $cond: [
                  { $and: [ { $eq: [ { $toLower: '$paymentStatus' }, 'paid' ] }, { $eq: [ { $toLower: '$paymentMethod' }, 'cash' ] } ] },
                  { $ifNull: ['$totalAmount', 0] },
                  0
                ]
              }
            },
            card: {
              $sum: {
                $cond: [
                  { $and: [ { $eq: [ { $toLower: '$paymentStatus' }, 'paid' ] }, { $eq: [ { $toLower: '$paymentMethod' }, 'card' ] } ] },
                  { $ifNull: ['$totalAmount', 0] },
                  0
                ]
              }
            },
            online: {
              $sum: {
                $cond: [
                  { $and: [ { $eq: [ { $toLower: '$paymentStatus' }, 'paid' ] }, { $or: [ { $eq: [ { $toLower: '$paymentMethod' }, 'online' ] }, { $eq: [ { $toLower: '$paymentMethod' }, 'other' ] } ] } ] },
                  { $ifNull: ['$totalAmount', 0] },
                  0
                ]
              }
            }
          }
        }
      ]);
      if (aggRes && aggRes[0]) {
        agg = {
          ordersCount: aggRes[0].ordersCount || 0,
          grossSales: aggRes[0].grossSales || 0,
          byPayment: { cash: aggRes[0].cash || 0, card: aggRes[0].card || 0, online: aggRes[0].online || 0 },
          discounts: 0,
          refunds: 0
        };
      }
    } catch (_) {}

    session.status = 'closed';
    session.closeAt = new Date();
    session.closingCash = Number(closingCash) || 0;
    session.expectedCash = Number(expectedCash) || 0;
    session.cashVariance = session.closingCash - session.expectedCash;
    // Use server-computed aggregates to avoid client zeros masking real values
    session.totals = {
      ordersCount: Number(agg.ordersCount || 0),
      grossSales: Number(agg.grossSales || 0),
      netSales: Number(agg.grossSales || 0),
      discounts: Number(agg.discounts || 0),
      refunds: Number(agg.refunds || 0),
      byPayment: {
        cash: Number(agg.byPayment.cash || 0),
        card: Number(agg.byPayment.card || 0),
        online: Number(agg.byPayment.online || 0)
      }
    };
    session.notes = notes;
    await session.save();
    return res.json({ session, summary: { ...session.totals, cashVariance: session.cashVariance, closingCash: session.closingCash, expectedCash: session.expectedCash } });
  } catch (err) {
    console.error('close session error:', err);
    return res.status(500).json({ message: 'Failed to close session' });
  }
};
