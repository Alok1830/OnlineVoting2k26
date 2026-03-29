
  const STORAGE_KEYS = { ELECTIONS: 'voting_elections', CANDIDATES: 'voting_candidates', VOTES: 'voting_votes', USERS: 'votingUsers' };
  function getData(key) { const data = localStorage.getItem(key); return data ? JSON.parse(data) : []; }
  function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
  const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="%234caf50"%3E%3Cpath d="M12 2L15 8.5L22 9.5L17 14L18.5 21L12 17.5L5.5 21L7 14L2 9.5L9 8.5L12 2z"/%3E%3C/svg%3E';
  function initData() {
    let elections = getData(STORAGE_KEYS.ELECTIONS);
    if (elections.length === 0) {
      const defaultElection = { id: Date.now().toString(), title: "General Election 2026", description: "Vote for your representatives.", startDate: "2026-04-01", endDate: "2026-04-10", status: "active" };
      elections.push(defaultElection);
      saveData(STORAGE_KEYS.ELECTIONS, elections);
    }
    let candidates = getData(STORAGE_KEYS.CANDIDATES);
    if (candidates.length === 0) {
      const electionId = getData(STORAGE_KEYS.ELECTIONS)[0]?.id;
      if (electionId) {
        const defaultCandidates = [
          { id: Date.now().toString() + "1", electionId, name: "Alice Johnson", party: "Progressive Party", bio: "Experienced leader", partySymbolName: "Green Sapling", partySymbolImageUrl: placeholderImage },
          { id: Date.now().toString() + "2", electionId, name: "Bob Smith", party: "Unity Alliance", bio: "Community advocate", partySymbolName: "Shaking Hands", partySymbolImageUrl: placeholderImage }
        ];
        candidates = defaultCandidates;
        saveData(STORAGE_KEYS.CANDIDATES, candidates);
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.VOTES)) saveData(STORAGE_KEYS.VOTES, []);
    let users = getData(STORAGE_KEYS.USERS);
    if (users.length === 0) {
      users.push({ fullName: "Sonu Patel", aadhaar: "111111111111", mobile: "9999999999", role: "admin", registeredAt: new Date().toISOString() });
      users.push({ fullName: "Voter User", aadhaar: "222222222222", mobile: "8888888888", role: "voter", registeredAt: new Date().toISOString() });
      saveData(STORAGE_KEYS.USERS, users);
    }
  }
  function getGreeting() { const hour = new Date().getHours(); if (hour < 12) return "Good morning"; if (hour < 18) return "Good afternoon"; return "Good evening"; }
  function ensureAdminSession() {
    let user = sessionStorage.getItem('votingUser');
    if (!user) {
      const users = getData(STORAGE_KEYS.USERS);
      const adminUser = users.find(u => u.role === 'admin');
      if (adminUser) { sessionStorage.setItem('votingUser', JSON.stringify(adminUser)); user = adminUser; }
      else { const tempAdmin = { fullName: "Sonu Patel", aadhaar: "000000000000", mobile: "0000000000", role: "admin", registeredAt: new Date().toISOString() }; sessionStorage.setItem('votingUser', JSON.stringify(tempAdmin)); user = tempAdmin; }
    }
    const parsedUser = JSON.parse(sessionStorage.getItem('votingUser'));
    if (parsedUser.role !== 'admin') { alert('Access denied. Admins only.'); window.location.href = '/'; return false; }
    document.getElementById('adminName').innerText = parsedUser.fullName;
    document.getElementById('greetingMessage').innerText = `${getGreeting()},`;
    const avatarImg = document.getElementById('avatarImg');
    if (parsedUser.profilePicture) {
      avatarImg.src = parsedUser.profilePicture;
    } else {
      const nameForAvatar = encodeURIComponent(parsedUser.fullName);
      avatarImg.src = `https://ui-avatars.com/api/?background=2563eb&color=fff&rounded=true&bold=true&size=48&name=${nameForAvatar}&t=${Date.now()}`;
    }
    return true;
  }
  function renderDashboard() {
    const elections = getData(STORAGE_KEYS.ELECTIONS);
    const candidates = getData(STORAGE_KEYS.CANDIDATES);
    const users = getData(STORAGE_KEYS.USERS);
    const voters = users.filter(u => u.role === 'voter');
    const votes = getData(STORAGE_KEYS.VOTES);
    const html = `
      <div class="stats-grid">
        <div class="stat-card"><h3><i class="fas fa-vote-yea"></i> Elections</h3><div class="stat-number">${elections.length}</div></div>
        <div class="stat-card"><h3><i class="fas fa-user-tie"></i> Candidates</h3><div class="stat-number">${candidates.length}</div></div>
        <div class="stat-card"><h3><i class="fas fa-users"></i> Voters</h3><div class="stat-number">${voters.length}</div></div>
        <div class="stat-card"><h3><i class="fas fa-check-circle"></i> Votes Cast</h3><div class="stat-number">${votes.length}</div></div>
      </div>
      <div class="section">
        <div class="section-header"><h2>Recent Elections</h2></div>
         <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Dates</th>
            </tr>
          </thead>
          <tbody>
            ${elections.map(e => `
              <tr>
                <td><i class="fas fa-poll"></i> ${e.title}</td>
                <td><span style="background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:30px;">${e.status}</span></td>
                <td>${e.startDate} → ${e.endDate}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('dynamicContent').innerHTML = html;
  }
  function renderElections() {
    const elections = getData(STORAGE_KEYS.ELECTIONS);
    const html = `
      <div class="section">
        <div class="section-header">
          <h2>Manage Elections</h2>
          <button class="btn-primary" id="addElectionBtn"><i class="fas fa-plus"></i> Add Election</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${elections.map(e => `
              <tr>
                <td><i class="fas fa-calendar-alt"></i> ${e.title}</td>
                <td>${e.description}</td>
                <td>${e.startDate}</td>
                <td>${e.endDate}</td>
                <td>${e.status}</td>
                <td><button class="btn-danger delete-election" data-id="${e.id}"><i class="fas fa-trash"></i> Delete</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('dynamicContent').innerHTML = html;
    document.getElementById('addElectionBtn').addEventListener('click', () => openElectionModal());
    document.querySelectorAll('.delete-election').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (confirm('Delete this election? All associated candidates will also be deleted.')) {
        let elections = getData(STORAGE_KEYS.ELECTIONS).filter(e => e.id !== id);
        saveData(STORAGE_KEYS.ELECTIONS, elections);
        let candidates = getData(STORAGE_KEYS.CANDIDATES).filter(c => c.electionId !== id);
        saveData(STORAGE_KEYS.CANDIDATES, candidates);
        renderElections();
      }
    }));
  }
  function openElectionModal(election = null) {
    const modal = document.getElementById('modal'), modalTitle = document.getElementById('modalTitle'), modalBody = document.getElementById('modalBody');
    modalTitle.textContent = election ? 'Edit Election' : 'Add Election';
    modalBody.innerHTML = `
      <div class="form-group"><label>Title</label><input type="text" id="electionTitle" value="${election ? election.title : ''}"></div>
      <div class="form-group"><label>Description</label><textarea id="electionDesc">${election ? election.description : ''}</textarea></div>
      <div class="form-group"><label>Start Date</label><input type="date" id="electionStart" value="${election ? election.startDate : ''}"></div>
      <div class="form-group"><label>End Date</label><input type="date" id="electionEnd" value="${election ? election.endDate : ''}"></div>
      <div class="form-group"><label>Status</label><select id="electionStatus"><option value="active">Active</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option></select></div>
    `;
    if (election) document.getElementById('electionStatus').value = election.status;
    modal.style.display = 'flex';
    const saveBtn = document.getElementById('modalSave'), cancelBtn = document.getElementById('modalCancel'), newSave = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSave, saveBtn); newSave.id = 'modalSave';
    newSave.addEventListener('click', () => {
      const title = document.getElementById('electionTitle').value.trim(), desc = document.getElementById('electionDesc').value.trim(), start = document.getElementById('electionStart').value, end = document.getElementById('electionEnd').value, status = document.getElementById('electionStatus').value;
      if (!title) return alert('Title required');
      const elections = getData(STORAGE_KEYS.ELECTIONS);
      if (election) {
        election.title = title; election.description = desc; election.startDate = start; election.endDate = end; election.status = status;
        saveData(STORAGE_KEYS.ELECTIONS, elections);
      } else {
        elections.push({ id: Date.now().toString(), title, description: desc, startDate: start, endDate: end, status });
        saveData(STORAGE_KEYS.ELECTIONS, elections);
      }
      modal.style.display = 'none';
      renderElections();
    });
    cancelBtn.onclick = () => modal.style.display = 'none';
  }
  function renderCandidates() {
    const elections = getData(STORAGE_KEYS.ELECTIONS), candidates = getData(STORAGE_KEYS.CANDIDATES);
    const html = `<div class="section"><div class="section-header"><h2>Manage Candidates</h2><button class="btn-primary" id="addCandidateBtn"><i class="fas fa-plus"></i> Add Candidate</button></div>   <table> <thead>   <tr><th>Name</th><th>Party</th><th>Election</th><th>Symbol Name</th><th>Symbol Image</th><th>Actions</th></tr> </thead> <tbody> ${candidates.map(c => { const election = elections.find(e => e.id === c.electionId); const imgHtml = c.partySymbolImageUrl ? `<img src="${c.partySymbolImageUrl}" class="symbol-img" alt="symbol">` : '—'; return `<tr><td><i class="fas fa-user-circle"></i> ${c.name}</td><td>${c.party}</td><td>${election ? election.title : 'Unknown'}</td><td>${c.partySymbolName || '—'}</td><td>${imgHtml}</td><td><button class="btn-danger delete-candidate" data-id="${c.id}"><i class="fas fa-trash"></i> Delete</button></td></tr>`; }).join('')} </tbody> </table> </div>`;
    document.getElementById('dynamicContent').innerHTML = html;
    document.getElementById('addCandidateBtn').addEventListener('click', () => openCandidateModal());
    document.querySelectorAll('.delete-candidate').forEach(btn => btn.addEventListener('click', () => { if (confirm('Delete candidate?')) { let candidates = getData(STORAGE_KEYS.CANDIDATES).filter(c => c.id !== btn.dataset.id); saveData(STORAGE_KEYS.CANDIDATES, candidates); renderCandidates(); } }));
  }
  function openCandidateModal(candidate = null) {
    const elections = getData(STORAGE_KEYS.ELECTIONS), modal = document.getElementById('modal'), modalTitle = document.getElementById('modalTitle'), modalBody = document.getElementById('modalBody');
    modalTitle.textContent = candidate ? 'Edit Candidate' : 'Add Candidate';
    modalBody.innerHTML = `<div class="form-group"><label>Name</label><input type="text" id="candName" value="${candidate ? candidate.name : ''}"></div><div class="form-group"><label>Party Name</label><input type="text" id="candParty" value="${candidate ? candidate.party : ''}"></div><div class="form-group"><label>Party Symbol Name</label><input type="text" id="partySymbolName" value="${candidate ? candidate.partySymbolName || '' : ''}" placeholder="e.g., Lotus, Hand"></div><div class="form-group"><label>Party Symbol Image</label><input type="file" id="partySymbolImage" accept="image/*"><div id="imagePreview"></div></div><div class="form-group"><label>Bio</label><textarea id="candBio">${candidate ? candidate.bio : ''}</textarea></div><div class="form-group"><label>Election</label><select id="candElection">${elections.map(e => `<option value="${e.id}" ${candidate && candidate.electionId === e.id ? 'selected' : ''}>${e.title}</option>`).join('')}</select></div>`;
    modal.style.display = 'flex';
    if (candidate && candidate.partySymbolImageUrl) document.getElementById('imagePreview').innerHTML = `<img src="${candidate.partySymbolImageUrl}" class="image-preview" alt="Current symbol">`;
    const fileInput = document.getElementById('partySymbolImage');
    fileInput.addEventListener('change', function(e) { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = function(event) { document.getElementById('imagePreview').innerHTML = `<img src="${event.target.result}" class="image-preview" alt="Preview">`; }; reader.readAsDataURL(file); } });
    const saveBtn = document.getElementById('modalSave'), cancelBtn = document.getElementById('modalCancel'), newSave = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSave, saveBtn); newSave.id = 'modalSave';
    newSave.addEventListener('click', () => {
      const name = document.getElementById('candName').value.trim(), party = document.getElementById('candParty').value.trim(), partySymbolName = document.getElementById('partySymbolName').value.trim(), bio = document.getElementById('candBio').value.trim(), electionId = document.getElementById('candElection').value;
      if (!name || !electionId) return alert('Name and Election required');
      let imageDataUrl = candidate ? candidate.partySymbolImageUrl : null;
      const file = document.getElementById('partySymbolImage').files[0];
      if (file) { const reader = new FileReader(); reader.onload = function(event) { imageDataUrl = event.target.result; saveCandidate(imageDataUrl); }; reader.readAsDataURL(file); }
      else saveCandidate(imageDataUrl);
      function saveCandidate(imageDataUrl) {
        const candidates = getData(STORAGE_KEYS.CANDIDATES);
        if (candidate) { candidate.name = name; candidate.party = party; candidate.partySymbolName = partySymbolName; candidate.partySymbolImageUrl = imageDataUrl; candidate.bio = bio; candidate.electionId = electionId; saveData(STORAGE_KEYS.CANDIDATES, candidates); }
        else { candidates.push({ id: Date.now().toString(), electionId, name, party, partySymbolName, partySymbolImageUrl: imageDataUrl || null, bio }); saveData(STORAGE_KEYS.CANDIDATES, candidates); }
        modal.style.display = 'none'; renderCandidates();
      }
    });
    cancelBtn.onclick = () => modal.style.display = 'none';
  }
  function renderVoters() {
    const users = getData(STORAGE_KEYS.USERS), voters = users.filter(u => u.role === 'voter');
    const html = `<div class="section"><div class="section-header"><h2>Registered Voters</h2></div>   <table> <thead>   <tr><th>Name</th><th>Aadhaar</th><th>Mobile</th><th>Registered On</th></tr> </thead> <tbody>${voters.map(v => `<tr><td><i class="fas fa-user"></i> ${v.fullName}</td><td>${v.aadhaar}</td><td>${v.mobile}</td><td>${new Date(v.registeredAt).toLocaleDateString()}</td></tr>`).join('')}</tbody> </table> </div>`;
    document.getElementById('dynamicContent').innerHTML = html;
  }
  function renderResults() {
    const elections = getData(STORAGE_KEYS.ELECTIONS), candidates = getData(STORAGE_KEYS.CANDIDATES), votes = getData(STORAGE_KEYS.VOTES);
    const resultsHtml = elections.map(election => { const electionCandidates = candidates.filter(c => c.electionId === election.id); const votesForElection = votes.filter(v => v.electionId === election.id); const candidateVotes = electionCandidates.map(c => ({ ...c, count: votesForElection.filter(v => v.candidateId === c.id).length })).sort((a,b)=>b.count-a.count); return `<div class="section"><h3><i class="fas fa-chart-line"></i> ${election.title}</h3> <table> <thead> <tr><th>Candidate</th><th>Party</th><th>Votes</th></tr> </thead> <tbody>${candidateVotes.map(c => `<tr><td>${c.name}</td><td>${c.party}</td><td><strong>${c.count}</strong></td></tr>`).join('')}</tbody> </table> </div>`; }).join('');
    document.getElementById('dynamicContent').innerHTML = `<div>${resultsHtml}</div>`;
  }
  function loadPage(page) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
    if (page === 'dashboard') renderDashboard(); else if (page === 'elections') renderElections(); else if (page === 'candidates') renderCandidates(); else if (page === 'voters') renderVoters(); else if (page === 'results') renderResults();
  }
  const sidebar = document.getElementById('sidebar'), menuToggle = document.getElementById('menuToggle');
  menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', (e) => { if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && window.innerWidth <= 768) sidebar.classList.remove('open'); });
  document.addEventListener('DOMContentLoaded', () => { initData(); if (!ensureAdminSession()) return; loadPage('dashboard'); document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => { loadPage(item.dataset.page); if (window.innerWidth <= 768) sidebar.classList.remove('open'); })); document.getElementById('logoutBtn').addEventListener('click', () => { sessionStorage.removeItem('votingUser'); window.location.href = '/'; }); });
