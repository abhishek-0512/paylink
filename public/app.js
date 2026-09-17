// State
let currentGeneratedLink = null;
let allPaymentLinks = [];
let selectedChannel = 'whatsapp'; // 'whatsapp' or 'email'

// DOM Elements
const form = document.getElementById('payment-form');
const customerNameInput = document.getElementById('customer-name');
const customerPhoneInput = document.getElementById('customer-phone');
const customerEmailInput = document.getElementById('customer-email');
const amountInput = document.getElementById('amount');
const currencyPrefix = document.getElementById('currency-prefix');
const btnGenerate = document.getElementById('btn-generate');
const btnSubmitText = document.getElementById('btn-submit-text');

// Group Containers
const groupPhone = document.getElementById('group-phone');
const groupEmail = document.getElementById('group-email');

// Channel Tabs
const tabChannelWa = document.getElementById('tab-channel-wa');
const tabChannelEmail = document.getElementById('tab-channel-email');

// Settings Panel Toggle
const btnToggleSettings = document.getElementById('btn-toggle-settings');
const settingsPanel = document.getElementById('settings-panel');

if (btnToggleSettings && settingsPanel) {
  btnToggleSettings.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
  });
}

// Channel Switching Logic
if (tabChannelWa && tabChannelEmail) {
  tabChannelWa.addEventListener('click', () => {
    selectedChannel = 'whatsapp';
    tabChannelWa.className = 'btn btn-whatsapp channel-tab active';
    tabChannelEmail.className = 'btn btn-outline channel-tab';
    if (groupPhone) groupPhone.style.display = 'block';
    if (groupEmail) groupEmail.style.display = 'none';
    if (btnSubmitText) btnSubmitText.textContent = '💬 Generate & Trigger WhatsApp Payment Link';
  });

  tabChannelEmail.addEventListener('click', () => {
    selectedChannel = 'email';
    tabChannelEmail.className = 'btn btn-whatsapp channel-tab active';
    tabChannelWa.className = 'btn btn-outline channel-tab';
    if (groupPhone) groupPhone.style.display = 'none';
    if (groupEmail) groupEmail.style.display = 'block';
    if (btnSubmitText) btnSubmitText.textContent = '✉️ Generate & Open Email Payment Link';
  });
}

// Banner Elements
const latestLinkBanner = document.getElementById('latest-link-banner');
const bannerInvoiceId = document.getElementById('banner-invoice-id');
const bannerPayUrl = document.getElementById('banner-pay-url');
const bannerBtnOpenWa = document.getElementById('banner-btn-open-wa');
const bannerBtnCopyUrl = document.getElementById('banner-btn-copy-url');
const bannerBtnOpenLink = document.getElementById('banner-btn-open-link');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// Clean Phone Helper
function cleanPhone(phone) {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

// Toast Feedback
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : '⚠️');
  toast.innerHTML = `
    <span>${icon}</span>
    <span>${message}</span>
  `;
  if (toastContainer) toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Copy to Clipboard
