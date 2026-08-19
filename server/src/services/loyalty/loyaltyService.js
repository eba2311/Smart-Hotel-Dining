/**
 * Loyalty & Rewards Program Service
 * Manages customer loyalty points, tiers, and rewards
 */

import LoyaltyProgram from '../../models/LoyaltyProgram.js';

class LoyaltyService {
  /**
   * Get or create customer loyalty account
   */
  async getOrCreateAccount(branchId, customerId) {
    let account = await LoyaltyProgram.findOne({ branch: branchId, customerId });

    if (!account) {
      account = await LoyaltyProgram.create({
        branch: branchId,
        customerId,
        points: 100, // Welcome bonus
      });
    }

    return account;
  }

  /**
   * Add points for order
   */
  async addPointsForOrder(branchId, customerId, orderAmount, orderItems) {
    const account = await this.getOrCreateAccount(branchId, customerId);

    // Calculate points: 1 point per ETB spent
    const pointsEarned = Math.floor(orderAmount);

    // Bonus multipliers for categories
    const categoryBonus = this.calculateCategoryBonus(orderItems);

    // Tier bonus
    const tierBonus = this.getTierBonus(account.tier);

    const totalPoints = Math.floor(pointsEarned * (1 + categoryBonus + tierBonus / 100));

    // Update account
    account.points += totalPoints;
    account.totalSpent += orderAmount;
    account.totalOrders += 1;
    account.lastVisitDate = new Date();
    account.visitCount += 1;

    // Update tier based on total spent
    account.tier = this.calculateTier(account.totalSpent);

    // Add to purchase history
    account.purchaseHistory.push({
      amount: orderAmount,
      date: new Date(),
      items: orderItems.map(i => i.name),
    });

    await account.save();

    return {
      pointsEarned: totalPoints,
      totalPoints: account.points,
      tier: account.tier,
      newRewards: this.generateRewardsForPoints(account.points),
    };
  }

