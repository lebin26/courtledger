/**
 * Court Ledger - Calculator Engine
 * Core mathematical algorithms for dynamic court rates and 3-tier shuttle AA bill splitting.
 */

(function () {
  function formatCurrency(val) {
    if (typeof val !== 'number' || isNaN(val)) return '0.00';
    return val.toFixed(2);
  }

  function roundCurrency(val) {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  function format12Hour(hour) {
    const h = hour % 24;
    if (h === 0) return "12:00 AM";
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return "12:00 PM";
    return `${h - 12}:00 PM`;
  }

  function calculateCourtFee(startHour, duration, rateMorning, rateEvening, courtCount = 1) {
    let totalFee = 0;
    let morningHours = 0;
    let eveningHours = 0;

    for (let h = 0; h < duration; h++) {
      const hourOfDay = (startHour + h) % 24;
      if (hourOfDay >= 0 && hourOfDay < 18) {
        totalFee += rateMorning;
        morningHours++;
      } else {
        totalFee += rateEvening;
        eveningHours++;
      }
    }

    const courts = Math.max(1, parseInt(courtCount) || 1);
    const totalFeeAllCourts = totalFee * courts;

    return {
      fee: totalFeeAllCourts,
      singleCourtFee: totalFee,
      morningHours,
      eveningHours,
      hasMorning: morningHours > 0,
      hasEvening: eveningHours > 0
    };
  }

  function calculateRequiredHostShuttles(courtFee, shuttlesUsed, shuttlePrice, totalPlayers, hostCount) {
    if (hostCount <= 0 || totalPlayers <= hostCount || shuttlePrice <= 0) {
      return 0;
    }
    const singleShuttlePrice = shuttlePrice / 12;
    const actualShuttleCost = roundCurrency(shuttlesUsed * singleShuttlePrice);
    const actualTotalCost = roundCurrency(courtFee + actualShuttleCost);
    const payingPlayers = totalPlayers - hostCount;

    let k = 0;
    while (k <= 100) {
      const billedShuttles = shuttlesUsed + k;
      const billedShuttleCost = roundCurrency(billedShuttles * singleShuttlePrice);
      const billedTotalCost = roundCurrency(courtFee + billedShuttleCost);
      const rawPlayerFee = billedTotalCost / totalPlayers;
      const playerFee = roundCurrency(rawPlayerFee);
      const totalRevenue = roundCurrency(playerFee * payingPlayers);

      if (totalRevenue >= actualTotalCost - 0.0001) {
        return k;
      }
      k++;
    }
    return 0;
  }

  function computeFeeAndBreakdown(courtFee, shuttlesUsed, shuttlePrice, totalPlayers, hostCount, additionalShuttles) {
    const singleShuttlePrice = shuttlePrice > 0 ? (shuttlePrice / 12) : 0;
    const actualShuttleCost = roundCurrency(shuttlesUsed * singleShuttlePrice);
    const actualTotalCost = roundCurrency(courtFee + actualShuttleCost);
    const billedShuttles = shuttlesUsed + additionalShuttles;
    const billedShuttleCost = roundCurrency(billedShuttles * singleShuttlePrice);
    const billedTotalCost = roundCurrency(courtFee + billedShuttleCost);
    const payingPlayers = totalPlayers - hostCount;

    const requiredHostShuttles = calculateRequiredHostShuttles(
      courtFee, shuttlesUsed, shuttlePrice, totalPlayers, hostCount
    );
    const appliedCoverShuttles = Math.min(additionalShuttles, requiredHostShuttles);
    const profitShuttles = Math.max(0, additionalShuttles - requiredHostShuttles);

    if (payingPlayers <= 0 || totalPlayers <= 0) {
      return {
        isValid: false,
        actualTotalCost,
        payingPlayers,
        playerFee: 0,
        shuttlesUsed,
        requiredHostShuttles,
        appliedCoverShuttles,
        additionalShuttles,
        profitShuttles,
        billedShuttles,
        billedShuttleCost,
        billedTotalCost,
        totalRevenue: 0,
        netProfit: 0
      };
    }

    let playerFee = 0;
    let totalRevenue = 0;

    if (singleShuttlePrice > 0) {
      const rawFee = billedTotalCost / totalPlayers;
      playerFee = roundCurrency(rawFee);
      totalRevenue = roundCurrency(playerFee * payingPlayers);
    } else {
      const rawFee = actualTotalCost / payingPlayers;
      playerFee = roundCurrency(rawFee);
      totalRevenue = roundCurrency(playerFee * payingPlayers);
    }

    let netProfit = roundCurrency(totalRevenue - actualTotalCost);
    if (Math.abs(netProfit) < 0.005) {
      netProfit = 0;
    }

    return {
      isValid: true,
      actualTotalCost,
      payingPlayers,
      playerFee,
      shuttlesUsed,
      requiredHostShuttles,
      appliedCoverShuttles,
      additionalShuttles,
      profitShuttles,
      billedShuttles,
      billedShuttleCost,
      billedTotalCost,
      totalRevenue,
      netProfit
    };
  }

  window.CourtLedgerCalc = {
    formatCurrency,
    format12Hour,
    roundCurrency,
    calculateCourtFee,
    computeCourtFee: calculateCourtFee,
    calculateRequiredHostShuttles,
    computeFeeAndBreakdown
  };
})();
