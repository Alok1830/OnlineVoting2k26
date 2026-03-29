
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
  let generatedOtp = '';
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
    document.getElementById('fullName').value = currentUser.fullName || '';
    document.getElementById('mobile').value = currentUser.mobile || '';

    // Profile picture preview
    if (currentUser.profilePicture) {
      avatarPreview.src = currentUser.profilePicture;
    } else {
      const initials = encodeURIComponent(currentUser.fullName);
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

  // OTP generation and timer
  function generateOtp() {
    let otp = '';
    for (let i = 0; i < 6; i++) otp += Math.floor(Math.random() * 10);
    console.log('OTP for mobile change:', otp);
    alert(`Demo OTP: ${otp}\n(This would be sent to your new mobile number in a real system.)`);
    return otp;
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
  sendOtpBtn.addEventListener('click', () => {
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
    generatedOtp = generateOtp();
    startTimer(30);
    otpSection.style.display = 'block';
    otpVerified = false;
    otpStatusDiv.innerHTML = '';
    otpStatusDiv.className = 'status-text';
    // Clear OTP inputs
    otpInputs.forEach(inp => inp.value = '');
    otpInputs[0].focus();
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
      if (entered === generatedOtp) {
        otpStatusDiv.innerHTML = 'OTP verified. You can now save your profile.';
        otpStatusDiv.className = 'status-text success';
        otpVerified = true;
      } else {
        otpStatusDiv.innerHTML = 'Incorrect OTP. Please try again.';
        otpStatusDiv.className = 'status-text error';
        otpVerified = false;
      }
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

  updatePictureBtn.addEventListener('click', () => {
    if (!newProfilePicture) {
      alert('Please select a picture first.');
      return;
    }
    // Update user in localStorage and session
    const users = getUsers();
    const userIndex = users.findIndex(u => u.aadhaar === currentUser.aadhaar);
    if (userIndex === -1) {
      alert('User not found.');
      return;
    }
    users[userIndex].profilePicture = newProfilePicture;
    saveUsers(users);
    currentUser.profilePicture = newProfilePicture;
    sessionStorage.setItem('votingUser', JSON.stringify(currentUser));
    alert('Profile picture updated successfully!');
    document.getElementById('profilePicStatus').innerHTML = 'Picture saved!';
    document.getElementById('profilePicStatus').className = 'status-text success';
    newProfilePicture = null; // reset
  });

  // Save profile changes (name, mobile)
  document.getElementById('saveProfileBtn').addEventListener('click', () => {
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

    // Update user data
    const users = getUsers();
    const userIndex = users.findIndex(u => u.aadhaar === currentUser.aadhaar);
    if (userIndex === -1) {
      alert('User not found.');
      return;
    }
    users[userIndex].fullName = newName;
    users[userIndex].mobile = newMobile;
    saveUsers(users);
    // Update session
    currentUser.fullName = newName;
    currentUser.mobile = newMobile;
    sessionStorage.setItem('votingUser', JSON.stringify(currentUser));

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
    if (!currentUser.profilePicture) {
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
 