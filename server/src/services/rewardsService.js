const REWARDS_CATALOG = [
  // ── Digital Rewards ──
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    description: 'Protect your streak for one missed day. Max 2 in inventory.',
    category: 'digital',
    cost: 500,
    icon: '❄️',
    maxInventory: 2
  },
  {
    id: 'double_points_1h',
    name: '2x Points Boost (1 Hour)',
    description: 'Earn double points on all scans for the next 60 minutes.',
    category: 'digital',
    cost: 800,
    icon: '⚡'
  },
  {
    id: 'avatar_border_green',
    name: 'Green Aura Border',
    description: 'A vibrant emerald glow around your profile avatar.',
    category: 'digital',
    cost: 1000,
    icon: '🟢'
  },
  {
    id: 'avatar_border_gold',
    name: 'Gold Crown Border',
    description: 'A prestigious golden crown border for your avatar.',
    category: 'digital',
    cost: 3000,
    icon: '👑'
  },
  {
    id: 'premium_month',
    name: 'NutriScan Premium (1 Month)',
    description: 'Unlock premium features including detailed nutrient breakdowns.',
    category: 'digital',
    cost: 6000,
    icon: '💎'
  },

  // ── Real-World Rewards ──
  {
    id: 'discount_10',
    name: '10% Partner Discount',
    description: 'Get 10% off at select health food partner stores.',
    category: 'physical',
    cost: 2500,
    icon: '🏷️'
  },
  {
    id: 'free_snack',
    name: 'Free Protein Snack',
    description: 'Redeem a free protein bar or healthy snack at partner locations.',
    category: 'physical',
    cost: 5000,
    icon: '🍫'
  },
  {
    id: 'gift_card_5',
    name: '$5 Health Store Gift Card',
    description: 'A $5 gift card redeemable at Whole Foods or similar stores.',
    category: 'physical',
    cost: 15000,
    icon: '🎁'
  }
];

export const getRewardsCatalog = () =>
  REWARDS_CATALOG.map((reward) => ({ ...reward }));

/**
 * Validate and process a redemption.
 * Returns { success, reward, error }.
 */
export const redeemReward = (profile, rewardId) => {
  const reward = REWARDS_CATALOG.find((r) => r.id === rewardId);
  if (!reward) {
    return { success: false, error: 'Reward not found.' };
  }

  if (profile.currentBalance < reward.cost) {
    return {
      success: false,
      error: `Not enough points. Need ${reward.cost}, have ${profile.currentBalance}.`
    };
  }

  // Check max inventory for streak freezes
  if (reward.maxInventory && reward.id === 'streak_freeze') {
    if ((profile.streakFreezes || 0) >= reward.maxInventory) {
      return {
        success: false,
        error: `You already have the maximum of ${reward.maxInventory} streak freezes.`
      };
    }
  }

  return {
    success: true,
    reward,
    pointsDeducted: reward.cost
  };
};
