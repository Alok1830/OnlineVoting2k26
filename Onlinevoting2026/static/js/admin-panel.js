const API = {
  elections: '/api/elections/',
  candidates: '/api/candidates/',
  voters: '/api/voters/',
  votes: '/api/votes/'
};

let electionsCache = [];
let candidatesCache = [];
let votersCache = [];
let votesCache = [];

function getCurrentUser() {
  const raw = sessionStorage.getItem('votingUser');
  return raw ? JSON.parse(raw) : null;
}

async function fetchJson(url, options = {}) {
  // Automatically inject auth token for admin requests
  const token = sessionStorage.getItem('votingToken');
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
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
  // Handle DRF paginated responses: {count, next, previous, results}
  if (data && typeof data === 'object' && Array.isArray(data.results)) {
    return data.results;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

async function fetchAllPages(url) {
  let allResults = [];
  let nextUrl = url;
  while (nextUrl) {
    const data = await fetchJson(nextUrl);
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

async function refreshAllData() {
  [electionsCache, candidatesCache, votersCache, votesCache] = await Promise.all([
    fetchAllPages(API.elections),
    fetchAllPages(API.candidates),
    fetchAllPages(API.voters),
    fetchAllPages(API.votes)
  ]);
}

function ensureAdminSession() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = '/';
    return false;
  }
  if (user.role !== 'admin') {
    alert('Access denied. Admins only.');
    window.location.href = '/';
    return false;
  }

  document.getElementById('adminName').innerText = user.full_name || user.fullName || 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greetingMessage').innerText = `${greeting},`;
  const avatarImg = document.getElementById('avatarImg');
  const avatarName = encodeURIComponent(user.full_name || user.fullName || 'Admin');
  avatarImg.src = user.profile_picture || user.profilePicture || `https://ui-avatars.com/api/?background=2563eb&color=fff&rounded=true&bold=true&size=48&name=${avatarName}`;
  return true;
}

function renderDashboard() {
  const voters = votersCache.filter(v => v.role === 'voter');
  document.getElementById('dynamicContent').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><h3><i class="fas fa-vote-yea"></i> Elections</h3><div class="stat-number">${electionsCache.length}</div></div>
      <div class="stat-card"><h3><i class="fas fa-user-tie"></i> Candidates</h3><div class="stat-number">${candidatesCache.length}</div></div>
      <div class="stat-card"><h3><i class="fas fa-users"></i> Voters</h3><div class="stat-number">${voters.length}</div></div>
      <div class="stat-card"><h3><i class="fas fa-check-circle"></i> Votes Cast</h3><div class="stat-number">${votesCache.length}</div></div>
    </div>
  `;
}

function renderElections() {
  document.getElementById('dynamicContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <h2>Manage Elections</h2>
        <button class="btn-primary" id="addElectionBtn"><i class="fas fa-plus"></i> Add Election</button>
      </div>
      <table>
        <thead>
          <tr><th>Title</th><th>Description</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${electionsCache.map(e => `
            <tr>
              <td>${e.title}</td>
              <td>${e.description || ''}</td>
              <td>${new Date(e.start_date).toLocaleString()}</td>
              <td>${new Date(e.end_date).toLocaleString()}</td>
              <td>${e.status}</td>
              <td><button class="btn-danger delete-election" data-id="${e.id}"><i class="fas fa-trash"></i> Delete</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('addElectionBtn').addEventListener('click', openElectionModal);
  document.querySelectorAll('.delete-election').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this election?')) return;
      try {
        await fetchJson(`${API.elections}${btn.dataset.id}/`, { method: 'DELETE' });
        await refreshAllData();
        renderElections();
      } catch (error) {
        alert('Delete failed: ' + error.message);
      }
    });
  });
}

function openElectionModal() {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  modalTitle.textContent = 'Add Election';
  modalBody.innerHTML = `
    <div class="form-group"><label>Title</label><input type="text" id="electionTitle"></div>
    <div class="form-group"><label>Description</label><textarea id="electionDesc"></textarea></div>
    <div class="form-group"><label>Start Date</label><input type="datetime-local" id="electionStart"></div>
    <div class="form-group"><label>End Date</label><input type="datetime-local" id="electionEnd"></div>
    <div class="form-group"><label>Status</label>
      <select id="electionStatus">
        <option value="upcoming">Upcoming</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  `;
  modal.style.display = 'flex';

  const saveBtn = document.getElementById('modalSave');
  const cancelBtn = document.getElementById('modalCancel');
  const newSave = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSave, saveBtn);
  newSave.id = 'modalSave';

  newSave.addEventListener('click', async () => {
    const title = document.getElementById('electionTitle').value.trim();
    const description = document.getElementById('electionDesc').value.trim();
    const start = document.getElementById('electionStart').value;
    const end = document.getElementById('electionEnd').value;
    const status = document.getElementById('electionStatus').value;
    if (!title || !start || !end) return alert('Title, start date, and end date are required.');

    try {
      await fetchJson(API.elections, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          start_date: new Date(start).toISOString(),
          end_date: new Date(end).toISOString(),
          status
        })
      });
      modal.style.display = 'none';
      await refreshAllData();
      renderElections();
    } catch (error) {
      alert('Save failed: ' + error.message);
    }
  });

  cancelBtn.onclick = () => { modal.style.display = 'none'; };
}

