const API = {
  candidacies: '/api/my-candidacies/',
  elections: '/api/elections/',
  updateCandidacy: (id) => `/api/candidacies/${id}/update/`
};

let currentCandidate = null;
let candidaciesCache = [];
let electionsCache = [];

function getToken() {
  return sessionStorage.getItem('votingToken');
}

function getCurrentUser() {
  const raw = sessionStorage.getItem('votingUser');
  return raw ? JSON.parse(raw) : null;
}

function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}` };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let data = {};
  try {
    data = await response.json();
  } catch (err) {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || data.detail || 'Request failed');
  }
  return data;
}

function unwrapResults(data) {
  if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
}

async function fetchAllPages(url, headers = {}) {
  let allResults = [];
  let nextUrl = url;
  while (nextUrl) {
    const data = await fetchJson(nextUrl, { headers });
    if (data && typeof data === 'object' && Array.isArray(data.results)) {
      allResults = allResults.concat(data.results);
      nextUrl = data.next;
    } else if (Array.isArray(data)) {
      allResults = allResults.concat(data);
      nextUrl = null;
    } else {
      nextUrl = null;
    }
  }
  return allResults;
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function ensureCandidateSession() {
  currentCandidate = getCurrentUser();
  if (!currentCandidate) {
    window.location.href = '/';
    return false;
  }
  if (currentCandidate.role !== 'candidate') {
    alert('Access denied. Candidates only.');
    window.location.href = '/';
    return false;
  }

  document.getElementById('candidateName').innerText = currentCandidate.full_name || 'Candidate';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greetingMessage').innerText = `${greeting},`;

  const avatarImg = document.getElementById('avatarImg');
  const avatarName = encodeURIComponent(currentCandidate.full_name || 'Candidate');
  avatarImg.src = currentCandidate.profile_picture || `https://ui-avatars.com/api/?background=7c3aed&color=fff&rounded=true&bold=true&size=48&name=${avatarName}`;
  return true;
}

async function refreshData() {
  const [candidacies, elections] = await Promise.all([
    fetchJson(API.candidacies, { headers: authHeaders() }).then(d => Array.isArray(d) ? d : unwrapResults(d)),
    fetchAllPages(API.elections)
  ]);
  candidaciesCache = candidacies;
  electionsCache = elections;
}

function getElectionTitle(electionId) {
  const e = electionsCache.find(el => el.id === electionId);
  return e ? e.title : 'Unknown Election';
}

function getElectionStatus(electionId) {
  const e = electionsCache.find(el => el.id === electionId);
  return e ? e.status : 'unknown';
}

