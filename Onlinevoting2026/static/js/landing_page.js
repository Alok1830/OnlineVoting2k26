
  // helper to retrieve data
  function getData(key, fallback = []) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch(e) { return fallback; }
  }

  // animate numbers (simple counter)
  function animateNumber(element, target, duration = 800) {
    if (!element) return;
    let start = 0;
    const stepTime = Math.abs(Math.floor(duration / target));
    const interval = setInterval(() => {
      start += 1;
      element.innerText = start;
      if (start >= target) {
        element.innerText = target;
        clearInterval(interval);
      }
    }, Math.min(stepTime, 20));
  }

  function updateStats() {
    const users = getData('votingUsers', []);
    const voters = users.filter(u => u.role === 'voter').length;
    const elections = getData('voting_elections', []);
    const votes = getData('voting_votes', []).length;
    const activeElections = elections.filter(e => e.status === 'active').length;
    
    const votersEl = document.getElementById('totalVoters');
    const electionsEl = document.getElementById('totalElections');
    const votesEl = document.getElementById('totalVotes');
    const activeEl = document.getElementById('activeElectionsCount');
    
    if (votersEl) animateNumber(votersEl, voters);
    if (electionsEl) animateNumber(electionsEl, elections.length);
    if (votesEl) animateNumber(votesEl, votes);
    if (activeEl) animateNumber(activeEl, activeElections);
  }

  function renderActiveElections() {
    const elections = getData('voting_elections', []);
    const active = elections.filter(e => e.status === 'active');
    const container = document.getElementById('activeElectionsList');
    if (!container) return;
    if (active.length === 0) {
      container.innerHTML = `<div style="background:#f8fafc; border-radius:28px; padding: 42px 24px; text-align:center;">
        <i class="fas fa-calendar-times" style="font-size:2.5rem; color:#94a3b8;"></i>
        <p style="margin-top:12px;">No active elections at the moment. Stay tuned!</p>
      </div>`;
      return;
    }
    let html = '';
    active.forEach(e => {
      html += `
        <div class="election-card-small">
          <div class="election-title"><i class="fas fa-check-circle" style="color:#1e4a8a;"></i> ${escapeHtml(e.title)}</div>
          <div class="election-dates" style="font-size:0.85rem; color:#2c3e5c; margin: 6px 0 12px;"><i class="far fa-calendar-alt"></i> ${e.startDate} → ${e.endDate}</div>
          <p style="margin-bottom: 14px;">${escapeHtml(e.description?.substring(0, 120) || 'Cast your vote to choose the best candidate.')}</p>
          <span class="badge-active"><i class="fas fa-fire"></i> LIVE NOW</span>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  // Team member view button handler
  function attachTeamViewHandlers() {
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const name = btn.getAttribute('data-member');
        const role = btn.getAttribute('data-role');
        const bio = btn.getAttribute('data-bio');
        alert(`👤 ${name}\n📌 Role: ${role}\n📝 Bio: ${bio}`);
      });
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    updateStats();
    renderActiveElections();
    attachTeamViewHandlers();
    window.addEventListener('storage', (e) => {
      if (e.key === 'voting_elections' || e.key === 'votingUsers' || e.key === 'voting_votes') {
        updateStats();
        renderActiveElections();
      }
    });
  });
