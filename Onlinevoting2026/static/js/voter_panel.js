
  const API = {
    elections: '/api/elections/',
    candidates: '/api/candidates/',
    votes: '/api/votes/'
  };

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

  let currentVoter = null;
  let currentElectionForVote = null;
  let selectedCandidateId = null;
  let allElections = [];
  let allCandidates = [];
  let allVotes = [];

  function getCurrentVoter() { const user = sessionStorage.getItem('votingUser'); return user ? JSON.parse(user) : null; }
  
  async function fetchElections() {
    try {
      const response = await fetch('/api/elections/');
      if (response.ok) {
        allElections = await response.json();
        return allElections;
      }
    } catch (error) {
      console.error('Error fetching elections:', error);
    }
    return [];
  }
  
  async function fetchCandidates() {
    try {
      const response = await fetch('/api/candidates/');
      if (response.ok) {
        allCandidates = await response.json();
        return allCandidates;
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
    return [];
  }
  
  function hasVoted(electionId, voterAadhaar) {
    return allVotes.some(v => v.election === electionId && v.voter_aadhaar === voterAadhaar);
  }
  
  async function castVote(electionId, candidateId) {
    const voter = currentVoter;
    if (!voter) return false;
    if (hasVoted(electionId, voter.aadhaar)) { alert("You have already voted in this election."); return false; }
    
    try {
      await fetchJson(API.votes, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          election: electionId,
          candidate: candidateId,
          voter_aadhaar: voter.aadhaar
        })
      });
      await refreshVotes();
      return true;
    } catch (error) {
      alert('Error casting vote: ' + error.message);
      return false;
    }
  }
  

  async function refreshVotes() {
    try {
      allVotes = await fetchJson(API.votes);
    } catch (error) {
      console.error('Error fetching votes:', error);
      allVotes = [];
    }
  }

  function ensureVoterSession() {
    currentVoter = getCurrentVoter();
    if (!currentVoter) { window.location.href = '/'; return false; }
    if (currentVoter.role !== 'voter') { alert("Access denied. Only voters can view this page."); window.location.href = '/'; return false; }
    document.getElementById('voterName').innerText = currentVoter.full_name;
    const hour = new Date().getHours();
    let greeting = "Good day";
    if (hour < 12) greeting = "Good morning"; else if (hour < 18) greeting = "Good afternoon"; else greeting = "Good evening";
    document.getElementById('greetingMessage').innerText = `${greeting},`;
    const avatarImg = document.getElementById('avatarImg');
    if (currentVoter.profile_picture) {
      avatarImg.src = currentVoter.profile_picture;
    } else {
      const nameForAvatar = encodeURIComponent(currentVoter.full_name);
      avatarImg.src = `https://ui-avatars.com/api/?background=2563eb&color=fff&rounded=true&bold=true&size=48&name=${nameForAvatar}&t=${Date.now()}`;
    }
    return true;
  }

  let currentSection = 'dashboard';

  async function renderDashboard() {
    const elections = await fetchElections();
    await refreshVotes();
    const activeElections = elections.filter(e => e.status === 'active');
    const upcomingElections = elections.filter(e => e.status === 'upcoming');
    const completedElections = elections.filter(e => e.status === 'completed');
    const userVotesCount = allVotes.filter(v => v.voter_aadhaar === currentVoter.aadhaar).length;
    const recentElections = [...elections].sort((a,b) => new Date(b.start_date) - new Date(a.start_date)).slice(0, 3);
    const upcomingPreview = upcomingElections.slice(0, 3);

    const html = `
      <div class="stats-grid">
        <div class="stat-card"><h3><i class="fas fa-vote-yea"></i> Active Elections</h3><div class="stat-number">${activeElections.length}</div></div>
        <div class="stat-card"><h3><i class="fas fa-calendar-alt"></i> Upcoming</h3><div class="stat-number">${upcomingElections.length}</div></div>
        <div class="stat-card"><h3><i class="fas fa-chart-line"></i> Completed</h3><div class="stat-number">${completedElections.length}</div></div>
        <div class="stat-card"><h3><i class="fas fa-check-circle"></i> Your Votes</h3><div class="stat-number">${userVotesCount}</div></div>
      </div>

      ${upcomingPreview.length > 0 ? `
        <div class="section">
          <div class="section-header"><h2>Coming Soon</h2></div>
          <div class="upcoming-preview">
            ${upcomingPreview.map(e => `
              <div class="upcoming-item">
                <div>
                  <div class="upcoming-title">${e.title}</div>
                  <div class="upcoming-date">Starts: ${new Date(e.start_date).toLocaleString()}</div>
                </div>
                <span class="status-badge">Upcoming</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-header"><h2>Recent Elections</h2></div>
        <table>
          <thead>
            <tr><th>Title</th><th>Status</th><th>Dates</th></tr>
          </thead>
          <tbody>
            ${recentElections.map(e => `
              <tr>
                <td><i class="fas fa-poll"></i> ${e.title}</td>
                <td><span class="status-badge">${e.status}</span></td>
                <td>${new Date(e.start_date).toLocaleString()} → ${new Date(e.end_date).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="tips-card">
        <h3><i class="fas fa-lightbulb"></i> Voting Tips</h3>
        <p>✓ Verify your candidate's credentials before voting.</p>
        <p>✓ Your vote is secret and cannot be changed after submission.</p>
        <p>✓ You can only vote once per election.</p>
      </div>

      <div class="section">
        <div class="section-header"><h2>Active Elections</h2></div>
        <div id="activeElectionsList"></div>
      </div>
    `;
    document.getElementById('dynamicContent').innerHTML = html;

    // Render active elections as cards
    const activeContainer = document.getElementById('activeElectionsList');
    if (activeElections.length === 0) {
      activeContainer.innerHTML = '<p>No active elections at the moment.</p>';
    } else {
      activeContainer.innerHTML = activeElections.map(election => {
        const voterHasVoted = hasVoted(election.id, currentVoter.aadhaar);
        return `
          <div class="election-card">
            <div class="election-title">${election.title}</div>
            <div class="election-description">${election.description}</div>
            <div class="election-dates"><i class="fas fa-calendar-alt"></i> ${new Date(election.start_date).toLocaleString()} → ${new Date(election.end_date).toLocaleString()}</div>
            ${!voterHasVoted ? `<button class="vote-button" data-election-id="${election.id}" data-election-title="${election.title}" data-election-description="${election.description}">Let's Vote</button>` : `<div class="already-voted-badge"><i class="fas fa-check-circle"></i> You have already voted in this election</div>`}
          </div>
        `;
      }).join('');

      // Attach click handlers to "Let's Vote" buttons
      document.querySelectorAll('.vote-button').forEach(btn => {
        btn.addEventListener('click', () => {
          const electionId = btn.dataset.electionId;
          const electionTitle = btn.dataset.electionTitle;
          const electionDesc = btn.dataset.electionDescription;
          openVoteModal(electionId, electionTitle, electionDesc);
        });
      });
    }
  }

  function openVoteModal(electionId, title, description) {
    currentElectionForVote = electionId;
    selectedCandidateId = null;

    const candidates = allCandidates.filter(c => c.election === electionId);
    const modalTitle = document.getElementById('modalTitle');
    modalTitle.innerHTML = `<i class="fas fa-vote-yea"></i> ${title}`;
    const modalCandidatesDiv = document.getElementById('modalCandidates');
    modalCandidatesDiv.innerHTML = `
      <p style="margin-bottom: 16px;">${description}</p>
      <div class="candidates-grid" id="candidatesGrid">
        ${candidates.map(c => `
          <div class="candidate-card" data-candidate-id="${c.id}">
            ${c.symbol ? `<img src="${c.symbol}" class="candidate-img" alt="symbol">` : ''}
            <div class="candidate-name">${c.name}</div>
            <div class="candidate-party">${c.party}</div>
            <div class="candidate-bio">${c.description || ''}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Add click handlers to candidate cards
    document.querySelectorAll('.candidate-card').forEach(card => {
      card.addEventListener('click', () => {
        // Remove selected class from all
        document.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedCandidateId = card.dataset.candidateId;
      });
    });

    document.getElementById('voteModal').style.display = 'flex';
  }

  function closeVoteModal() {
    document.getElementById('voteModal').style.display = 'none';
    currentElectionForVote = null;
    selectedCandidateId = null;
  }

  async function confirmVote() {
    if (!selectedCandidateId) {
      alert('Please select a candidate to vote for.');
      return;
    }
    if (confirm('Are you sure you want to cast your vote for this candidate? This action cannot be undone.')) {
      if (await castVote(currentElectionForVote, selectedCandidateId)) {
        alert('Vote cast successfully!');
        closeVoteModal();
        await renderDashboard();
      } else {
        alert('Failed to cast vote. You may have already voted in this election.');
        closeVoteModal();
        await renderDashboard();
      }
    }
  }

  async function renderUpcoming() {
    const elections = await fetchElections();
    const upcoming = elections.filter(e => e.status === 'upcoming');
    const html = `<div class="section"><div class="section-header"><h2>Upcoming Elections</h2></div>${upcoming.length === 0 ? '<p>No upcoming elections scheduled.</p>' : upcoming.map(e => `<div style="margin-bottom: 24px; border-left: 4px solid #2563eb; padding-left: 16px;"><h3>${e.title}</h3><p>${e.description || ''}</p><p><strong>Start Date:</strong> ${new Date(e.start_date).toLocaleString()} | <strong>End Date:</strong> ${new Date(e.end_date).toLocaleString()}</p></div>`).join('')}</div>`;
    document.getElementById('dynamicContent').innerHTML = html;
  }


  async function loadSection(section) {
    currentSection = section;
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.section === section));
    if (section === 'dashboard') await renderDashboard();
    else if (section === 'active') await renderDashboard();
    else if (section === 'upcoming') await renderUpcoming();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!ensureVoterSession()) return;
    loadSection('dashboard');

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        loadSection(item.dataset.section);
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
      });
    });

    const sidebar = document.getElementById('sidebar'), menuToggle = document.getElementById('menuToggle');
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && window.innerWidth <= 768) sidebar.classList.remove('open');
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      sessionStorage.removeItem('votingUser');
      window.location.href = '/';
    });

    // Modal close handlers
    document.getElementById('closeModalBtn').addEventListener('click', closeVoteModal);
    document.getElementById('confirmVoteBtn').addEventListener('click', confirmVote);
    document.getElementById('voteModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('voteModal')) closeVoteModal();
    });
  });