function copyToClipboard(text, label) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied ${label} to clipboard!`);
  }).catch(() => {
    showToast(`Failed to copy to clipboard`, 'info');
  });
}

// Fetch All Payment Links from Server
async function fetchPaymentLinks() {
  try {
    const res = await fetch('/api/payment-links');
    const result = await res.json();
    if (result.success) {
      allPaymentLinks = result.data;
      renderLinksTable();
    }
  } catch (err) {
    console.error('Error fetching payment links:', err);
  }
}

// Render Links Table
function renderLinksTable() {
  const tbody = document.getElementById('links-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (allPaymentLinks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No payment links generated yet.</td></tr>`;
    return;
  }

  allPaymentLinks.forEach(link => {
    const tr = document.createElement('tr');

    let statusBadge = `<span class="badge badge-pending">⏳ Pending</span>`;
    if (link.status === 'PAID') {
      statusBadge = `<span class="badge badge-paid">✓ Paid & Verified</span>`;
    }

    const payUrl = link.paymentUrl || `${window.location.origin}/pay/${link.id}`;
    const contactInfo = link.dispatchChannel === 'email' ? link.customerEmail : `+${link.customerPhone}`;
    const channelIcon = link.dispatchChannel === 'email' ? '✉️ Email' : '💬 WhatsApp';

    tr.innerHTML = `
      <td><strong>#${link.invoiceNumber}</strong></td>
      <td><strong>${link.customerName}</strong></td>
      <td><span style="font-size: 0.82rem; background: rgba(56, 189, 248, 0.12); color: #38bdf8; padding: 3px 8px; border-radius: 4px; font-weight: 500;">${channelIcon}: ${contactInfo}</span></td>
      <td><strong style="color: #10b981;">${link.currencySymbol}${Number(link.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
      <td>${statusBadge}</td>
      <td style="text-align: right;">
        <div style="display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap;">
          ${link.status === 'PAID' ? `
            <a href="${payUrl}" target="_blank" class="btn btn-outline btn-sm" style="color: #10b981;">
              🧾 View Receipt
            </a>
          ` : `
            <button class="btn btn-whatsapp btn-sm btn-table-trigger" data-id="${link.id}" title="Re-trigger channel link">
              🚀 Trigger
            </button>
            <button class="btn btn-outline btn-sm btn-table-copy" data-url="${payUrl}" title="Copy Link">
              📋
            </button>
            <a href="${payUrl}" target="_blank" class="btn btn-outline btn-sm" style="color: #38bdf8;" title="Open payment page">
              🔗
            </a>
          `}
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  document.querySelectorAll('.btn-table-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const link = allPaymentLinks.find(l => l.id === btn.dataset.id);
      if (link) triggerChannelForLink(link);
    });
  });

  document.querySelectorAll('.btn-table-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      copyToClipboard(btn.dataset.url, 'Payment Link');
    });
  });
}

// Trigger Channel Link (WhatsApp or Email)
function triggerChannelForLink(linkData) {
  if (!linkData) return;

  if (linkData.dispatchChannel === 'email' && linkData.emailMailtoUrl) {
    showToast(`Opening Email composer for ${linkData.customerEmail}...`);
    window.location.href = linkData.emailMailtoUrl;
  } else if (linkData.whatsappUrls && linkData.whatsappUrls.waMeUrl) {
    showToast(`Opening WhatsApp chat for +${linkData.customerPhone}...`);
    window.open(linkData.whatsappUrls.waMeUrl, '_blank');
  } else {
    const payUrl = linkData.paymentUrl || `${window.location.origin}/pay/${linkData.id}`;
    if (selectedChannel === 'email') {
      window.location.href = `mailto:${linkData.customerEmail}?subject=Payment Link&body=${encodeURIComponent(payUrl)}`;
    } else {
      window.open(`https://wa.me/${cleanPhone(linkData.customerPhone)}?text=${encodeURIComponent('Payment Link: ' + payUrl)}`, '_blank');
    }
  }
}

// Form Submit: Create Link & Instantly Trigger WhatsApp or Email
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Open blank popup synchronously for WhatsApp to prevent browser popup block
  let popupWindow = null;
  if (selectedChannel === 'whatsapp') {
    popupWindow = window.open('about:blank', '_blank');
  }

  btnGenerate.disabled = true;
  btnGenerate.innerHTML = `<span>⏳ Generating Payment Link...</span>`;

  try {
    const payload = {
      customerName: customerNameInput.value.trim() || 'Customer',
      customerPhone: cleanPhone(customerPhoneInput.value),
      customerEmail: customerEmailInput ? customerEmailInput.value.trim() : '',
      dispatchChannel: selectedChannel,
      amount: parseFloat(amountInput.value),
      currency: 'INR',
      description: 'Payment Request'
    };

    const res = await fetch('/api/payment-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success) {
      currentGeneratedLink = result.data;
      
      // Update Confirmation Banner
      if (latestLinkBanner) {
        latestLinkBanner.style.display = 'block';
        bannerInvoiceId.textContent = `Invoice #${currentGeneratedLink.invoiceNumber} (${currentGeneratedLink.currencySymbol}${currentGeneratedLink.amount})`;
        bannerPayUrl.textContent = currentGeneratedLink.paymentUrl;
        bannerPayUrl.href = currentGeneratedLink.paymentUrl;
        if (bannerBtnOpenLink) bannerBtnOpenLink.href = currentGeneratedLink.paymentUrl;
      }

      // INSTANT TRIGGER: Dispatch to WhatsApp or Email immediately!
      if (selectedChannel === 'whatsapp') {
        if (popupWindow && result.data.whatsappUrls && result.data.whatsappUrls.waMeUrl) {
          popupWindow.location.href = result.data.whatsappUrls.waMeUrl;
        } else if (result.data.whatsappUrls && result.data.whatsappUrls.waMeUrl) {
          window.open(result.data.whatsappUrls.waMeUrl, '_blank');
        }
        showToast(`💬 Payment link generated! Opening WhatsApp...`);
      } else if (selectedChannel === 'email') {
        if (popupWindow) popupWindow.close();
        if (result.data.emailMailtoUrl) {
          window.location.href = result.data.emailMailtoUrl;
        }
        showToast(`✉️ Payment link generated! Opening Email composer...`);
      }

      fetchPaymentLinks();
    } else {
      if (popupWindow) popupWindow.close();
      showToast(result.error || 'Failed to generate link', 'error');
    }
  } catch (err) {
    if (popupWindow) popupWindow.close();
    console.error('Error creating link:', err);
    showToast('Network error generating payment link', 'error');
  } finally {
    btnGenerate.disabled = false;
    btnGenerate.innerHTML = `<span id="btn-submit-text">${selectedChannel === 'email' ? '✉️ Generate & Open Email Payment Link' : '💬 Generate & Trigger WhatsApp Payment Link'}</span>`;
  }
});

