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

function roundCurrency(val) {
  return Math.round((val + Number.EPSILON) * 100) / 100;
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

test('computeFeeAndBreakdown - 7 players, 1 host, rounded totalRevenue matches playerFee * payingPlayers', () => {
  // 7 players, 1 host (6 paying), courtFee RM 29.68, 3 shuttles @ RM 123/tube
  // Total cost: 29.68 + 30.75 = 60.43
  // Raw fee: 60.43 / 7 = 8.632857... -> rounded to 8.63
  // 6 paying players: 6 * 8.63 = 51.78
  const breakdown = computeFeeAndBreakdown(29.68, 3, 123.0, 7, 1, 0);
  assert.equal(breakdown.isValid, true);
  assert.equal(breakdown.payingPlayers, 6);
  assert.equal(breakdown.playerFee, 8.63);
  assert.equal(breakdown.totalRevenue, 51.78);
  assert.equal(roundCurrency(breakdown.playerFee * breakdown.payingPlayers), 51.78);
  assert.equal(breakdown.netProfit, -8.65);
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
