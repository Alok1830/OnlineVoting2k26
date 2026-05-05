
  // ---------- Data Helpers ----------
  const STORAGE_KEYS = {
    USERS: 'votingUsers'
  };

  function getUsers() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  let currentUser = null;

  // OTP handling for mobile change
  let otpTimerInterval = null;
  let otpVerified = false;
  let newMobileValue = '';

  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const otpTimerSpan = document.getElementById('otpTimer');
  const otpSection = document.getElementById('otpSection');
  const otpInputs = document.querySelectorAll('.otp-input');
  const otpStatusDiv = document.getElementById('otpStatus');

  // Profile picture
  const avatarPreview = document.getElementById('avatarPreview');
  const profilePicUpload = document.getElementById('profilePictureUpload');
  const updatePictureBtn = document.getElementById('updatePictureBtn');

  // Load user from session and display data
  function loadUser() {
    const stored = sessionStorage.getItem('votingUser');
    if (!stored) {
      window.location.href = '/';
      return false;
    }
    currentUser = JSON.parse(stored);
    if (!currentUser.role) {
      alert('Invalid user session. Please login again.');
      window.location.href = '/';
      return false;
    }

    // Display static info
    document.getElementById('aadhaarDisplay').innerText = currentUser.aadhaar;
    document.getElementById('roleDisplay').innerText = currentUser.role === 'admin' ? 'Administrator' : 'Voter';
    document.getElementById('fullName').value = currentUser.full_name || currentUser.fullName || '';
    document.getElementById('mobile').value = currentUser.mobile || '';

    // Profile picture preview
    if (currentUser.profile_picture || currentUser.profilePicture) {
      avatarPreview.src = currentUser.profile_picture || currentUser.profilePicture;
    } else {
      const initials = encodeURIComponent(currentUser.full_name || currentUser.fullName || 'User');
      avatarPreview.src = `https://ui-avatars.com/api/?background=2563eb&color=fff&rounded=true&bold=true&size=80&name=${initials}`;
    }

    // Load password management section
    renderPasswordSection();
    return true;
  }

  // Render password form based on whether password exists
  function renderPasswordSection() {
    const container = document.getElementById('passwordForm');
    if (!currentUser.password) {
      // No password set – show set password form
      container.innerHTML = `
        <div class="form-group">
          <label>Set New Password</label>
          <input type="password" id="newPassword" placeholder="Enter new password">
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input type="password" id="confirmPassword" placeholder="Confirm new password">
        </div>
        <button id="setPasswordBtn" class="btn btn-primary">Set Password</button>
      `;
      document.getElementById('setPasswordBtn').addEventListener('click', setPassword);
    } else {
      // Password exists – show change password form
      container.innerHTML = `
        <div class="form-group">
          <label>Current Password</label>
          <input type="password" id="currentPassword" placeholder="Enter current password">
        </div>
        <div class="form-group">
          <label>New Password</label>
          <input type="password" id="newPassword" placeholder="Enter new password">
        </div>
        <div class="form-group">
          <label>Confirm New Password</label>
          <input type="password" id="confirmPassword" placeholder="Confirm new password">
        </div>
        <button id="changePasswordBtn" class="btn btn-primary">Change Password</button>
      `;
      document.getElementById('changePasswordBtn').addEventListener('click', changePassword);
    }
  }

  // Set password (first time)
  function setPassword() {
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;
    if (!newPwd) {
      alert('Please enter a password.');
      return;
    }
    if (newPwd !== confirmPwd) {
      alert('Passwords do not match.');
      return;
    }
    if (newPwd.length < 4) {
      alert('Password must be at least 4 characters.');
      return;
    }
    // Update user in localStorage and session
    const users = getUsers();
    const userIndex = users.findIndex(u => u.aadhaar === currentUser.aadhaar);
    if (userIndex === -1) {
      alert('User not found.');
      return;
    }
    users[userIndex].password = newPwd;
    saveUsers(users);
    currentUser.password = newPwd;
    sessionStorage.setItem('votingUser', JSON.stringify(currentUser));
    alert('Password set successfully!');
    renderPasswordSection();  // re-render to show change password form
  }

  // Change existing password
  function changePassword() {
    const current = document.getElementById('currentPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;

    if (!current) {
      alert('Please enter current password.');
      return;
    }
    if (current !== currentUser.password) {
      alert('Current password is incorrect.');
      return;
    }
    if (!newPwd) {
      alert('Please enter new password.');
      return;
    }
    if (newPwd !== confirmPwd) {
      alert('New passwords do not match.');
      return;
    }
    if (newPwd.length < 4) {
      alert('Password must be at least 4 characters.');
      return;
    }
    const users = getUsers();
    const userIndex = users.findIndex(u => u.aadhaar === currentUser.aadhaar);
    if (userIndex === -1) {
      alert('User not found.');
      return;
    }
    users[userIndex].password = newPwd;
    saveUsers(users);
    currentUser.password = newPwd;
    sessionStorage.setItem('votingUser', JSON.stringify(currentUser));
    alert('Password changed successfully!');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
  }

  function startTimer(seconds) {
    let remaining = seconds;
    otpTimerSpan.textContent = `Resend OTP in ${remaining}s`;
    sendOtpBtn.disabled = true;
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    otpTimerInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(otpTimerInterval);
        otpTimerSpan.textContent = '';
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = 'Resend OTP';
      } else {
        otpTimerSpan.textContent = `Resend OTP in ${remaining}s`;
      }
    }, 1000);
  }

  // Send OTP for mobile change
  sendOtpBtn.addEventListener('click', async () => {
    const newMobile = document.getElementById('mobile').value.trim();
    if (!newMobile || newMobile.length !== 10 || isNaN(newMobile)) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (newMobile === currentUser.mobile) {
      alert('This is your current mobile number. No change needed.');
      return;
    }
    newMobileValue = newMobile;
    sendOtpBtn.disabled = true;
    sendOtpBtn.textContent = 'Sending...';

    try {
      const response = await fetch('/api/request-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: currentUser.mobile })
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to request OTP.');
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = 'Send OTP';
        return;
      }

      alert('OTP sent to your current registered mobile number.');
      startTimer(30);
      otpSection.style.display = 'block';
      otpVerified = false;
      otpStatusDiv.innerHTML = '';
      otpStatusDiv.className = 'status-text';
      otpInputs.forEach(inp => inp.value = '');
      otpInputs[0].focus();
    } catch (error) {
      alert('Error requesting OTP: ' + error.message);
      sendOtpBtn.disabled = false;
      sendOtpBtn.textContent = 'Send OTP';
    }
  });

  // OTP input handlers
  otpInputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val.length > 1) e.target.value = val.charAt(0);
      if (val && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
      checkOtp();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) otpInputs[idx - 1].focus();
    });
  });

  function checkOtp() {
    const entered = Array.from(otpInputs).map(i => i.value).join('');
    if (entered.length === 6) {
      otpStatusDiv.innerHTML = 'OTP entered. Click Save to verify and update profile.';
      otpStatusDiv.className = 'status-text success';
      otpVerified = true;
    } else {
      otpStatusDiv.innerHTML = '';
      otpVerified = false;
    }
  }

  // Profile picture upload
  let newProfilePicture = null; // base64 string if changed

  profilePicUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        avatarPreview.src = event.target.result;
        newProfilePicture = event.target.result;
        document.getElementById('profilePicStatus').innerHTML = 'New picture ready. Click "Update Picture" to save.';
        document.getElementById('profilePicStatus').className = 'status-text success';
      };
      reader.readAsDataURL(file);
    }
  });

  updatePictureBtn.addEventListener('click', async () => {
    if (!newProfilePicture) {
      alert('Please select a picture first.');
      return;
    }
    try {
      const response = await fetch(`/api/voters/${currentUser.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_picture: newProfilePicture })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to update picture.');
        return;
      }

      currentUser = data;
      sessionStorage.setItem('votingUser', JSON.stringify(currentUser));
      alert('Profile picture updated successfully!');
      document.getElementById('profilePicStatus').innerHTML = 'Picture saved!';
      document.getElementById('profilePicStatus').className = 'status-text success';
      newProfilePicture = null; // reset
    } catch (error) {
      alert('Failed to update picture: ' + error.message);
    }
  });

  // Save profile changes (name, mobile)
  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const newName = document.getElementById('fullName').value.trim();
    const newMobile = document.getElementById('mobile').value.trim();
    if (!newName) {
      alert('Name cannot be empty.');
      return;
    }
    if (!newMobile || newMobile.length !== 10 || isNaN(newMobile)) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    // Check if mobile is being changed and OTP is required
    if (newMobile !== currentUser.mobile && !otpVerified) {
      alert('Please verify the new mobile number with OTP first.');
      return;
    }

    if (newMobile !== currentUser.mobile) {
      const enteredOtp = Array.from(otpInputs).map(i => i.value).join('');
      try {
        const verifyResponse = await fetch('/api/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: currentUser.mobile, otp_code: enteredOtp })
        });
        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok) {
          alert(verifyData.error || 'OTP verification failed.');
          return;
        }
      } catch (error) {
        alert('OTP verification error: ' + error.message);
        return;
      }
    }

    try {
      const response = await fetch(`/api/voters/${currentUser.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: newName, mobile: newMobile })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || data.mobile?.[0] || 'Failed to update profile.');
        return;
      }

      currentUser = data;
      sessionStorage.setItem('votingUser', JSON.stringify(currentUser));
    } catch (error) {
      alert('Failed to update profile: ' + error.message);
      return;
    }

    alert('Profile updated successfully!');
    // Reset OTP section for next change
    otpSection.style.display = 'none';
    otpVerified = false;
    newMobileValue = '';
    otpTimerSpan.textContent = '';
    sendOtpBtn.disabled = false;
    sendOtpBtn.textContent = 'Send OTP';
    if (otpTimerInterval) clearInterval(otpTimerInterval);
    // Refresh avatar if initials changed (but we keep picture)
    if (!(currentUser.profile_picture || currentUser.profilePicture)) {
      const initials = encodeURIComponent(newName);
      avatarPreview.src = `https://ui-avatars.com/api/?background=2563eb&color=fff&rounded=true&bold=true&size=80&name=${initials}`;
    }
  });

  // Back to dashboard link – always use the latest session storage role
  function getDashboardUrl() {
    const stored = sessionStorage.getItem('votingUser');
    if (stored) {
      const user = JSON.parse(stored);
      if (user.role === 'admin') return '/admin_panel/';
    }
    return '/voter_panel/';
  }

  document.getElementById('backToDashboard').href = getDashboardUrl();

  // Initialize
  loadUser();
 