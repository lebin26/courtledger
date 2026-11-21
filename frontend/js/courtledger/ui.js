/**
 * Court Ledger - UI Binding & Controls Module
 * Receipts & Grouped Rows Experience (Zero Build, Pure Offline)
 */

(function () {
  const SAVE_KEY = 'courtledger_receipt_inputs';
  let latestCalcData = null;

  // ── Long Press Continuous Helper ──
  function setupLongPressStepper(buttonEl, onStep) {
    if (!buttonEl) return;
    let initialTimeout = null;
    let repeatInterval = null;
    let isPressed = false;

    function stop() {
      if (initialTimeout) clearTimeout(initialTimeout);
      if (repeatInterval) clearInterval(repeatInterval);
      initialTimeout = null;
      repeatInterval = null;
      isPressed = false;
    }

    function start(e) {
      if (buttonEl.disabled || buttonEl.getAttribute('aria-disabled') === 'true') return;
      if (e.cancelable && e.type === 'touchstart') e.preventDefault();
      stop();
      isPressed = true;
      onStep();

      let currentIntervalTime = 160;
      initialTimeout = setTimeout(() => {
        if (!isPressed) return;
        repeatInterval = setInterval(() => {
          if (!isPressed) {
            stop();
            return;
          }
          onStep();
          // Gently accelerate if held longer
          if (currentIntervalTime > 60) {
            currentIntervalTime -= 15;
            clearInterval(repeatInterval);
            repeatInterval = setInterval(() => {
              if (isPressed) onStep();
              else stop();
            }, currentIntervalTime);
          }
        }, currentIntervalTime);
      }, 350);
    }

    buttonEl.addEventListener('mousedown', start);
    window.addEventListener('mouseup', stop);
    buttonEl.addEventListener('mouseleave', stop);

    buttonEl.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchend', stop);
    window.addEventListener('touchcancel', stop);

    // Keyboard support (Enter or Space)
    buttonEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStep();
      }
    });
  }

  function saveUserInputs() {
    try {
      const startTime = document.getElementById('start-time-select');
      const durationOpt = document.querySelector('input[name="duration"]:checked');
      const courtOpt = document.querySelector('input[name="court-count"]:checked');
      const hostOpt = document.querySelector('input[name="host-count"]:checked');

      const data = {
        startTime: startTime ? startTime.value : '16',
        duration: durationOpt ? parseInt(durationOpt.value) : 2,
        courtCount: courtOpt ? parseInt(courtOpt.value) : 1,
        hostCount: hostOpt ? parseInt(hostOpt.value) : 1,
        totalPlayers: document.getElementById('total-players') ? document.getElementById('total-players').value : '6',
        shuttlesUsed: document.getElementById('shuttles-used') ? document.getElementById('shuttles-used').value : '3',
        shuttlePrice: document.getElementById('shuttle-price') ? document.getElementById('shuttle-price').value : '123.00',
        additionalShuttles: document.getElementById('additional-shuttles') ? document.getElementById('additional-shuttles').value : '0'
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }

  function restoreUserInputs() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      const startTime = document.getElementById('start-time-select');
      if (startTime && data.startTime !== undefined) {
        startTime.value = data.startTime;
        updateTimeSelectDisplay();
      }

      if (data.duration) {
        const rad = document.getElementById('dur-' + data.duration);
        if (rad) {
          rad.checked = true;
          updateSegmentedActiveStyles('duration');
        }
      }

      if (data.courtCount) {
        const rad = document.getElementById('court-' + data.courtCount);
        if (rad) {
          rad.checked = true;
          updateSegmentedActiveStyles('court-count');
        }
      }

      if (data.hostCount !== undefined) {
        const rad = document.getElementById('host-' + data.hostCount);
        if (rad) {
          rad.checked = true;
          updateSegmentedActiveStyles('host-count');
        }
      }

      if (data.totalPlayers) {
        const el = document.getElementById('total-players');
        if (el) el.value = data.totalPlayers;
        const disp = document.getElementById('players-display');
        if (disp) disp.textContent = data.totalPlayers;
      }

      if (data.shuttlesUsed) {
        const el = document.getElementById('shuttles-used');
        if (el) el.value = data.shuttlesUsed;
        const disp = document.getElementById('shuttles-display');
        if (disp) disp.textContent = data.shuttlesUsed;
      }

      if (data.shuttlePrice) {
        const el = document.getElementById('shuttle-price');
        if (el) el.value = data.shuttlePrice;
      }

      if (data.additionalShuttles !== undefined) {
        const el = document.getElementById('additional-shuttles');
        if (el) el.value = data.additionalShuttles;
        const disp = document.getElementById('add-shuttles-display');
        if (disp) disp.textContent = data.additionalShuttles;
      }
    } catch (e) { /* ignore */ }
  }

  function updateTimeSelectDisplay() {
    const sel = document.getElementById('start-time-select');
    const disp = document.getElementById('start-time-display');
    if (sel && disp && sel.selectedOptions.length > 0) {
      disp.textContent = sel.selectedOptions[0].textContent;
    }
  }

  function updateSegmentedActiveStyles(groupName) {
    const radios = document.querySelectorAll(`input[name="${groupName}"]`);
    radios.forEach(radio => {
      const parentLabel = radio.closest('.segmented-opt');
      if (parentLabel) {
        parentLabel.classList.toggle('active', radio.checked);
      }
    });
  }

  function updateStepperBoundaries() {
    // Players (min 1, max 40)
    const pVal = parseInt(document.getElementById('total-players')?.value || 6);
    const pMinus = document.getElementById('players-minus');
    const pPlus = document.getElementById('players-plus');
    if (pMinus) {
      const dis = pVal <= 1;
      pMinus.disabled = dis;
      pMinus.setAttribute('aria-disabled', dis ? 'true' : 'false');
    }
    if (pPlus) {
      const dis = pVal >= 40;
      pPlus.disabled = dis;
      pPlus.setAttribute('aria-disabled', dis ? 'true' : 'false');
    }

    // Shuttles Used (min 0, max 30)
    const sVal = parseInt(document.getElementById('shuttles-used')?.value || 3);
    const sMinus = document.getElementById('shuttles-minus');
    const sPlus = document.getElementById('shuttles-plus');
    if (sMinus) {
      const dis = sVal <= 0;
      sMinus.disabled = dis;
      sMinus.setAttribute('aria-disabled', dis ? 'true' : 'false');
    }
    if (sPlus) {
      const dis = sVal >= 30;
      sPlus.disabled = dis;
      sPlus.setAttribute('aria-disabled', dis ? 'true' : 'false');
    }

    // Additional Shuttles (min 0, max 20)
    const aVal = parseInt(document.getElementById('additional-shuttles')?.value || 0);
    const aMinus = document.getElementById('add-shuttles-minus');
    const aPlus = document.getElementById('add-shuttles-plus');
    if (aMinus) {
      const dis = aVal <= 0;
      aMinus.disabled = dis;
      aMinus.setAttribute('aria-disabled', dis ? 'true' : 'false');
    }
    if (aPlus) {
      const dis = aVal >= 20;
      aPlus.disabled = dis;
      aPlus.setAttribute('aria-disabled', dis ? 'true' : 'false');
    }
  }

  function initCourtLedgerUI() {
    const startTimeSelect = document.getElementById('start-time-select');
    const shuttlesUsedInput = document.getElementById('shuttles-used');
    const shuttlePriceInput = document.getElementById('shuttle-price');
    const totalPlayersInput = document.getElementById('total-players');
    const additionalShuttlesInput = document.getElementById('additional-shuttles');

    const playersMinusBtn = document.getElementById('players-minus');
    const playersPlusBtn = document.getElementById('players-plus');
    const playersDisplayVal = document.getElementById('players-display');

    const shuttlesMinusBtn = document.getElementById('shuttles-minus');
    const shuttlesPlusBtn = document.getElementById('shuttles-plus');
    const shuttlesDisplayVal = document.getElementById('shuttles-display');

    const addShuttlesMinusBtn = document.getElementById('add-shuttles-minus');
    const addShuttlesPlusBtn = document.getElementById('add-shuttles-plus');
    const addShuttlesDisplay = document.getElementById('add-shuttles-display');

    const courtFeeFootnote = document.getElementById('court-fee-footnote');
    const shuttleSubtitle = document.getElementById('shuttle-subtitle');

    const heroPriceDesktop = document.getElementById('player-fee-display-desktop');
    const heroPriceDock = document.getElementById('player-fee-display-dock');
    const contextPillText = document.getElementById('context-pill-text');
    const contextPillTextDrawer = document.getElementById('context-pill-text-drawer');

    const totalCostDisplay = document.getElementById('total-cost-display');
    const totalRevenueDisplay = document.getElementById('total-revenue-display');
    const netProfitDisplay = document.getElementById('net-profit-display');

    const totalCostDrawer = document.getElementById('total-cost-drawer');
    const totalRevenueDrawer = document.getElementById('total-revenue-drawer');
    const netProfitDrawer = document.getElementById('net-profit-drawer');

    const sumActualShuttles = document.getElementById('sum-actual-shuttles');
    const sumCoverShuttles = document.getElementById('sum-cover-shuttles');
    const sumProfitShuttles = document.getElementById('sum-profit-shuttles');
    const sumBilledShuttles = document.getElementById('sum-billed-shuttles');

    const calcErrorNotice = document.getElementById('calc-error-notice');

    const btnCopyReceipt = document.getElementById('btn-copy-receipt');
    const btnCopyDock = document.getElementById('btn-copy-mobile-dock');

    const shuttleFoldTrigger = document.getElementById('shuttle-fold-trigger');
    const shuttleFoldBody = document.getElementById('shuttle-fold-body');

    const mobileDockInfo = document.getElementById('mobile-dock-info');
    const mobileDrawerSheet = document.getElementById('mobile-drawer-sheet');

    // ── Setup Steppers with Continuous Long Press ──
    setupLongPressStepper(playersMinusBtn, () => {
      let cur = parseInt(totalPlayersInput.value) || 1;
      if (cur > 1) {
        cur--;
        totalPlayersInput.value = cur;
        if (playersDisplayVal) playersDisplayVal.textContent = cur;
        updateStepperBoundaries();
        calculate();
      }
    });

    setupLongPressStepper(playersPlusBtn, () => {
      let cur = parseInt(totalPlayersInput.value) || 1;
      if (cur < 40) {
        cur++;
        totalPlayersInput.value = cur;
        if (playersDisplayVal) playersDisplayVal.textContent = cur;
        updateStepperBoundaries();
        calculate();
      }
    });

    setupLongPressStepper(shuttlesMinusBtn, () => {
      let cur = parseInt(shuttlesUsedInput.value) || 0;
      if (cur > 0) {
        cur--;
        shuttlesUsedInput.value = cur;
        if (shuttlesDisplayVal) shuttlesDisplayVal.textContent = cur;
        updateStepperBoundaries();
        calculate();
      }
    });

    setupLongPressStepper(shuttlesPlusBtn, () => {
      let cur = parseInt(shuttlesUsedInput.value) || 0;
      if (cur < 30) {
        cur++;
        shuttlesUsedInput.value = cur;
        if (shuttlesDisplayVal) shuttlesDisplayVal.textContent = cur;
        updateStepperBoundaries();
        calculate();
      }
    });

    setupLongPressStepper(addShuttlesMinusBtn, () => {
      let cur = parseInt(additionalShuttlesInput.value) || 0;
      if (cur > 0) {
        cur--;
        additionalShuttlesInput.value = cur;
        if (addShuttlesDisplay) addShuttlesDisplay.textContent = cur;
        updateStepperBoundaries();
        calculate();
      }
    });

    setupLongPressStepper(addShuttlesPlusBtn, () => {
      let cur = parseInt(additionalShuttlesInput.value) || 0;
      if (cur < 20) {
        cur++;
        additionalShuttlesInput.value = cur;
        if (addShuttlesDisplay) addShuttlesDisplay.textContent = cur;
        updateStepperBoundaries();
        calculate();
      }
    });

    // Segmented radio change listeners
    ['duration', 'court-count', 'host-count'].forEach(grp => {
      document.querySelectorAll(`input[name="${grp}"]`).forEach(rad => {
        rad.addEventListener('change', () => {
          updateSegmentedActiveStyles(grp);
          calculate();
        });
      });
    });

    // Time select listener
    if (startTimeSelect) {
      startTimeSelect.addEventListener('change', () => {
        updateTimeSelectDisplay();
        calculate();
      });
    }

    // Shuttle price input and row focus listener
    const priceSettingRow = document.getElementById('price-setting-row');
    if (priceSettingRow && shuttlePriceInput) {
      priceSettingRow.addEventListener('click', (e) => {
        if (e.target !== shuttlePriceInput) {
          shuttlePriceInput.focus();
        }
      });
    }

    if (shuttlePriceInput) {
      shuttlePriceInput.addEventListener('focus', () => {
        shuttlePriceInput.select();
      });
      shuttlePriceInput.addEventListener('input', () => {
        calculate();
      });
    }

    // Foldable Shuttle Detail toggle
    if (shuttleFoldTrigger && shuttleFoldBody) {
      shuttleFoldTrigger.addEventListener('click', () => {
        const isOpen = shuttleFoldBody.classList.toggle('open');
        shuttleFoldTrigger.classList.toggle('expanded', isOpen);
        shuttleFoldTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    // Mobile Bottom Sheet toggle
    if (mobileDockInfo && mobileDrawerSheet) {
      mobileDockInfo.addEventListener('click', () => {
        mobileDrawerSheet.classList.toggle('open');
      });

      // Click outside to close drawer
      document.addEventListener('click', (e) => {
        if (!mobileDrawerSheet.contains(e.target) && !mobileDockInfo.contains(e.target)) {
          mobileDrawerSheet.classList.remove('open');
        }
      });
    }

    // Restore saved settings on initial load
    restoreUserInputs();
    updateTimeSelectDisplay();
    updateSegmentedActiveStyles('duration');
    updateSegmentedActiveStyles('court-count');
    updateSegmentedActiveStyles('host-count');
    updateStepperBoundaries();

    // ── Primary Calculation Pipeline ──
    function calculate() {
      if (!startTimeSelect || !window.CourtLedgerCalc) return;

      const startHour = parseInt(startTimeSelect.value) || 0;
      const durationRad = document.querySelector('input[name="duration"]:checked');
      const duration = durationRad ? parseInt(durationRad.value) : 2;

      const courtRad = document.querySelector('input[name="court-count"]:checked');
      const courtCount = courtRad ? parseInt(courtRad.value) : 1;

      const hostRad = document.querySelector('input[name="host-count"]:checked');
      const hostCount = hostRad ? parseInt(hostRad.value) : 1;

      const shuttlesUsed = parseInt(shuttlesUsedInput.value) || 0;
      const shuttlePrice = parseFloat(shuttlePriceInput.value) || 0;
      const totalPlayers = parseInt(totalPlayersInput.value) || 1;
      const additionalShuttles = parseInt(additionalShuttlesInput.value) || 0;

      const rates = window.CourtLedgerState
        ? window.CourtLedgerState.getActiveRates()
        : { venueName: '标准球场', rateMorning: 14.84, rateEvening: 29.68 };

      const endHour = startHour + duration;
      const startStr = window.CourtLedgerCalc.format12Hour(startHour);
      const endStr = window.CourtLedgerCalc.format12Hour(endHour);

      // Compute Court Fee
      const courtFeeResult = window.CourtLedgerCalc.computeCourtFee(
        startHour, duration, rates.rateMorning, rates.rateEvening, courtCount
      );
      const courtFee = courtFeeResult.fee;

      // Group 1 Footnote update
      if (courtFeeFootnote) {
        let formula = '';
        if (courtFeeResult.morningHours > 0 && courtFeeResult.eveningHours > 0) {
          formula = `早场 ${courtFeeResult.morningHours}h + 晚场 ${courtFeeResult.eveningHours}h × ${courtCount}片`;
        } else if (courtFeeResult.morningHours > 0) {
          formula = `早场 ${courtFeeResult.morningHours}h × ${courtCount}片`;
        } else if (courtFeeResult.eveningHours > 0) {
          formula = `晚场 ${courtFeeResult.eveningHours}h × ${courtCount}片`;
        }
        courtFeeFootnote.innerHTML = `场地费：${formula} = <strong>RM ${window.CourtLedgerCalc.formatCurrency(courtFee)}</strong>`;
      }

      // Compute Complete Breakdown
      const calcResult = window.CourtLedgerCalc.computeFeeAndBreakdown(
        courtFee, shuttlesUsed, shuttlePrice, totalPlayers, hostCount, additionalShuttles
      );

      latestCalcData = {
        venueName: rates.venueName,
        startStr,
        endStr,
        duration,
        courtCount,
        courtFee,
        totalPlayers,
        hostCount,
        shuttlesUsed,
        shuttlePrice,
        additionalShuttles,
        calcResult
      };

      // Context Tag Pill
      const hostPart = hostCount > 0 ? `${hostCount} Host · ` : '';
      const addPart = additionalShuttles > 0 ? ` (+${additionalShuttles}加球)` : '';
      const contextText = `${totalPlayers} 人 · ${hostPart}${duration}h · ${courtCount} 片 · ${shuttlesUsed} 球${addPart}`;
      if (contextPillText) contextPillText.textContent = contextText;
      if (contextPillTextDrawer) contextPillTextDrawer.textContent = contextText;

      // Dynamic Subtitle for 附加加球
      if (shuttleSubtitle) {
        if (calcResult.requiredHostShuttles > 0) {
          if (additionalShuttles >= calcResult.requiredHostShuttles) {
            shuttleSubtitle.innerHTML = '已覆盖 Host 成本';
            shuttleSubtitle.className = 'row-subtitle status-success';
          } else {
            const remain = calcResult.requiredHostShuttles - additionalShuttles;
            shuttleSubtitle.innerHTML = `<button type="button" class="btn-apply-suggestion">建议加 ${remain} 个覆盖 Host · 点击应用</button>`;
            shuttleSubtitle.className = 'row-subtitle';
            const btnApply = shuttleSubtitle.querySelector('.btn-apply-suggestion');
            if (btnApply) {
              btnApply.addEventListener('click', (e) => {
                e.stopPropagation();
                additionalShuttlesInput.value = calcResult.requiredHostShuttles;
                if (addShuttlesDisplay) addShuttlesDisplay.textContent = calcResult.requiredHostShuttles;
                updateStepperBoundaries();
                calculate();
              });
            }
          }
        } else {
          shuttleSubtitle.innerHTML = '无需加球覆盖 Host';
          shuttleSubtitle.className = 'row-subtitle';
        }
      }

      // Shuttle Breakdown Metric Tiles
      if (sumActualShuttles) sumActualShuttles.textContent = `${calcResult.shuttlesUsed} 个`;
      if (sumCoverShuttles) sumCoverShuttles.textContent = `+${calcResult.appliedCoverShuttles} 个`;
      if (sumProfitShuttles) sumProfitShuttles.textContent = `${calcResult.profitShuttles} 个`;
      if (sumBilledShuttles) sumBilledShuttles.textContent = `${calcResult.billedShuttles} 个`;

      // Handle Invalid / Valid states
      if (!calcResult.isValid) {
        if (calcErrorNotice) calcErrorNotice.classList.remove('hidden');
        if (heroPriceDesktop) {
          heroPriceDesktop.textContent = '--';
          heroPriceDesktop.classList.add('error-state');
        }
        if (heroPriceDock) {
          heroPriceDock.textContent = '--';
        }
        if (totalCostDisplay) totalCostDisplay.textContent = `RM ${window.CourtLedgerCalc.formatCurrency(calcResult.actualTotalCost)}`;
        if (totalRevenueDisplay) totalRevenueDisplay.textContent = 'RM --';
        if (netProfitDisplay) {
          netProfitDisplay.textContent = 'RM --';
          netProfitDisplay.className = 'ledger-val profit-neutral';
        }
        if (totalCostDrawer) totalCostDrawer.textContent = `RM ${window.CourtLedgerCalc.formatCurrency(calcResult.actualTotalCost)}`;
        if (totalRevenueDrawer) totalRevenueDrawer.textContent = 'RM --';
        if (netProfitDrawer) netProfitDrawer.textContent = 'RM --';
        saveUserInputs();
        return;
      }

      if (calcErrorNotice) calcErrorNotice.classList.add('hidden');

      const feeFormatted = window.CourtLedgerCalc.formatCurrency(calcResult.playerFee);
      if (heroPriceDesktop) {
        heroPriceDesktop.textContent = feeFormatted;
        heroPriceDesktop.classList.remove('error-state', 'hero-md', 'hero-lg');
        const charLen = feeFormatted.length;
        if (charLen > 8) {
          heroPriceDesktop.classList.add('hero-lg');
        } else if (charLen >= 7) {
          heroPriceDesktop.classList.add('hero-md');
        }
      }
      if (heroPriceDock) {
        heroPriceDock.textContent = `RM ${feeFormatted}`;
      }

      function formatLedgerAmount(val) {
        if (typeof val !== 'number' || isNaN(val)) return 'RM 0.00';
        if (val < -0.005) {
          return `\u2212RM ${Math.abs(val).toFixed(2)}`;
        }
        return `RM ${val.toFixed(2)}`;
      }

      const totalCostFormatted = `RM ${window.CourtLedgerCalc.formatCurrency(calcResult.actualTotalCost)}`;
      const totalRevFormatted = `RM ${window.CourtLedgerCalc.formatCurrency(calcResult.totalRevenue)}`;
      const netProfitFormatted = formatLedgerAmount(calcResult.netProfit);

      const netProfitLabel = document.getElementById('net-profit-label');
      const netProfitDrawerLabel = document.getElementById('net-profit-drawer-label');
      const profitText = calcResult.netProfit < -0.005 ? '净亏损' : '净利润';
      if (netProfitLabel) netProfitLabel.textContent = profitText;
      if (netProfitDrawerLabel) netProfitDrawerLabel.textContent = profitText;

      if (totalCostDisplay) totalCostDisplay.textContent = totalCostFormatted;
      if (totalRevenueDisplay) totalRevenueDisplay.textContent = totalRevFormatted;
      if (netProfitDisplay) {
        netProfitDisplay.textContent = netProfitFormatted;
        if (calcResult.netProfit > 0.005) {
          netProfitDisplay.className = 'ledger-val profit-pos';
        } else if (calcResult.netProfit < -0.005) {
          netProfitDisplay.className = 'ledger-val profit-neg';
        } else {
          netProfitDisplay.className = 'ledger-val profit-neutral';
        }
      }

      if (totalCostDrawer) totalCostDrawer.textContent = totalCostFormatted;
      if (totalRevenueDrawer) totalRevenueDrawer.textContent = totalRevFormatted;
      if (netProfitDrawer) {
        netProfitDrawer.textContent = netProfitFormatted;
        if (calcResult.netProfit > 0.005) {
          netProfitDrawer.className = 'ledger-val profit-pos';
        } else if (calcResult.netProfit < -0.005) {
          netProfitDrawer.className = 'ledger-val profit-neg';
        } else {
          netProfitDrawer.className = 'ledger-val profit-neutral';
        }
      }

      saveUserInputs();
    }

    // ── Copy Bill Handler ──
    function handleCopyBill(buttonElement) {
      if (!latestCalcData || !latestCalcData.calcResult.isValid) {
        if (window.showToast) window.showToast('计算参数有误，无法生成账单');
        return;
      }
      const d = latestCalcData;
      const res = d.calcResult;

      const now = new Date();
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${days[now.getDay()]}`;
      const hostPart = d.hostCount > 0 ? `（含 ${d.hostCount} Host 免单）` : '';
      const billText = [
        `🏸 羽毛球 · ${dateStr}`,
        `📍 ${d.venueName}`,
        `⏰ ${d.startStr} – ${d.endStr}（${d.duration}h · ${d.courtCount} 片）`,
        `👥 ${d.totalPlayers} 人${hostPart}`,
        `💸 每人 RM ${res.playerFee.toFixed(2)}`
      ].join('\n');

      const originalHTML = buttonElement ? buttonElement.innerHTML : '';

      function triggerFeedback() {
        if (buttonElement) {
          buttonElement.innerHTML = `<span>已复制 ✓</span>`;
          setTimeout(() => {
            buttonElement.innerHTML = originalHTML;
          }, 1500);
        }
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(billText).then(triggerFeedback).catch(() => {
          fallbackCopy(billText);
          triggerFeedback();
        });
      } else {
        fallbackCopy(billText);
        triggerFeedback();
      }
    }

    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    if (btnCopyReceipt) {
      btnCopyReceipt.addEventListener('click', () => handleCopyBill(btnCopyReceipt));
    }
    if (btnCopyDock) {
      btnCopyDock.addEventListener('click', () => handleCopyBill(btnCopyDock));
    }

    // Initialize Local Venue Modal
    initVenueModal(calculate);

    // Initial calculation run
    calculate();

    return {
      calculate
    };
  }

  // ── Venue Management Modal (CSV offline support) ──
  function initVenueModal(calculateCallback) {
    const modal = document.getElementById('court-manage-modal');
    const btnManage = document.getElementById('btn-manage-venues');
    const btnClose = document.getElementById('modal-close-btn');
    const listContainer = document.getElementById('modal-venues-list');
    const nameInput = document.getElementById('venue-name-input');
    const morningInput = document.getElementById('venue-morning-input');
    const eveningInput = document.getElementById('venue-evening-input');
    const editIdInput = document.getElementById('venue-edit-id');
    const formTitle = document.getElementById('venue-form-title');
    const btnSave = document.getElementById('btn-save-venue');
    const btnCancel = document.getElementById('btn-cancel-venue-edit');
    const btnResetCsv = document.getElementById('btn-reset-venues-csv');

    if (!modal) return;

    function resetForm() {
      if (editIdInput) editIdInput.value = '';
      if (nameInput) nameInput.value = '';
      if (morningInput) morningInput.value = '';
      if (eveningInput) eveningInput.value = '';
      if (formTitle) formTitle.textContent = '添加新球场';
      if (btnCancel) btnCancel.style.display = 'none';
      if (btnSave) btnSave.textContent = '保存球场';
    }

    function openModal() {
      resetForm();
      renderModalVenuesList();
      modal.classList.remove('hidden');
      document.body.classList.add('modal-active');
    }

    function closeModal() {
      modal.classList.add('hidden');
      document.body.classList.remove('modal-active');
      resetForm();
    }

    function renderModalVenuesList() {
      if (!listContainer || !window.CourtLedgerState) return;
      const venues = window.CourtLedgerState.getVenues() || [];
      listContainer.innerHTML = '';

      if (venues.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; color:var(--muted); font-size:var(--text-sub); padding:16px;">暂无球场数据</div>';
        return;
      }

      venues.forEach(v => {
        const item = document.createElement('div');
        item.className = 'venue-list-item';

        const rMorning = typeof v.rateMorning === 'number' ? v.rateMorning : parseFloat(v.rateMorning);
        const rEvening = typeof v.rateEvening === 'number' ? v.rateEvening : parseFloat(v.rateEvening);

        item.innerHTML = `
          <div>
            <div class="venue-item-name">${v.name}</div>
            <div class="venue-item-rates">早场 RM ${rMorning.toFixed(2)} · 晚场 RM ${rEvening.toFixed(2)}</div>
          </div>
          <div class="venue-item-actions">
            <button type="button" class="btn-venue-action btn-edit" data-id="${v.id}">编辑</button>
            <button type="button" class="btn-venue-action delete btn-delete" data-id="${v.id}">删除</button>
          </div>
        `;

        item.querySelector('.btn-edit').addEventListener('click', () => {
          editIdInput.value = v.id;
          nameInput.value = v.name;
          morningInput.value = rMorning.toFixed(2);
          eveningInput.value = rEvening.toFixed(2);
          formTitle.textContent = '编辑球场信息';
          btnSave.textContent = '更新球场';
          btnCancel.style.display = 'inline-flex';
        });

        item.querySelector('.btn-delete').addEventListener('click', () => {
          try {
            window.CourtLedgerState.deleteVenue(v.id);
            renderModalVenuesList();
            if (calculateCallback) calculateCallback();
            if (window.showToast) window.showToast(`球场 "${v.name}" 已删除`);
          } catch (err) {
            if (window.showToast) window.showToast(err.message);
          }
        });

        listContainer.appendChild(item);
      });
    }

    if (btnManage) btnManage.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });

    if (btnCancel) btnCancel.addEventListener('click', resetForm);

    if (btnResetCsv) {
      btnResetCsv.addEventListener('click', () => {
        if (confirm('确认恢复为默认 CSV 场地数据？所有自定义球场将被重置。')) {
          window.CourtLedgerState.resetVenuesToDefault();
          resetForm();
          renderModalVenuesList();
          if (calculateCallback) calculateCallback();
          if (window.showToast) window.showToast('已恢复为默认 CSV 场地数据');
        }
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const mVal = parseFloat(morningInput.value);
        const eVal = parseFloat(eveningInput.value);
        const editId = editIdInput.value;

        if (!name) {
          if (window.showToast) window.showToast('请输入球场名称');
          return;
        }
        if (isNaN(mVal) || mVal < 0 || isNaN(eVal) || eVal < 0) {
          if (window.showToast) window.showToast('请输入正确的早场和晚场单价');
          return;
        }

        try {
          if (editId) {
            window.CourtLedgerState.updateVenue(parseInt(editId), name, mVal, eVal);
          } else {
            window.CourtLedgerState.addVenue(name, mVal, eVal);
          }
          resetForm();
          renderModalVenuesList();
          if (calculateCallback) calculateCallback();
          if (window.showToast) window.showToast(editId ? '球场信息已更新' : '新球场已添加');
        } catch (err) {
          if (window.showToast) window.showToast('保存失败: ' + err.message);
        }
      });
    }

    window.openVenueManageModal = openModal;
  }

  window.CourtLedgerUI = {
    initCourtLedgerUI
  };
})();