// Banner Trigger Button
if (bannerBtnOpenWa) {
  bannerBtnOpenWa.addEventListener('click', () => {
    if (currentGeneratedLink) triggerChannelForLink(currentGeneratedLink);
  });
}

// Banner Copy Link Button
if (bannerBtnCopyUrl) {
  bannerBtnCopyUrl.addEventListener('click', () => {
    if (currentGeneratedLink) copyToClipboard(currentGeneratedLink.paymentUrl, 'Payment Link');
  });
}

// Razorpay Credentials Management
const razorpayKeyIdInput = document.getElementById('razorpay-key-id-input');
const razorpayKeySecretInput = document.getElementById('razorpay-key-secret-input');
const btnSaveRazorpayKeys = document.getElementById('btn-save-razorpay-keys');

if (btnSaveRazorpayKeys) {
  btnSaveRazorpayKeys.addEventListener('click', async () => {
    const keyId = razorpayKeyIdInput ? razorpayKeyIdInput.value.trim() : '';
    const keySecret = razorpayKeySecretInput ? razorpayKeySecretInput.value.trim() : '';

    try {
      const res = await fetch('/api/settings/razorpay-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, keySecret })
      });
      const result = await res.json();
      if (result.success) showToast('Razorpay keys saved successfully!');
    } catch (err) {
      showToast('Failed to save Razorpay keys', 'error');
    }
  });
}

// Meta Credentials Management
const metaPhoneIdInput = document.getElementById('meta-phone-id-input');
const metaTokenInput = document.getElementById('meta-token-input');
const btnSaveMetaKeys = document.getElementById('btn-save-meta-keys');

if (btnSaveMetaKeys) {
  btnSaveMetaKeys.addEventListener('click', async () => {
    const phoneNumberId = metaPhoneIdInput ? metaPhoneIdInput.value.trim() : '';
    const accessToken = metaTokenInput ? metaTokenInput.value.trim() : '';

    try {
      const res = await fetch('/api/settings/meta-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumberId, accessToken })
      });
      const result = await res.json();
      if (result.success) showToast('Meta API credentials saved successfully!');
    } catch (err) {
      showToast('Failed to save Meta API keys', 'error');
    }
  });
}

// Reset List
const btnResetDemo = document.getElementById('btn-reset-demo');
if (btnResetDemo) {
  btnResetDemo.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/reset-demo', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        allPaymentLinks = result.data;
        if (latestLinkBanner) latestLinkBanner.style.display = 'none';
        renderLinksTable();
        showToast('List reset successfully!');
      }
    } catch (err) {
      console.error('Error resetting list:', err);
    }
  });
}

// Refresh button
const refreshBtn = document.getElementById('btn-refresh-links');
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    fetchPaymentLinks();
    showToast('Payment links refreshed');
  });
}

// Initialize
fetchPaymentLinks();
setInterval(fetchPaymentLinks, 3000);



