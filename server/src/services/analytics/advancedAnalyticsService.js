/**
 * Advanced Analytics Service
 * Comprehensive business intelligence and reporting
 */

import Order from '../../models/Order.js';
import MenuItem from '../../models/MenuItem.js';
import Review from '../../models/Review.js';
import User from '../../models/User.js';
import Branch from '../../models/Branch.js';

class AdvancedAnalyticsService {
  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(branchId, startDate, endDate) {
    const orders = await Order.find({
      branch: branchId,
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    return {
      overview: this.getOverviewMetrics(orders),
      sales: this.getSalesMetrics(orders),
      performance: this.getPerformanceMetrics(orders),
      trends: this.getTrendMetrics(orders),
      topItems: await this.getTopItems(branchId, startDate, endDate),
      customerMetrics: await this.getCustomerMetrics(branchId, startDate, endDate),
    };
  }

  /**
   * Get overview metrics
   */
  getOverviewMetrics(orders) {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      completedOrders,
      cancelledOrders,
      completionRate,
      averageOrderItems: this.calculateAverageItems(orders),
    };
  }

  /**
   * Get sales metrics
   */
  getSalesMetrics(orders) {
    const byPaymentMethod = this.groupByPaymentMethod(orders);
    const byHour = this.groupByHour(orders);
    const byDayOfWeek = this.groupByDayOfWeek(orders);

    return {
      byPaymentMethod,
      byHour,
      byDayOfWeek,
      peakHour: this.findPeakHour(byHour),
      peakDay: this.findPeakDay(byDayOfWeek),
      refundRate: this.calculateRefundRate(orders),
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(orders) {
    const avgPrepTime = this.calculateAveragePrepTime(orders);
    const avgDeliveryTime = this.calculateAverageDeliveryTime(orders);
    const onTimeDeliveryRate = this.calculateOnTimeDeliveryRate(orders);
    const customerSatisfaction = this.calculateAverageSatisfaction(orders);

    return {
      avgPrepTime,
      avgDeliveryTime,
      onTimeDeliveryRate,
      customerSatisfaction,
      throughput: this.calculateThroughput(orders),
    };
  }

  /**
   * Get trend metrics
   */
  getTrendMetrics(orders) {
    const dailyRevenue = this.groupByDate(orders);
    const revenueGrowth = this.calculateGrowthRate(dailyRevenue);
    const weekOverWeekGrowth = this.calculateWeekOverWeekGrowth(orders);
    const monthOverMonthGrowth = this.calculateMonthOverMonthGrowth(orders);

    return {
      dailyRevenue,
      revenueGrowth,
      weekOverWeekGrowth,
      monthOverMonthGrowth,
      trend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable',
    };
  }

  /**
   * Get top performing items
   */
  async getTopItems(branchId, startDate, endDate, limit = 10) {
    const items = await Order.aggregate([
      {
        $match: {
          branch: branchId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          count: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
          avgRating: { $avg: '$items.rating' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem',
        },
      },
      { $unwind: '$menuItem' },
    ]);

    return items.map(item => ({
      id: item._id,
      name: item.menuItem.name,
      quantity: item.count,
      revenue: item.revenue,
      avgRating: item.avgRating || 0,
    }));
  }

  /**
   * Get customer metrics
   */
  async getCustomerMetrics(branchId, startDate, endDate) {
    const orders = await Order.find({
      branch: branchId,
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const uniqueCustomers = new Set(orders.map(o => o.customerId)).size;
    const returningCustomers = this.calculateReturningCustomers(orders);
    const churnRate = this.calculateChurnRate(orders);
    const customerLTValue = this.calculateCustomerLTV(orders);
    const avgCustomerOrders = orders.length / (uniqueCustomers || 1);

    return {
      totalCustomers: uniqueCustomers,
      returningCustomers,
      churnRate,
      customerLTV: customerLTValue,
      avgOrdersPerCustomer: avgCustomerOrders,
      newCustomers: uniqueCustomers - returningCustomers,
    };
  }

  /**
   * Get inventory analytics
   */
  async getInventoryAnalytics(branchId) {
    const menuItems = await MenuItem.find({ branch: branchId }).lean();

    return {
      totalItems: menuItems.length,
      available: menuItems.filter(i => i.available).length,
      unavailable: menuItems.filter(i => !i.available).length,
      lowStock: menuItems.filter(i => i.stock < i.reorderLevel).length,
      overStock: menuItems.filter(i => i.stock > i.maxStock).length,
    };
  }

  /**
   * Get staff performance analytics
   */
  async getStaffPerformance(branchId, startDate, endDate) {
    const staff = await User.find({ branch: branchId, role: { $in: ['kitchen', 'waiter'] } }).lean();

    const performance = await Promise.all(staff.map(async (person) => {
      const orders = await Order.find({
        branch: branchId,
        [`${person.role}Id`]: person._id,
        createdAt: { $gte: startDate, $lte: endDate },
      }).lean();

      return {
        id: person._id,
        name: person.name,
        role: person.role,
        ordersProcessed: orders.length,
        avgPrepTime: this.calculateAveragePrepTime(orders),
        customerRating: this.calculateAverageSatisfaction(orders),
      };
    }));

    return performance;
  }

  /**
   * Get revenue by category
   */
  async getRevenueByCategory(branchId, startDate, endDate) {
    const data = await Order.aggregate([
      {
        $match: {
          branch: branchId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: '$item' },
      {
        $group: {
          _id: '$item.category',
          revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
          count: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    return data.map(cat => ({
      category: cat._id,
      revenue: cat.revenue,
      itemsSold: cat.count,
    }));
  }

  /**
   * Get customer feedback summary
   */
  async getFeedbackSummary(branchId, startDate, endDate) {
    const reviews = await Review.find({
      branch: branchId,
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

    const sentimentBreakdown = {
      positive: reviews.filter(r => r.sentiment === 'positive').length,
      neutral: reviews.filter(r => r.sentiment === 'neutral').length,
      negative: reviews.filter(r => r.sentiment === 'negative').length,
    };

    const topComments = reviews
      .filter(r => r.comment)
      .sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0))
      .slice(0, 5);

    return {
      totalReviews: reviews.length,
      avgRating,
      sentimentBreakdown,
      topComments,
    };
  }

  /**
   * Generate comparison report (vs previous period)
   */
  async getComparisonReport(branchId, startDate, endDate, previousStartDate, previousEndDate) {
    const current = await this.getDashboardAnalytics(branchId, startDate, endDate);
    const previous = await this.getDashboardAnalytics(branchId, previousStartDate, previousEndDate);

    return {
      current,
      previous,
      comparison: {
        revenueChange: ((current.overview.totalRevenue - previous.overview.totalRevenue) / (previous.overview.totalRevenue || 1)) * 100,
        orderChange: ((current.overview.totalOrders - previous.overview.totalOrders) / (previous.overview.totalOrders || 1)) * 100,
        avgOrderValueChange: ((current.overview.avgOrderValue - previous.overview.avgOrderValue) / (previous.overview.avgOrderValue || 1)) * 100,
      },
    };
  }

  // ==================== HELPER METHODS ====================

  calculateAverageItems(orders) {
    const totalItems = orders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
    return orders.length > 0 ? totalItems / orders.length : 0;
  }

  groupByPaymentMethod(orders) {
    return orders.reduce((acc, o) => {
      const method = o.paymentMethod || 'unknown';
      acc[method] = (acc[method] || 0) + o.total;
      return acc;
    }, {});
  }

  groupByHour(orders) {
    const hourly = {};
    orders.forEach(o => {
      const hour = new Date(o.createdAt).getHours();
      hourly[hour] = (hourly[hour] || 0) + 1;
    });
    return hourly;
  }

  groupByDayOfWeek(orders) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daily = {};
    orders.forEach(o => {
      const day = days[new Date(o.createdAt).getDay()];
      daily[day] = (daily[day] || 0) + 1;
    });
    return daily;
  }

  groupByDate(orders) {
    const daily = {};
    orders.forEach(o => {
      const date = new Date(o.createdAt).toISOString().split('T')[0];
      daily[date] = (daily[date] || 0) + o.total;
    });
    return daily;
  }

  findPeakHour(hourlyData) {
    return Object.entries(hourlyData).reduce((max, [hour, count]) =>
      count > max.count ? { hour: parseInt(hour), count } : max, { hour: 0, count: 0 });
  }

  findPeakDay(dailyData) {
    return Object.entries(dailyData).reduce((max, [day, count]) =>
      count > max.count ? { day, count } : max, { day: 'N/A', count: 0 });
  }

  calculateRefundRate(orders) {
    const refunded = orders.filter(o => o.status === 'refunded').length;
    return orders.length > 0 ? (refunded / orders.length) * 100 : 0;
  }

  calculateAveragePrepTime(orders) {
    const prepTimes = orders
      .filter(o => o.prepStartTime && o.prepEndTime)
      .map(o => new Date(o.prepEndTime) - new Date(o.prepStartTime));
    return prepTimes.length > 0 ? prepTimes.reduce((a, b) => a + b) / prepTimes.length / 1000 / 60 : 0; // in minutes
  }

  calculateAverageDeliveryTime(orders) {
    const deliveryTimes = orders
      .filter(o => o.createdAt && o.deliveredAt)
      .map(o => new Date(o.deliveredAt) - new Date(o.createdAt));
    return deliveryTimes.length > 0 ? deliveryTimes.reduce((a, b) => a + b) / deliveryTimes.length / 1000 / 60 : 0; // in minutes
  }

  calculateOnTimeDeliveryRate(orders) {
    const onTime = orders.filter(o => {
      if (!o.estimatedTime || !o.deliveredAt) return false;
      const estimated = new Date(o.createdAt).getTime() + o.estimatedTime * 60000;
      return new Date(o.deliveredAt).getTime() <= estimated;
    }).length;
    return orders.length > 0 ? (onTime / orders.length) * 100 : 0;
  }

  calculateAverageSatisfaction(orders) {
    const ratings = orders.filter(o => o.rating).map(o => o.rating);
    return ratings.length > 0 ? ratings.reduce((a, b) => a + b) / ratings.length : 0;
  }

  calculateThroughput(orders) {
    // Orders processed per hour
    if (orders.length === 0) return 0;
    const first = new Date(Math.min(...orders.map(o => new Date(o.createdAt))));
    const last = new Date(Math.max(...orders.map(o => new Date(o.createdAt))));
    const hours = (last - first) / 1000 / 60 / 60;
    return hours > 0 ? orders.length / hours : 0;
  }

  calculateGrowthRate(dailyData) {
    const values = Object.values(dailyData).filter(v => v > 0);
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    return ((last - first) / first) * 100;
  }

  calculateWeekOverWeekGrowth(orders) {
    const now = new Date();
    const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const lastWeek = orders.filter(o => new Date(o.createdAt) < thisWeekStart && new Date(o.createdAt) >= lastWeekStart).length;
    const thisWeek = orders.filter(o => new Date(o.createdAt) >= thisWeekStart).length;

    return lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
  }

  calculateMonthOverMonthGrowth(orders) {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonth = orders.filter(o => new Date(o.createdAt) < thisMonthStart && new Date(o.createdAt) >= lastMonthStart).length;
    const thisMonth = orders.filter(o => new Date(o.createdAt) >= thisMonthStart).length;

    return lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
  }

  calculateReturningCustomers(orders) {
    const customers = {};
    orders.forEach(o => {
      customers[o.customerId] = (customers[o.customerId] || 0) + 1;
    });
    return Object.values(customers).filter(count => count > 1).length;
  }

  calculateChurnRate(orders) {
    // Customers who haven't ordered in 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeCustomers = new Set(
      orders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo).map(o => o.customerId)
    ).size;
    const totalCustomers = new Set(orders.map(o => o.customerId)).size;
    return totalCustomers > 0 ? ((totalCustomers - activeCustomers) / totalCustomers) * 100 : 0;
  }

  calculateCustomerLTV(orders) {
    const customerSpend = {};
    orders.forEach(o => {
      customerSpend[o.customerId] = (customerSpend[o.customerId] || 0) + o.total;
    });
    const values = Object.values(customerSpend);
    return values.length > 0 ? values.reduce((a, b) => a + b) / values.length : 0;
  }
}

export default new AdvancedAnalyticsService();
