/**
 * Court Ledger - Domain State Module (100% Pure Offline with CSV Support)
 * Manages venue pricing dataset loaded from venues.csv and persisted in localStorage.
 */

(function () {
  const DEFAULT_CSV = `场地名称,早场价格(RM/h),晚场价格(RM/h)
Lavana Sport Center Setapak,14.84,29.68
Setapak Badminton Center (SBC),14.00,28.00
TARUMT Sport Complex,0.00,0.00`;

  const LOCAL_VENUES_KEY = 'courtledger_offline_venues';

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

  function getCachedVenues() {
    try {
      const raw = localStorage.getItem(LOCAL_VENUES_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch (e) {
      console.warn('Failed to read venues from localStorage:', e);
    }
    return parseCSV(DEFAULT_CSV);
  }

  function saveCachedVenues(list) {
    try {
      localStorage.setItem(LOCAL_VENUES_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save venues to localStorage:', e);
    }
  }

  let venues = getCachedVenues();
  let selectedVenueIndex = 0;
  let rateMorning = 14.84;
  let rateEvening = 29.68;
  let onVenueChangeCallback = null;

  function getActiveRates() {
    const v = venues[selectedVenueIndex] || venues[0] || { name: '标准场地', rateMorning: 14.84, rateEvening: 29.68 };
    return {
      venueName: v.name,
      rateMorning: typeof v.rateMorning === 'number' ? v.rateMorning : (parseFloat(v.rateMorning) || 14.84),
      rateEvening: typeof v.rateEvening === 'number' ? v.rateEvening : (parseFloat(v.rateEvening) || 29.68)
    };
  }

  function updateActiveVenueRates() {
    const rates = getActiveRates();
    rateMorning = rates.rateMorning;
    rateEvening = rates.rateEvening;
    const venueRateBadge = document.getElementById('venue-rate-badge');
    if (venueRateBadge) {
      venueRateBadge.textContent = `早场 RM ${rateMorning.toFixed(2)} / 晚场 RM ${rateEvening.toFixed(2)}`;
    }
    const venueNameDisplay = document.getElementById('venue-name-display');
    if (venueNameDisplay) {
      venueNameDisplay.textContent = rates.venueName;
    }
    const morningEl = document.getElementById('venue-morning-rate');
    if (morningEl) {
      morningEl.textContent = rateMorning.toFixed(2);
    }
    const eveningEl = document.getElementById('venue-evening-rate');
    if (eveningEl) {
      eveningEl.textContent = rateEvening.toFixed(2);
    }
    if (typeof onVenueChangeCallback === 'function') {
      onVenueChangeCallback();
    }
  }

  function populateVenueSelect() {
    const venueSelect = document.getElementById('venue-select');
    if (!venueSelect) return;
    venueSelect.innerHTML = '';
    venues.forEach((v, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = v.name;
      venueSelect.appendChild(opt);
    });

    const savedIdx = parseInt(localStorage.getItem('selected-venue-index'));
    if (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < venues.length) {
      selectedVenueIndex = savedIdx;
    } else {
      selectedVenueIndex = 0;
    }
    venueSelect.value = selectedVenueIndex;
    updateActiveVenueRates();
  }

  async function loadVenuesFromCSVFile() {
    try {
      // If user hasn't explicitly customized yet, attempt to fetch venues.csv
      if (!localStorage.getItem(LOCAL_VENUES_KEY)) {
        const response = await fetch('venues.csv');
        if (response.ok) {
          const csvText = await response.text();
          const parsed = parseCSV(csvText);
          if (parsed.length > 0) {
            venues = parsed;
            saveCachedVenues(venues);
          }
        }
      }
    } catch (e) {
      // Offline file protocol or network error; fallback to cached or DEFAULT_CSV
      console.log('venues.csv fetch skipped/offline fallback active');
    }
    populateVenueSelect();
  }

  function initVenueState(onChangeCb) {
    onVenueChangeCallback = onChangeCb;
    const venueSelect = document.getElementById('venue-select');
    if (venueSelect) {
      venueSelect.addEventListener('change', (e) => {
        selectedVenueIndex = parseInt(e.target.value) || 0;
        localStorage.setItem('selected-venue-index', selectedVenueIndex);
        updateActiveVenueRates();
      });
    }
    loadVenuesFromCSVFile();
  }

  function addVenue(name, rMorning, rEvening) {
    const newId = venues.reduce((max, v) => Math.max(max, v.id || 0), 0) + 1;
    const newVenue = {
      id: newId,
      name: name.trim(),
      rateMorning: parseFloat(rMorning) || 0,
      rateEvening: parseFloat(rEvening) || 0
    };
    venues.push(newVenue);
    saveCachedVenues(venues);
    populateVenueSelect();
    return newVenue;
  }

  function updateVenue(id, name, rMorning, rEvening) {
    const idx = venues.findIndex(v => v.id === id);
    if (idx !== -1) {
      venues[idx].name = name.trim();
      venues[idx].rateMorning = parseFloat(rMorning) || 0;
      venues[idx].rateEvening = parseFloat(rEvening) || 0;
      saveCachedVenues(venues);
      populateVenueSelect();
      return venues[idx];
    }
    return null;
  }

  function deleteVenue(id) {
    if (venues.length <= 1) {
      throw new Error('至少保留一个球场预设');
    }
    venues = venues.filter(v => v.id !== id);
    if (selectedVenueIndex >= venues.length) {
      selectedVenueIndex = 0;
      localStorage.setItem('selected-venue-index', 0);
    }
    saveCachedVenues(venues);
    populateVenueSelect();
  }

  function resetVenuesToDefault() {
    venues = parseCSV(DEFAULT_CSV);
    saveCachedVenues(venues);
    selectedVenueIndex = 0;
    localStorage.setItem('selected-venue-index', 0);
    populateVenueSelect();
  }

  window.CourtLedgerState = {
    parseCSV,
    getVenues: () => [...venues],
    initVenueState,
    populateVenueSelect,
    getActiveRates,
    updateActiveVenueRates,
    addVenue,
    updateVenue,
    deleteVenue,
    resetVenuesToDefault
  };
})();
