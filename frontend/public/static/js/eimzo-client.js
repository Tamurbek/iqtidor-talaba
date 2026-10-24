/**
 * E-IMZO Client Integration for Iqtidorli Talabalar Portal
 * Zero-PII compliant: No PINFL/JSHSHIR stored in database.
 * Dual-Bridge: Direct browser WSS with fallback to local server bridge.
 */

let eimzoCertificates = [];
let eimzoActiveKey = null;

// 1. Modal ochish va kalitlarni yuklash
async function openEimzoModal() {
  const modal = document.getElementById('eimzoModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const pwd = document.getElementById('eimzoPasswordInput');
  if (pwd) pwd.value = '';
  hideEimzoAlert();

  await loadEimzoKeys();
}

function closeEimzoModal() {
  const modal = doc
  ument.getElementById('eimzoModal');
  if (modal) modal.style.display = 'none';
}

// 2. E-IMZO kalitlarini olish
async function loadEimzoKeys() {
  const loading = document.getElementById('eimzoLoading');
  const keySection = document.getElementById('eimzoKeySection');
  const select = document.getElementById('eimzoKeySelect');
  const submitBtn = document.getElementById('btnEimzoSubmit');

  hideEimzoAlert();
  if (loading) loading.style.display = 'block';
  if (keySection) keySection.style.display = 'none';
  if (submitBtn) submitBtn.disabled = true;

  try {
    const certs = await fetchCertificatesFromAgent();
    eimzoCertificates = certs || [];

    if (loading) loading.style.display = 'none';
    if (keySection) keySection.style.display = 'block';

    if (eimzoCertificates.length === 0) {
      showEimzoAlert("Kompyuteringizda yoki USB fleshkada faol E-IMZO kalitlari topilmadi.", "warning");
      if (select) select.innerHTML = '<option value="">Kalitlar topilmadi</option>';
      return;
    }

    // Selectni to'ldirish
    if (select) {
      select.innerHTML = '<option value="">-- E-IMZO kalitingizni tanlang --</option>' +
        eimzoCertificates.map((c, i) => {
          const owner = c.CN || c.name || "Noma'lum egasi";
          const exp = c.validTo ? ` [Muddati: ${c.validTo.split(' ')[0]}]` : '';
          return `<option value="${i}">${escapeHtml(owner)}${escapeHtml(exp)}</option>`;
        }).join('');

      select.onchange = function () {
        const idx = select.value;
        if (idx !== "") {
          showKeyDetails(eimzoCertificates[parseInt(idx)]);
          if (submitBtn) submitBtn.disabled = false;
        } else {
          hideKeyDetails();
          if (submitBtn) submitBtn.disabled = true;
        }
      };

      // Agar 1 ta kalit bo'lsa, avtomatik tanlash
      if (eimzoCertificates.length === 1) {
        select.value = "0";
        showKeyDetails(eimzoCertificates[0]);
        if (submitBtn) submitBtn.disabled = false;
      }
    }

  } catch (err) {
    if (loading) loading.style.display = 'none';
    if (keySection) keySection.style.display = 'block';

    showEimzoAlert(
      `<strong>E-IMZO agenti bilan aloqa o'rnatilmadi.</strong><br>
      Kompyuteringizda <em>E-IMZO dasturi</em> ishga tushirilganligiga ishonch hosil qiling yoki rasmiy 
      <a href="https://e-imzo.uz" target="_blank" style="color: #0284c7; text-decoration: underline; font-weight: 600;">e-imzo.uz</a> 
      saytidan E-IMZO agentini yuklab oling.<br><br>
      <em>Shuningdek, odatiy HEMIS ID va parolingiz orqali ham to'g'ridan-to'g'ri kirishingiz mumkin.</em>`,
      "error"
    );
    if (select) select.innerHTML = '<option value="">E-IMZO agenti topilmadi</option>';
  }
}

// 3. Kalitlarni olish (Avval server ko'prigi, so'ng to'g'ridan-to'g'ri WSS)
async function fetchCertificatesFromAgent() {
  // 1-usul: Server ko'prigi orqali (Brauzerdagi CORS va self-signed SSL xatolarisiz to'g'ridan-to'g'ri o'qiydi)
  try {
    const res = await fetch('/api/v1/auth/e-imzo/keys');
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 1 && data.certificates && data.certificates.length > 0) {
        return data.certificates;
      }
    }
  } catch (e) {
    // Server ko'prigi ishlamasa, keyingi usulga o'tish
  }

  // 2-usul: Brauzer WebSocket orqali (har doim wss://)
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { if (ws) ws.close(); } catch (e) { }
        reject(new Error("E-IMZO moduli javob bermadi"));
      }
    }, 3000);

    let ws;
    try {
      ws = new WebSocket('wss://127.0.0.1:64443/ajax/');
    } catch (e) {
      clearTimeout(timer);
      settled = true;
      reject(e);
      return;
    }

    ws.onopen = function () {
      ws.send(JSON.stringify({ plugin: "pfx", name: "list_all_certificates" }));
    };

    ws.onmessage = function (event) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        const data = JSON.parse(event.data);
        const rawCerts = data.certificates || [];
        const parsed = rawCerts.map(c => parseClientCertAlias(c));
        ws.close();
        resolve(parsed);
      } catch (e) {
        ws.close();
        reject(e);
      }
    };

    ws.onerror = function () {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error("E-IMZO agentiga ulanib bo'lmadi"));
      }
    };
  });
}

