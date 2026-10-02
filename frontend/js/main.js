/**
 * Court Ledger - Main Entry Point (100% Offline Calculator)
 * Bootstraps theme, bottom drawer, domain state (CSV), calculator UI, and local venue manager.
 */

// Global Toast Utility
let toastTimer = null;
window.showToast = function (message, duration = 2200) {
  if (!message) return;
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="toast-msg">${message}</span>`;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Drawer Modal (for players and shuttles selection)
  if (window.AppDrawer) {
    window.AppDrawer.initDrawer();
  }

  // 2. Initialize Theme & Settings
  if (window.AppTheme) {
    window.AppTheme.initTheme();
  }

  // 3. Initialize UI Event Controls & Calculation Engine
  let uiController = null;
  if (window.CourtLedgerUI) {
    uiController = window.CourtLedgerUI.initCourtLedgerUI();
  }

  // 4. Initialize Venue Database State (from CSV & LocalStorage)
  if (window.CourtLedgerState) {
    window.CourtLedgerState.initVenueState(() => {
      if (uiController && typeof uiController.calculate === 'function') {
        uiController.calculate();
      }
    });
  }

  // 5. Initialize Header Dropdown Menu
  bindSettingsMenu();

  console.log('🏸 Court Ledger Offline Calculator initialized successfully!');
});

function bindSettingsMenu() {
  const settingsBtn = document.getElementById('courtledger-settings-btn');
  const settingsDropdown = document.getElementById('courtledger-settings-dropdown');

  if (settingsBtn && settingsDropdown) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = settingsDropdown.classList.toggle('hidden');
      settingsBtn.classList.toggle('active', !isHidden);
    });

    settingsDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      settingsDropdown.classList.add('hidden');
      settingsBtn.classList.remove('active');
    });
  }

  // Menu item: Manage Venues
  const menuManageVenues = document.getElementById('menu-manage-venues');
  if (menuManageVenues) {
    menuManageVenues.addEventListener('click', () => {
      if (settingsDropdown) settingsDropdown.classList.add('hidden');
      if (settingsBtn) settingsBtn.classList.remove('active');
      if (typeof window.openVenueManageModal === 'function') {
        window.openVenueManageModal();
      }
    });
  }
}
