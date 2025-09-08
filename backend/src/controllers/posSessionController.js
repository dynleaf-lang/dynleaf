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

    // Aggregate orders linked to this session
    let orders = [];
    try {
      orders = await Order.find({ sessionId: session._id }).lean();
      // Fallback: if no orders have sessionId (older orders), approximate by branch/time window
      if ((!orders || orders.length === 0) && session.openAt) {
        orders = await Order.find({
          branchId: session.branchId,
          createdAt: { $gte: session.openAt },
        }).lean();
      }
    } catch (_) {}

    const agg = orders.reduce((acc, o) => {
      acc.ordersCount += 1;
      const total = Number(o.totalAmount) || 0;
      acc.grossSales += total;
      // simple payment breakdown based on paymentMethod when paid
      const method = String(o.paymentMethod || '').toLowerCase();
      const isPaid = String(o.paymentStatus || '').toLowerCase() === 'paid';
      if (isPaid) {
        if (method === 'cash') acc.byPayment.cash += total;
        else if (method === 'card') acc.byPayment.card += total;
        else acc.byPayment.online += total;
      }
      return acc;
    }, { ordersCount: 0, grossSales: 0, netSales: 0, discounts: 0, refunds: 0, byPayment: { cash: 0, card: 0, online: 0 } });

    session.status = 'closed';
    session.closeAt = new Date();
    session.closingCash = Number(closingCash) || 0;
    session.expectedCash = Number(expectedCash) || 0;
    session.cashVariance = session.closingCash - session.expectedCash;
    // Prefer computed agg, allow client-provided totals as overrides if provided
    const byPayment = {
      cash: Number((totals.byPayment?.cash ?? agg.byPayment.cash) || 0),
      card: Number((totals.byPayment?.card ?? agg.byPayment.card) || 0),
      online: Number((totals.byPayment?.online ?? agg.byPayment.online) || 0)
    };
    session.totals = {
      ordersCount: Number((totals.ordersCount ?? agg.ordersCount) || 0),
      grossSales: Number((totals.grossSales ?? agg.grossSales) || 0),
      netSales: Number((totals.netSales ?? agg.grossSales) || 0),
      discounts: Number((totals.discounts ?? agg.discounts) || 0),
      refunds: Number((totals.refunds ?? agg.refunds) || 0),
      byPayment
    };
    session.notes = notes;
    await session.save();
    return res.json({ session, summary: { ...session.totals, cashVariance: session.cashVariance, closingCash: session.closingCash, expectedCash: session.expectedCash } });
  } catch (err) {
    console.error('close session error:', err);
    return res.status(500).json({ message: 'Failed to close session' });
  }
};