function parseClientCertAlias(c) {
  if (c.CN && c.serialNumber) return c;
  const alias = c.alias || '';
  const parts = alias.split(',');
  const map = {};
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx !== -1) {
      const k = part.substring(0, idx).trim().toLowerCase();
      const v = part.substring(idx + 1).trim();
      map[k] = v;
    }
  }
  return {
    ...c,
    CN: (map['cn'] || c.name || "Noma'lum egasi").toUpperCase(),
    O: map['o'] || "Jismoniy shaxs",
    serialNumber: map['serialnumber'] || c.serialNumber || '',
    validFrom: map['validfrom'] || c.validFrom || '',
    validTo: map['validto'] || c.validTo || ''
  };
}

// 4. Tanlangan kalit tafsilotlarini ko'rsatish
function showKeyDetails(cert) {
  const box = document.getElementById('eimzoKeyDetails');
  if (!box || !cert) return;

  const ownerEl = document.getElementById('eimzoDetailOwner');
  const orgEl = document.getElementById('eimzoDetailOrg');
  const expEl = document.getElementById('eimzoDetailExpiry');

  if (ownerEl) ownerEl.innerText = cert.CN || cert.name || "-";
  if (orgEl) orgEl.innerText = cert.O || "Jismoniy shaxs";
  if (expEl) expEl.innerText = cert.validTo || "-";

  box.style.display = 'block';
  eimzoActiveKey = cert;
}

function hideKeyDetails() {
  const box = document.getElementById('eimzoKeyDetails');
  if (box) box.style.display = 'none';
  eimzoActiveKey = null;
}

// 5. Imzolash va Kirish
async function signAndLoginWithEimzo() {
  const select = document.getElementById('eimzoKeySelect');
  const hemisInput = document.getElementById('eimzoHemisIdInput');
  const submitBtn = document.getElementById('btnEimzoSubmit');

  hideEimzoAlert();

  if (!select || select.value === "") {
    showEimzoAlert("Iltimos, avval E-IMZO kalitingizni tanlang.", "warning");
    return;
  }

  const cert = eimzoCertificates[parseInt(select.value)];
  if (!cert) {
    showEimzoAlert("Tanlangan kalit ma'lumotlari topilmadi.", "error");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Imzolanmoqda (E-IMZO oynasini kuting)...";
  }

  try {
    // 1. Serverdan tasodifiy bir martalik challenge olish
    const chRes = await fetch('/api/v1/auth/e-imzo/challenge');
    const chData = await chRes.json();
    if (!chRes.ok || !chData.challenge) {
      throw new Error("Xavfsizlik tokenini olishda xatolik yuz berdi");
    }
    const challenge = chData.challenge;
    const hemisId = hemisInput ? hemisInput.value.trim() : "";

    // 2. E-IMZO moduli orqali imzolash (PFX parol oynasi chiqadi) va tizimga kirish
    const verifyRes = await fetch('/api/v1/auth/e-imzo/sign-and-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge: challenge,
        cert: cert,
        hemis_id: hemisId || null
      })
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok) {
      let errMsg = "E-IMZO orqali kirish tasdiqlanmadi.";
      if (typeof verifyData.detail === 'string') {
        errMsg = verifyData.detail;
      } else if (Array.isArray(verifyData.detail)) {
        errMsg = verifyData.detail.map(d => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join('<br>');
      } else if (verifyData.detail && typeof verifyData.detail === 'object') {
        errMsg = JSON.stringify(verifyData.detail);
      } else if (verifyData.message) {
        errMsg = verifyData.message;
      }
      throw new Error(errMsg);
    }


    showEimzoAlert(`Xush kelibsiz, ${verifyData.user.full_name}! Yo'naltirilmoqda...`, "success");

    localStorage.setItem('user', JSON.stringify(verifyData.user));
    localStorage.setItem('token', verifyData.access_token);
    localStorage.setItem('portal_last_activity', Date.now().toString());
    sessionStorage.setItem('just_logged_in', 'true');

    setTimeout(() => {
      const redirectUrl = verifyData.user.role === 'admin' ? '/admin' : '/dashboard';
      window.location.href = redirectUrl;
    }, 800);

  } catch (err) {
    showEimzoAlert(err.message, "error");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "Kirish";
    }
  }
}

// Xabarnoma yordamchilari
function showEimzoAlert(msg, type) {
  const al = document.getElementById('eimzoAlert');
  if (!al) return;
  al.innerHTML = msg;
  al.className = `eimzo-alert alert-${type}`;
  al.style.display = 'block';
}

function hideEimzoAlert() {
  const al = document.getElementById('eimzoAlert');
  if (al) al.style.display = 'none';
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

document.addEventListener('DOMContentLoaded', () => {
  // E-IMZO modal foniga bosilganda yopish
  const eimzoModal = document.getElementById('eimzoModal');
  if (eimzoModal) {
    eimzoModal.addEventListener('click', (e) => {
      if (e.target === eimzoModal) {
        closeEimzoModal();
      }
    });
  }
});