function renderCandidates() {
  document.getElementById('dynamicContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <h2>Manage Candidates</h2>
        <button class="btn-primary" id="addCandidateBtn"><i class="fas fa-plus"></i> Add Candidate</button>
      </div>
      <table>
        <thead>
          <tr><th>Name</th><th>Party</th><th>Election</th><th>Description</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${candidatesCache.map(c => {
            const election = electionsCache.find(e => e.id === c.election);
            return `
              <tr>
                <td>${c.name}</td>
                <td>${c.party || ''}</td>
                <td>${election ? election.title : 'Unknown'}</td>
                <td>${c.description || ''}</td>
                <td><button class="btn-danger delete-candidate" data-id="${c.id}"><i class="fas fa-trash"></i> Delete</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('addCandidateBtn').addEventListener('click', openCandidateModal);
  document.querySelectorAll('.delete-candidate').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this candidate?')) return;
      try {
        await fetchJson(`${API.candidates}${btn.dataset.id}/`, { method: 'DELETE' });
        await refreshAllData();
        renderCandidates();
      } catch (error) {
        alert('Delete failed: ' + error.message);
      }
    });
  });
}

function openCandidateModal() {
  if (electionsCache.length === 0) {
    alert('Create an election first.');
    return;
  }

  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  modalTitle.textContent = 'Add Candidate';
  modalBody.innerHTML = `
    <div class="form-group"><label>Name</label><input type="text" id="candName"></div>
    <div class="form-group"><label>Party</label><input type="text" id="candParty"></div>
    <div class="form-group"><label>Description</label><textarea id="candDesc"></textarea></div>
    <div class="form-group">
      <label>Election</label>
      <select id="candElection">
        ${electionsCache.map(e => `<option value="${e.id}">${e.title}</option>`).join('')}
      </select>
    </div>
  `;
  modal.style.display = 'flex';

  const saveBtn = document.getElementById('modalSave');
  const cancelBtn = document.getElementById('modalCancel');
  const newSave = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSave, saveBtn);
  newSave.id = 'modalSave';

  newSave.addEventListener('click', async () => {
    const name = document.getElementById('candName').value.trim();
    const party = document.getElementById('candParty').value.trim();
    const description = document.getElementById('candDesc').value.trim();
    const election = document.getElementById('candElection').value;
    if (!name || !election) return alert('Name and election are required.');

    try {
      await fetchJson(API.candidates, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, party, description, election })
      });
      modal.style.display = 'none';
      await refreshAllData();
      renderCandidates();
    } catch (error) {
      alert('Save failed: ' + error.message);
    }
  });

  cancelBtn.onclick = () => { modal.style.display = 'none'; };
}

function renderVoters() {
  const voters = votersCache.filter(v => v.role === 'voter');
  document.getElementById('dynamicContent').innerHTML = `
    <div class="section">
      <div class="section-header"><h2>Registered Voters</h2></div>
      <table>
        <thead><tr><th>Name</th><th>Aadhaar</th><th>Mobile</th><th>Registered On</th></tr></thead>
        <tbody>
          ${voters.map(v => `
            <tr>
              <td>${v.full_name}</td>
              <td>${v.aadhaar}</td>
              <td>${v.mobile}</td>
              <td>${new Date(v.created_at).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function renderResults() {
  let resultsHtml = '';
  for (const election of electionsCache) {
    const result = await fetchJson(`${API.elections}${election.id}/results/`);
    resultsHtml += `
      <div class="section">
        <h3><i class="fas fa-chart-line"></i> ${election.title}</h3>
        <table>
          <thead><tr><th>Candidate</th><th>Party</th><th>Votes</th></tr></thead>
          <tbody>
            ${(result.results || []).map(c => `
              <tr>
                <td>${c.name}</td>
                <td>${c.party || ''}</td>
                <td><strong>${c.vote_count || 0}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  document.getElementById('dynamicContent').innerHTML = `<div>${resultsHtml || '<p>No election data available.</p>'}</div>`;
}

async function loadPage(page) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
  if (page === 'dashboard') renderDashboard();
  else if (page === 'elections') renderElections();
  else if (page === 'candidates') renderCandidates();
  else if (page === 'voters') renderVoters();
  else if (page === 'results') await renderResults();
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!ensureAdminSession()) return;
  try {
    await refreshAllData();
    await loadPage('dashboard');
  } catch (error) {
    alert('Failed to load admin data: ' + error.message);
  }

  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && window.innerWidth <= 768) {
      sidebar.classList.remove('open');
    }
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', async () => {
      await loadPage(item.dataset.page);
      if (window.innerWidth <= 768) sidebar.classList.remove('open');
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('votingUser');
    sessionStorage.removeItem('votingToken');
    window.location.href = '/';
  });
});
