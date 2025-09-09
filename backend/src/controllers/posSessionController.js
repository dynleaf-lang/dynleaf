const PosSession = require('../models/PosSession');
const Order = require('../models/Order');
const DiningTable = require('../models/DiningTables');

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

    // Prevent closing if there are any in-progress/pending orders or occupied tables
    try {
      const activeStatuses = ['pending', 'confirmed', 'preparing']; // "ready" can be treated as ready-to-serve, not blocking
      const activePayments = ['unpaid', 'pending', 'partial'];
      const branchFilter = { branchId: session.branchId };
      if (session.restaurantId) branchFilter.restaurantId = session.restaurantId;
      const windowFilter = {
        createdAt: { $gte: session.openAt || session.createdAt || new Date(0), $lte: new Date() }
      };

      // Prefer matching orders by sessionId when available, fallback to time window
      const hasTaggedOrders = await Order.exists({ sessionId: session._id });
      const orderGuardFilter = hasTaggedOrders ?
        {
          ...branchFilter,
          sessionId: session._id,
          $and: [
            { status: { $nin: ['cancelled', 'delivered'] } },
            { $or: [ { status: { $in: activeStatuses } }, { paymentStatus: { $in: activePayments } } ] }
          ]
        } :
        {
          ...branchFilter,
          ...windowFilter,
          $and: [
            { status: { $nin: ['cancelled', 'delivered'] } },
            { $or: [ { status: { $in: activeStatuses } }, { paymentStatus: { $in: activePayments } } ] }
          ]
        };

      const activeOrdersCount = await Order.countDocuments(orderGuardFilter);

      // Compute occupied tables as: (flagged occupied) UNION (currentOrder points to an active order in-session)
      const timeLowerBound = session.openAt || session.createdAt || new Date(0);
      const flaggedTables = await DiningTable.find({
        ...branchFilter,
        updatedAt: { $gte: timeLowerBound },
        $and: [ { status: 'occupied' }, { isOccupied: true } ]
      }).select('_id').lean();

      const tablesWithOrder = await DiningTable.find({
        ...branchFilter,
        updatedAt: { $gte: timeLowerBound },
        currentOrder: { $ne: null }
      }).select('_id currentOrder').lean();

      const currentOrderIds = [...new Set(tablesWithOrder.map(t => String(t.currentOrder)).filter(Boolean))];
      let activeOrderIdSet = new Set();
      if (currentOrderIds.length > 0) {
        const activeOrders = await Order.find({
          _id: { $in: currentOrderIds },
          ...branchFilter,
          $and: [
            { status: { $nin: ['cancelled', 'delivered'] } },
            { $or: [ { status: { $in: ['pending', 'confirmed', 'preparing'] } }, { paymentStatus: { $in: ['unpaid', 'pending', 'partial'] } } ] }
          ],
          createdAt: { $gte: timeLowerBound, $lte: new Date() }
        }).select('_id').lean();
        activeOrderIdSet = new Set(activeOrders.map(o => String(o._id)));
      }

      const occupiedTableIdSet = new Set([
        ...flaggedTables.map(t => String(t._id)),
        ...tablesWithOrder.filter(t => activeOrderIdSet.has(String(t.currentOrder))).map(t => String(t._id))
      ]);

      const occupiedTablesCount = occupiedTableIdSet.size;

      if (activeOrdersCount > 0 || occupiedTablesCount > 0) {
        return res.status(409).json({
          message: 'Cannot close register while orders are in progress or tables are occupied. Please complete or cancel all orders and free tables before closing.',
          details: { activeOrdersCount, occupiedTablesCount }
        });
      }
    } catch (guardErr) {
      console.warn('close session guard check failed, proceeding with caution:', guardErr?.message);
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

// Get the last closed session for a branch (and optionally cashier)
exports.getLastClosed = async (req, res) => {
  try {
    let { branchId, cashierId } = req.query;
    if (!branchId && req.user?.branchId) branchId = req.user.branchId;
    if (!branchId) return res.status(400).json({ message: 'branchId is required' });
    const query = { status: 'closed', branchId };
    if (cashierId) query.cashierId = cashierId;
    const session = await PosSession.findOne(query).sort({ closeAt: -1, updatedAt: -1 });
    return res.json({ session });
  } catch (err) {
    console.error('getLastClosed session error:', err);
    return res.status(500).json({ message: 'Failed to fetch last closed session' });
  }
};

// Resolve stale table occupancy for a branch (safe cleanup: only tables without currentOrder)
exports.resolveOccupancy = async (req, res) => {
  try {
    let { branchId } = req.body || req.query || {};
    if (!branchId && req.user?.branchId) branchId = req.user.branchId;
    if (!branchId) return res.status(400).json({ message: 'branchId is required' });

    const filter = {
      branchId,
      currentOrder: null,
      $or: [ { status: 'occupied' }, { isOccupied: true } ]
    };

    const tables = await DiningTable.find(filter);
    let updated = 0;
    for (const t of tables) {
      t.status = 'available';
      t.isOccupied = false;
      // currentOrder is already null per filter, keep it null
      await t.save();
      updated++;
    }
    return res.json({ message: 'Resolved stale occupancy', updated });
  } catch (err) {
    console.error('resolveOccupancy error:', err);
    return res.status(500).json({ message: 'Failed to resolve occupancy' });
  }
};