/* ── Dashboard ── */
function renderDashboard() {
  const totalCandidacies = candidaciesCache.length;
  const approved = candidaciesCache.filter(c => c.status === 'approved').length;
  const pending = candidaciesCache.filter(c => c.status === 'pending').length;
  const activeElections = candidaciesCache.filter(c => {
    const status = getElectionStatus(c.election);
    return status === 'active';
  }).length;

  document.getElementById('dynamicContent').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h3><i class="fas fa-id-badge"></i> My Candidacies</h3>
        <div class="stat-number">${totalCandidacies}</div>
      </div>
      <div class="stat-card">
        <h3><i class="fas fa-check-circle"></i> Approved</h3>
        <div class="stat-number">${approved}</div>
      </div>
      <div class="stat-card">
        <h3><i class="fas fa-clock"></i> Pending</h3>
        <div class="stat-number">${pending}</div>
      </div>
      <div class="stat-card">
        <h3><i class="fas fa-bolt"></i> Active Elections</h3>
        <div class="stat-number">${activeElections}</div>
      </div>
    </div>

    <div class="info-banner">
      <h3><i class="fas fa-lightbulb"></i> Candidate Tips</h3>
      <p>✓ Keep your manifesto updated to connect with voters.<br>
         ✓ Upload a clear party symbol for better recognition.<br>
         ✓ Your candidacy details are visible to all voters during elections.</p>
    </div>

    ${candidaciesCache.length > 0 ? `
      <div class="section">
        <div class="section-header"><h2>Your Candidacies</h2></div>
        <div class="candidacy-grid">
          ${candidaciesCache.map(c => renderCandidacyCard(c)).join('')}
        </div>
      </div>
    ` : `
      <div class="section">
        <div class="empty-state">
          <i class="fas fa-user-tie"></i>
          <h3>No Candidacies Yet</h3>
          <p>You haven't been registered as a candidate in any election. Contact the admin to register.</p>
        </div>
      </div>
    `}
  `;

  attachEditHandlers();
}

function renderCandidacyCard(c) {
  const electionTitle = getElectionTitle(c.election);
  const electionStatus = getElectionStatus(c.election);
  const symbolSrc = c.symbol_url || c.symbol;
  const manifestoPreview = c.manifesto ? c.manifesto.substring(0, 200) : '';

  return `
    <div class="candidacy-card">
      <div class="candidacy-header">
        ${symbolSrc ? 
          `<img src="${symbolSrc}" class="candidacy-symbol" alt="Party Symbol">` : 
          `<div class="candidacy-symbol-placeholder"><i class="fas fa-flag"></i></div>`
        }
        <div class="candidacy-info">
          <h3>${c.name}</h3>
          <div class="candidacy-party">${c.party || 'Independent'}</div>
        </div>
      </div>
      <div>
        <span class="candidacy-election"><i class="fas fa-poll"></i> ${electionTitle}</span>
        <span class="candidacy-status ${c.status}">${c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span>
      </div>
      ${c.description ? `<div class="candidacy-description">${c.description}</div>` : ''}
      ${manifestoPreview ? `
        <div class="candidacy-manifesto-preview">
          <h4><i class="fas fa-scroll"></i> Manifesto</h4>
          <p>${manifestoPreview}${c.manifesto.length > 200 ? '...' : ''}</p>
        </div>
      ` : `
        <div class="candidacy-manifesto-preview" style="border-left-color: #e2e8f0;">
          <h4 style="color: #94a3b8;"><i class="fas fa-scroll"></i> Manifesto</h4>
          <p style="color: #94a3b8; font-style: italic;">No manifesto added yet. Click Edit to add one.</p>
        </div>
      `}
      <div class="candidacy-actions">
        <button class="btn-edit edit-candidacy-btn" data-id="${c.id}">
          <i class="fas fa-edit"></i> Edit Details
        </button>
      </div>
    </div>
  `;
}

function attachEditHandlers() {
  document.querySelectorAll('.edit-candidacy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const candidacy = candidaciesCache.find(c => c.id === id);
      if (candidacy) openEditModal(candidacy);
    });
  });
}

/* ── Candidacies Section ── */
function renderCandidacies() {
  if (candidaciesCache.length === 0) {
    document.getElementById('dynamicContent').innerHTML = `
      <div class="section">
        <div class="section-header"><h2>My Candidacies</h2></div>
        <div class="empty-state">
          <i class="fas fa-user-tie"></i>
          <h3>No Candidacies</h3>
          <p>You haven't been registered as a candidate in any election yet.</p>
        </div>
      </div>
    `;
    return;
  }

  document.getElementById('dynamicContent').innerHTML = `
    <div class="section">
      <div class="section-header"><h2>My Candidacies</h2></div>
      <div class="candidacy-grid">
        ${candidaciesCache.map(c => renderCandidacyCard(c)).join('')}
      </div>
    </div>
  `;

  attachEditHandlers();
}

/* ── Edit Modal ── */
function openEditModal(candidacy) {
  const modal = document.getElementById('editModal');
  const body = document.getElementById('editModalBody');
  const symbolSrc = candidacy.symbol_url || candidacy.symbol;

  body.innerHTML = `
    <div class="form-group" style="margin-top: 20px;">
      <label for="editParty">Party Name</label>
      <input type="text" id="editParty" value="${candidacy.party || ''}" placeholder="Enter your party name">
    </div>
    <div class="form-group">
      <label for="editDescription">Short Description / Tagline</label>
      <textarea id="editDescription" placeholder="A brief description of yourself and your campaign">${candidacy.description || ''}</textarea>
    </div>
    <div class="form-group">
      <label for="editManifesto">Party Manifesto</label>
      <textarea id="editManifesto" class="manifesto-textarea" placeholder="Write your detailed party manifesto here...">${candidacy.manifesto || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Party Symbol</label>
      <div class="file-upload-area" id="symbolUploadArea">
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Click or drag & drop to upload party symbol</p>
        <p style="font-size: 0.75rem; margin-top: 4px; color: #94a3b8;">PNG, JPG, SVG • Max 2MB</p>
        <div class="file-name" id="fileName"></div>
        <input type="file" id="symbolFileInput" accept="image/*">
      </div>
      ${symbolSrc ? `
        <div class="current-symbol-preview">
          <img src="${symbolSrc}" alt="Current symbol">
          <span>Current party symbol</span>
        </div>
      ` : ''}
    </div>
  `;

  modal.style.display = 'flex';
  modal.dataset.candidacyId = candidacy.id;

  // File upload interactions
  const uploadArea = document.getElementById('symbolUploadArea');
  const fileInput = document.getElementById('symbolFileInput');
  const fileNameEl = document.getElementById('fileName');

  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      fileNameEl.textContent = e.dataTransfer.files[0].name;
    }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      fileNameEl.textContent = fileInput.files[0].name;
    }
  });
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

async function saveEditModal() {
  const modal = document.getElementById('editModal');
  const candidacyId = modal.dataset.candidacyId;
  const saveBtn = document.getElementById('editModalSave');

  const party = document.getElementById('editParty').value.trim();
  const description = document.getElementById('editDescription').value.trim();
  const manifesto = document.getElementById('editManifesto').value.trim();
  const fileInput = document.getElementById('symbolFileInput');

  // Validate file size
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    if (file.size > 2 * 1024 * 1024) {
      showToast('Symbol image must be under 2MB', 'error');
      return;
    }
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span> Saving...';

  const formData = new FormData();
  formData.append('party', party);
  formData.append('description', description);
  formData.append('manifesto', manifesto);
  if (fileInput.files.length > 0) {
    formData.append('symbol', fileInput.files[0]);
  }

  try {
    await fetch(API.updateCandidacy(candidacyId), {
      method: 'PATCH',
      headers: authHeaders(),
      body: formData
    }).then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Update failed');
      }
      return res.json();
    });

    showToast('Candidacy updated successfully!', 'success');
    closeEditModal();
    await refreshData();
    
    // Re-render current section
    const activeNav = document.querySelector('.nav-item.active');
    const section = activeNav ? activeNav.dataset.section : 'dashboard';
    loadSection(section);
  } catch (error) {
    showToast('Failed to save: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
  }
}

/* ── Navigation ── */
let currentSection = 'dashboard';

function loadSection(section) {
  currentSection = section;
  document.querySelectorAll('.nav-item').forEach(item =>
    item.classList.toggle('active', item.dataset.section === section)
  );
  if (section === 'dashboard') renderDashboard();
  else if (section === 'candidacies') renderCandidacies();
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  if (!ensureCandidateSession()) return;

  try {
    await refreshData();
    loadSection('dashboard');
  } catch (error) {
    document.getElementById('dynamicContent').innerHTML = `
      <div class="section">
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Failed to Load</h3>
          <p>${error.message}</p>
        </div>
      </div>
    `;
  }

  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      loadSection(item.dataset.section);
      if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    });
  });

  // Mobile menu toggle
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && window.innerWidth <= 768) {
      sidebar.classList.remove('open');
    }
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('votingUser');
    sessionStorage.removeItem('votingToken');
    window.location.href = '/';
  });

  // Modal handlers
  document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
  document.getElementById('editModalCancel').addEventListener('click', closeEditModal);
  document.getElementById('editModalSave').addEventListener('click', saveEditModal);
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('editModal')) closeEditModal();
  });
});
