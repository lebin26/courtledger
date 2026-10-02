import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Pure calculation logic extracted for Node test runner
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
  const actualShuttleCost = shuttlesUsed * singleShuttlePrice;
  const actualTotalCost = courtFee + actualShuttleCost;
  const payingPlayers = totalPlayers - hostCount;

  let k = 0;
  while (k <= 100) {
    const billedShuttles = shuttlesUsed + k;
    const billedTotalCost = courtFee + (billedShuttles * singleShuttlePrice);
    const playerFee = billedTotalCost / totalPlayers;
    const totalRevenue = playerFee * payingPlayers;

    if (totalRevenue >= actualTotalCost - 0.0001) {
      return k;
    }
    k++;
  }
  return 0;
}

function computeFeeAndBreakdown(courtFee, shuttlesUsed, shuttlePrice, totalPlayers, hostCount, additionalShuttles) {
  const singleShuttlePrice = shuttlePrice > 0 ? (shuttlePrice / 12) : 0;
  const actualShuttleCost = shuttlesUsed * singleShuttlePrice;
  const actualTotalCost = courtFee + actualShuttleCost;
  const billedShuttles = shuttlesUsed + additionalShuttles;
  const billedShuttleCost = billedShuttles * singleShuttlePrice;
  const billedTotalCost = courtFee + billedShuttleCost;
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
      totalRevenue: 0,
      netProfit: 0
    };
  }

  let playerFee = 0;
  let totalRevenue = 0;

  if (singleShuttlePrice > 0) {
    playerFee = billedTotalCost / totalPlayers;
    totalRevenue = playerFee * payingPlayers;
  } else {
    playerFee = actualTotalCost / payingPlayers;
    totalRevenue = playerFee * payingPlayers;
  }

  let netProfit = totalRevenue - actualTotalCost;
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

function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.trim().split(/\r?\n/);
  const parsed = [];
  let idCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('场地名称') || line.toLowerCase().startsWith('venue')) {
      continue;
    }
    const parts = line.split(',');
    if (parts.length >= 3) {
      const name = parts[0].trim();
      const rateMorning = parseFloat(parts[1]) || 0;
      const rateEvening = parseFloat(parts[2]) || 0;
      if (name) {
        parsed.push({
          id: idCounter++,
          name,
          rateMorning,
          rateEvening
        });
      }
    }
  }
  return parsed;
}

test('calculateCourtFee - morning rate only', () => {
  const res = calculateCourtFee(10, 2, 14.0, 28.0);
  assert.equal(res.fee, 28.0);
  assert.equal(res.hasMorning, true);
  assert.equal(res.hasEvening, false);
});

test('calculateCourtFee - evening rate only', () => {
  const res = calculateCourtFee(19, 2, 14.0, 28.0);
  assert.equal(res.fee, 56.0);
  assert.equal(res.hasMorning, false);
  assert.equal(res.hasEvening, true);
});

test('calculateCourtFee - cross morning and evening rate with 2 courts', () => {
  const res = calculateCourtFee(17, 2, 14.0, 28.0, 2);
  assert.equal(res.singleCourtFee, 42.0);
  assert.equal(res.fee, 84.0);
  assert.equal(res.morningHours, 1);
  assert.equal(res.eveningHours, 1);
  assert.equal(res.hasMorning, true);
  assert.equal(res.hasEvening, true);
});

test('calculateRequiredHostShuttles - calculates correct host cover shuttles', () => {
  const hostShuttles = calculateRequiredHostShuttles(56.0, 4, 84.0, 8, 1);
  assert.equal(hostShuttles > 0, true);
});

test('computeFeeAndBreakdown - complete AA calculation breakdown', () => {
  // 6 players, 0 host, courtFee RM 59.36, 3 shuttles @ RM 123/tube (RM 10.25/shuttle)
  const breakdown = computeFeeAndBreakdown(59.36, 3, 123.0, 6, 0, 0);
  assert.equal(breakdown.isValid, true);
  assert.equal(breakdown.payingPlayers, 6);
  assert.equal(Math.round(breakdown.actualTotalCost * 100) / 100, 90.11);
  assert.equal(Math.round(breakdown.playerFee * 100) / 100, 15.02);
});

test('parseCSV - successfully parses venues.csv file', () => {
  const csvPath = path.resolve('frontend/venues.csv');
  assert.equal(fs.existsSync(csvPath), true, 'frontend/venues.csv should exist');
  const content = fs.readFileSync(csvPath, 'utf8');
  const venues = parseCSV(content);
  assert.equal(venues.length >= 3, true);
  assert.equal(venues[0].name, 'Lavana Sport Center Setapak');
  assert.equal(venues[0].rateMorning, 14.84);
  assert.equal(venues[0].rateEvening, 29.68);
});