  /**
   * Redeem points for discount
   */
  async redeemPoints(branchId, customerId, pointsToRedeem) {
    const account = await LoyaltyProgram.findOne({ branch: branchId, customerId });

    if (!account) {
      throw new Error('Loyalty account not found');
    }

    if (account.points < pointsToRedeem) {
      throw new Error(`Insufficient points. Have: ${account.points}, Need: ${pointsToRedeem}`);
    }

    // 100 points = ETB 50 discount (1 point = 0.5 ETB)
    const discountAmount = (pointsToRedeem / 100) * 50;

    // Generate redemption voucher
    const voucherCode = `RWD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    account.points -= pointsToRedeem;
    account.rewards.push({
      type: 'discount',
      amount: discountAmount,
      code: voucherCode,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    await account.save();

    return {
      voucherCode,
      discountAmount,
      remainingPoints: account.points,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Get tier benefits
   */
  getTierBenefits(tier) {
    const benefits = {
      bronze: {
        name: 'Bronze Member',
        pointsMultiplier: 1,
        discountPercentage: 0,
        freeDeliveryThreshold: null,
        prioritySupport: false,
        exclusiveOffers: [],
      },
      silver: {
        name: 'Silver Member',
        pointsMultiplier: 1.25,
        discountPercentage: 5,
        freeDeliveryThreshold: 300,
        prioritySupport: false,
        exclusiveOffers: ['earlyAccess', 'weeklyDeals'],
      },
      gold: {
        name: 'Gold Member',
        pointsMultiplier: 1.5,
        discountPercentage: 10,
        freeDeliveryThreshold: 200,
        prioritySupport: true,
        exclusiveOffers: ['earlyAccess', 'weeklyDeals', 'birthdayBonus', 'specialEvents'],
      },
      platinum: {
        name: 'Platinum Member',
        pointsMultiplier: 2,
        discountPercentage: 15,
        freeDeliveryThreshold: null, // Always free
        prioritySupport: true,
        exclusiveOffers: ['earlyAccess', 'weeklyDeals', 'birthdayBonus', 'specialEvents', 'vipEvents'],
      },
    };

    return benefits[tier] || benefits.bronze;
  }

  /**
   * Check available rewards for redemption
   */
  async getAvailableRewards(branchId, customerId) {
    const account = await LoyaltyProgram.findOne({ branch: branchId, customerId });

    if (!account) {
      return null;
    }

    const availableRewards = account.rewards.filter(r => !r.used && r.expiryDate > new Date());
    const expiredRewards = account.rewards.filter(r => r.expiryDate <= new Date());

    return {
      currentPoints: account.points,
      availableRewards,
      expiredRewards,
      tier: account.tier,
      tierBenefits: this.getTierBenefits(account.tier),
      nextTierThreshold: this.getNextTierThreshold(account.totalSpent),
    };
  }

  /**
   * Apply loyalty discount to order
   */
  async applyLoyaltyDiscount(branchId, customerId, orderTotal, rewardCode) {
    const account = await LoyaltyProgram.findOne({ branch: branchId, customerId });

    if (!account) {
      throw new Error('No loyalty account found');
    }

    // Find reward with code
    const reward = account.rewards.find(r => r.code === rewardCode && !r.used);

    if (!reward) {
      throw new Error('Reward not found or already used');
    }

    if (reward.expiryDate < new Date()) {
      throw new Error('Reward has expired');
    }

    // Mark as used
    reward.used = true;
    reward.usedDate = new Date();
    await account.save();

    const discountAmount = Math.min(reward.amount, orderTotal);

    return {
      discountAmount,
      finalTotal: orderTotal - discountAmount,
      message: `Reward applied! You saved ETB ${discountAmount.toFixed(2)}`,
    };
  }

  /**
   * Send birthday reward
   */
  async sendBirthdayReward(branchId, customerId) {
    const account = await LoyaltyProgram.findOne({ branch: branchId, customerId });

    if (!account || !account.preferences.birthDate) {
      return null;
    }

    const today = new Date();
    const birthDate = new Date(account.preferences.birthDate);

    if (birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate()) {
      // Generate birthday voucher
      const voucherCode = `BDAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const discount = account.tier === 'platinum' ? 500 : account.tier === 'gold' ? 250 : 100; // ETB

      account.rewards.push({
        type: 'voucher',
        amount: discount,
        code: voucherCode,
        expiryDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      account.points += 250; // Bonus points

      await account.save();

      return {
        voucherCode,
        discountAmount: discount,
        bonusPoints: 250,
      };
    }

    return null;
  }

  /**
   * Get loyalty dashboard data
   */
  async getLoyaltyDashboard(branchId, customerId) {
    const account = await LoyaltyProgram.findOne({ branch: branchId, customerId });

    if (!account) {
      return null;
    }

    const tierBenefits = this.getTierBenefits(account.tier);
    const nextTierThreshold = this.getNextTierThreshold(account.totalSpent);

    return {
      profile: {
        customerId: account.customerId,
        tier: account.tier,
        tierName: tierBenefits.name,
        joinedDate: account.joinedDate,
        lastVisitDate: account.lastVisitDate,
      },
      points: {
        current: account.points,
        earned: account.totalSpent,
        redemptionValue: (account.points / 100) * 50,
      },
      spending: {
        totalSpent: account.totalSpent,
        totalOrders: account.totalOrders,
        averageOrderValue: account.totalOrders > 0 ? account.totalSpent / account.totalOrders : 0,
        visitCount: account.visitCount,
      },
      progress: {
        currentTier: account.tier,
        nextTierThreshold,
        progressToNextTier: nextTierThreshold > 0
          ? Math.min(100, (account.totalSpent / nextTierThreshold) * 100)
          : 100,
      },
      benefits: tierBenefits,
      rewards: {
        available: account.rewards.filter(r => !r.used && r.expiryDate > new Date()),
        used: account.rewards.filter(r => r.used),
        expired: account.rewards.filter(r => r.expiryDate <= new Date()),
      },
      recentPurchases: account.purchaseHistory.slice(-5),
    };
  }

  // ==================== HELPER METHODS ====================

  calculateTier(totalSpent) {
    if (totalSpent >= 10000) return 'platinum';
    if (totalSpent >= 5000) return 'gold';
    if (totalSpent >= 2000) return 'silver';
    return 'bronze';
  }

  getTierBonus(tier) {
    const bonuses = {
      platinum: 50,
      gold: 25,
      silver: 10,
      bronze: 0,
    };
    return bonuses[tier] || 0;
  }

  calculateCategoryBonus(orderItems) {
    // Bonus for specific categories
    const bonusCategories = {
      'vegetarian': 0.1,
      'premium': 0.15,
      'desserts': 0.05,
    };

    let bonus = 0;
    orderItems.forEach(item => {
      Object.entries(bonusCategories).forEach(([category, multiplier]) => {
        if (item.category && item.category.toLowerCase().includes(category)) {
          bonus += multiplier;
        }
      });
    });

    return Math.min(bonus, 0.25); // Max 25% bonus
  }

  generateRewardsForPoints(totalPoints) {
    // Auto-generate rewards at certain point thresholds
    const rewards = [];

    if (totalPoints >= 500 && totalPoints < 600) {
      rewards.push({
        type: 'freeItem',
        value: 'Free Appetizer',
        pointsRequired: 500,
      });
    }

    if (totalPoints >= 1000) {
      rewards.push({
        type: 'discount',
        value: 'ETB 150 Discount',
        pointsRequired: 1000,
      });
    }

    if (totalPoints >= 2000) {
      rewards.push({
        type: 'voucher',
        value: 'Premium Dinner Voucher',
        pointsRequired: 2000,
      });
    }

    return rewards;
  }

  getNextTierThreshold(currentSpent) {
    if (currentSpent < 2000) return 2000;
    if (currentSpent < 5000) return 5000;
    if (currentSpent < 10000) return 10000;
    return Infinity;
  }
}

export default new LoyaltyService();
