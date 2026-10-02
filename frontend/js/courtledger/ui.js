/**
 * Court Ledger - UI Binding & Controls Module (100% Pure Offline)
 * Handles input controls, segmented controls, steppers, drawer integration, copy bill text, and local venue modal.
 */

(function () {
  function triggerSpark(el, newVal) {
    if (el && el.textContent !== newVal) {
      el.textContent = newVal;
      el.classList.remove('price-spark-anim');
      void el.offsetWidth;
      el.classList.add('price-spark-anim');
    }
  }

  let latestCalcData = null;

  function initCourtLedgerUI() {
    const startTimeSelect = document.getElementById('start-time-select');
    const durationSlider = document.getElementById('duration-slider');
    const shuttlesUsedInput = document.getElementById('shuttles-used');
    const shuttlePriceInput = document.getElementById('shuttle-price');
    const totalPlayersInput = document.getElementById('total-players');
    const hostCountInput = document.getElementById('host-count');

    const addShuttlesMinusBtn = document.getElementById('add-shuttles-minus');
    const addShuttlesPlusBtn = document.getElementById('add-shuttles-plus');
    const addShuttlesDisplay = document.getElementById('add-shuttles-display');
    const additionalShuttlesInput = document.getElementById('additional-shuttles');

    const sumActualShuttles = document.getElementById('sum-actual-shuttles');
    const sumCoverShuttles = document.getElementById('sum-cover-shuttles');
    const sumProfitShuttles = document.getElementById('sum-profit-shuttles');
    const sumBilledShuttles = document.getElementById('sum-billed-shuttles');

    const durationTrigger = document.getElementById('duration-trigger');
    const durationDisplay = document.getElementById('duration-display');
    const durationSliderPanel = document.getElementById('duration-slider-panel');
    const sliderValBubble = document.getElementById('slider-val-bubble');
    const timeRangeDisplay = document.getElementById('time-range-display');

    const shuttlesPickerTrigger = document.getElementById('shuttles-picker');
    const shuttlesDisplayVal = document.getElementById('shuttles-display');

    const playersPickerTrigger = document.getElementById('players-picker');
    const playersDisplayVal = document.getElementById('players-display');

    const courtFeeInput = document.getElementById('court-fee');
    const courtFeeBreakdown = document.getElementById('court-fee-breakdown');
    const playerFeeDisplays = document.querySelectorAll('.player-fee-val');
    const totalCostDisplay = document.getElementById('total-cost-display');
    const totalRevenueDisplay = document.getElementById('total-revenue-display');
    const netProfitDisplay = document.getElementById('net-profit-display');

    const profitRow = document.getElementById('profit-row');
    const errorBanner = document.getElementById('error-banner');

    const courtRadios = document.querySelectorAll('input[name="court-count"]');
    const hostOptBtns = document.querySelectorAll('.host-opt-btn');
    const shuttleInfoTag = document.getElementById('shuttle-info-tag');
    const profitShuttlesTag = document.getElementById('profit-shuttles-tag');
    const btnCopyBill = document.getElementById('btn-copy-bill');

    function calculate() {
      if (!startTimeSelect || !durationSlider || !window.CourtLedgerCalc) return;

      const startHour = parseInt(startTimeSelect.value) || 0;
      const duration = parseInt(durationSlider.value) || 2;
      const shuttlesUsed = parseInt(shuttlesUsedInput.value) || 0;
      const shuttlePrice = parseFloat(shuttlePriceInput.value) || 0;
      const totalPlayers = parseInt(totalPlayersInput.value) || 0;
      const hostCount = parseInt(hostCountInput.value) || 0;
      const additionalShuttles = parseInt(additionalShuttlesInput ? additionalShuttlesInput.value : 0) || 0;

      const rates = window.CourtLedgerState ? window.CourtLedgerState.getActiveRates() : { venueName: '标准球场', rateMorning: 14.84, rateEvening: 29.68 };

      const endHour = startHour + duration;
      const startStr = window.CourtLedgerCalc.format12Hour(startHour);
      const endStr = window.CourtLedgerCalc.format12Hour(endHour);
      if (timeRangeDisplay) timeRangeDisplay.textContent = `${startStr} - ${endStr}`;
      if (durationDisplay) durationDisplay.textContent = `${duration} 小时`;
      if (sliderValBubble) sliderValBubble.textContent = `${duration} 小时`;

      let courtCount = 1;
      for (let i = 0; i < courtRadios.length; i++) {
        if (courtRadios[i].checked) {
          courtCount = parseInt(courtRadios[i].value) || 1;
          break;
        }
      }

      const courtFeeResult = window.CourtLedgerCalc.computeCourtFee(
        startHour, duration, rates.rateMorning, rates.rateEvening, courtCount
      );
      const courtFee = courtFeeResult.fee;

      if (courtFeeInput) courtFeeInput.value = window.CourtLedgerCalc.formatCurrency(courtFee);
      if (courtFeeBreakdown) {
        if (courtFeeResult.morningHours > 0 && courtFeeResult.eveningHours > 0) {
          courtFeeBreakdown.textContent = `早场 ${courtFeeResult.morningHours}h + 晚场 ${courtFeeResult.eveningHours}h × ${courtCount}片`;
        } else if (courtFeeResult.morningHours > 0) {
          courtFeeBreakdown.textContent = `早场 ${courtFeeResult.morningHours}h × ${courtCount}片`;
        } else if (courtFeeResult.eveningHours > 0) {
          courtFeeBreakdown.textContent = `晚场 ${courtFeeResult.eveningHours}h × ${courtCount}片`;
        } else {
          courtFeeBreakdown.textContent = '未选择场地';
        }
      }

      hostOptBtns.forEach(btn => {
        const hVal = parseInt(btn.getAttribute('data-host'));
        btn.classList.toggle('active', hostCount === hVal);
      });

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

      if (shuttleInfoTag) {
        if (calcResult.requiredHostShuttles > 0) {
          if (additionalShuttles >= calcResult.requiredHostShuttles) {
            shuttleInfoTag.textContent = '已涵盖 Host 成本';
            shuttleInfoTag.className = 'info-pill-tag success-tag';
          } else {
            const remain = calcResult.requiredHostShuttles - additionalShuttles;
            shuttleInfoTag.textContent = `建议加 ${remain} 个球覆盖 Host`;
            shuttleInfoTag.className = 'info-pill-tag warning-tag';
          }
        } else {
          shuttleInfoTag.textContent = '无需加球覆盖 Host';
          shuttleInfoTag.className = 'info-pill-tag success-tag';
        }
      }

      if (profitShuttlesTag) {
        const pVal = calcResult.profitShuttles;
        profitShuttlesTag.textContent = `额外盈利: ${pVal > 0 ? '+' : ''}${pVal} 个`;
      }

      if (sumActualShuttles) sumActualShuttles.textContent = `${calcResult.shuttlesUsed} 个`;
      if (sumCoverShuttles) {
        const coverVal = calcResult.appliedCoverShuttles;
        sumCoverShuttles.textContent = `${coverVal > 0 ? '+' : ''}${coverVal} 个`;
      }
      if (sumProfitShuttles) {
        const pVal = calcResult.profitShuttles;
        sumProfitShuttles.textContent = `${pVal > 0 ? '+' : ''}${pVal} 个`;
      }
      if (sumBilledShuttles) sumBilledShuttles.textContent = `${calcResult.billedShuttles} 个`;

      if (!calcResult.isValid) {
        if (errorBanner) errorBanner.classList.remove('hidden');
        playerFeeDisplays.forEach(el => {
          triggerSpark(el, '--');
          el.className = 'ticker-price player-fee-val error-state';
        });

        triggerSpark(totalCostDisplay, window.CourtLedgerCalc.formatCurrency(calcResult.actualTotalCost));
        triggerSpark(totalRevenueDisplay, '--');
        triggerSpark(netProfitDisplay, '--');

        if (profitRow) profitRow.className = 'summary-row profit-highlight';
        return;
      }

      if (errorBanner) errorBanner.classList.add('hidden');

      playerFeeDisplays.forEach(el => {
        triggerSpark(el, window.CourtLedgerCalc.formatCurrency(calcResult.playerFee));
        el.className = 'ticker-price player-fee-val has-value';
      });

      triggerSpark(totalCostDisplay, window.CourtLedgerCalc.formatCurrency(calcResult.actualTotalCost));
      triggerSpark(totalRevenueDisplay, window.CourtLedgerCalc.formatCurrency(calcResult.totalRevenue));
      triggerSpark(netProfitDisplay, window.CourtLedgerCalc.formatCurrency(calcResult.netProfit));

      if (profitRow) {
        if (calcResult.netProfit > 0.005) {
          profitRow.className = 'summary-row profit-highlight profit-state';
        } else if (calcResult.netProfit < -0.005) {
          profitRow.className = 'summary-row profit-highlight loss-state';
        } else {
          profitRow.className = 'summary-row profit-highlight';
        }
      }
    }

    // Bind Copy Bill Button
    if (btnCopyBill) {
      btnCopyBill.addEventListener('click', () => {
        if (!latestCalcData || !latestCalcData.calcResult.isValid) {
          if (window.showToast) window.showToast('当前参数有误，无法生成账单');
          return;
        }
        const d = latestCalcData;
        const res = d.calcResult;
        const billText = [
          `Court Ledger — 羽毛球活动费用明细`,
          `────────────────────────────────────`,
          `球场名称：${d.venueName}`,
          `活动时间：${d.startStr} - ${d.endStr} (${d.duration}小时) · ${d.courtCount}片场地`,
          `参与人数：${d.totalPlayers}人 (其中 ${d.hostCount} 位Host)`,
          `用球数量：${d.shuttlesUsed}个${d.additionalShuttles > 0 ? ` (附加 +${d.additionalShuttles})` : ''}`,
          `场地总费：RM ${res.actualTotalCost ? res.actualTotalCost.toFixed(2) : '0.00'}`,
          `每人应付：RM ${res.playerFee.toFixed(2)}`,
          `────────────────────────────────────`,
          `请配合完成转账，谢谢合作！`
        ].join('\n');

        navigator.clipboard.writeText(billText).then(() => {
          if (window.showToast) window.showToast('账单明细已复制到剪贴板');
        }).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = billText;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          if (window.showToast) window.showToast('账单明细已复制到剪贴板');
        });
      });
    }

    // Duration triggers
    function toggleDurationPanel() {
      const isExpanded = durationSliderPanel.classList.toggle('expanded');
      durationSliderPanel.classList.toggle('collapsed', !isExpanded);
      durationTrigger.classList.toggle('active', isExpanded);
      durationTrigger.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    }

    if (durationTrigger && durationSliderPanel) {
      durationTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDurationPanel();
      });

      durationTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleDurationPanel();
        }
      });

      durationSliderPanel.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      document.addEventListener('click', () => {
        durationTrigger.classList.remove('active');
        durationTrigger.setAttribute('aria-expanded', 'false');
        durationSliderPanel.classList.remove('expanded');
        durationSliderPanel.classList.add('collapsed');
      });
    }

    if (durationSlider) {
      durationSlider.addEventListener('input', () => {
        calculate();
      });
    }

    if (startTimeSelect) {
      startTimeSelect.addEventListener('change', () => {
        calculate();
      });
    }

    if (shuttlePriceInput) {
      shuttlePriceInput.addEventListener('input', () => {
        calculate();
      });
    }

    // Drawer Pickers
    function openPlayersDrawer() {
      const current = parseInt(totalPlayersInput.value) || 6;
      window.AppDrawer.openDrawer("选择参与人数 (含Host)", 1, 40, current, totalPlayersInput, playersDisplayVal, calculate);
    }

    function openShuttlesDrawer() {
      const current = parseInt(shuttlesUsedInput.value) || 3;
      window.AppDrawer.openDrawer("选择用球数量 (个)", 1, 24, current, shuttlesUsedInput, shuttlesDisplayVal, calculate);
    }

    if (playersPickerTrigger && window.AppDrawer) {
      playersPickerTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        openPlayersDrawer();
      });
      playersPickerTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPlayersDrawer();
        }
      });
    }

    if (shuttlesPickerTrigger && window.AppDrawer) {
      shuttlesPickerTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        openShuttlesDrawer();
      });
      shuttlesPickerTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openShuttlesDrawer();
        }
      });
    }

    // Host selector
    hostOptBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const hostVal = parseInt(btn.getAttribute('data-host'));
        if (!isNaN(hostVal)) {
          hostCountInput.value = hostVal;
          calculate();
        }
      });
    });

    // Court Segmented radio group
    courtRadios.forEach(r => {
      r.addEventListener('change', () => {
        calculate();
      });
    });

    // Additional shuttles stepper
    if (addShuttlesMinusBtn) {
      addShuttlesMinusBtn.addEventListener('click', () => {
        let current = parseInt(additionalShuttlesInput.value) || 0;
        if (current > 0) {
          current--;
          additionalShuttlesInput.value = current;
          if (addShuttlesDisplay) addShuttlesDisplay.textContent = `${current} 个`;
          calculate();
        }
      });
    }

    if (addShuttlesPlusBtn) {
      addShuttlesPlusBtn.addEventListener('click', () => {
        let current = parseInt(additionalShuttlesInput.value) || 0;
        if (current < 20) {
          current++;
          additionalShuttlesInput.value = current;
          if (addShuttlesDisplay) addShuttlesDisplay.textContent = `${current} 个`;
          calculate();
        }
      });
    }

    // Initialize Local Venue Modal
    initVenueModal(calculate);

    // Initial calculation
    calculate();

    return {
      calculate
    };
  }

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
      if (btnCancel) btnCancel.classList.add('hidden');
      if (btnSave) btnSave.textContent = '保存球场';
    }

    function openModal() {
      resetForm();
      renderModalVenuesList();
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');
    }

    function closeModal() {
      modal.classList.add('hidden');
      document.body.classList.remove('modal-open');
      resetForm();
    }

    function renderModalVenuesList() {
      if (!listContainer || !window.CourtLedgerState) return;
      const venues = window.CourtLedgerState.getVenues() || [];
      listContainer.innerHTML = '';

      if (venues.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:var(--text-sm); padding:12px;">暂无球场数据</div>';
        return;
      }

      venues.forEach(v => {
        const item = document.createElement('div');
        item.className = 'venue-item-card';

        const rMorning = typeof v.rateMorning === 'number' ? v.rateMorning : parseFloat(v.rateMorning);
        const rEvening = typeof v.rateEvening === 'number' ? v.rateEvening : parseFloat(v.rateEvening);

        item.innerHTML = `
          <div class="venue-item-info">
            <span class="venue-item-name">${v.name}</span>
            <span class="venue-item-rates">早场 RM ${rMorning.toFixed(2)} / 晚场 RM ${rEvening.toFixed(2)}</span>
          </div>
          <div class="venue-item-actions">
            <button type="button" class="btn-icon-sm btn-edit" data-id="${v.id}">编辑</button>
            <button type="button" class="btn-icon-sm btn-danger btn-delete" data-id="${v.id}">删除</button>
          </div>
        `;

        item.querySelector('.btn-edit').addEventListener('click', () => {
          editIdInput.value = v.id;
          nameInput.value = v.name;
          morningInput.value = rMorning.toFixed(2);
          eveningInput.value = rEvening.toFixed(2);
          formTitle.textContent = '编辑球场信息';
          btnSave.textContent = '更新球场';
          btnCancel.classList.remove('hidden');
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
