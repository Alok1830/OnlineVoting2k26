
    const getOtpBtn = document.getElementById("getOtpBtn");
    const otpInputs = document.querySelectorAll(".otp-input");
    const otpStatus = document.getElementById("otpStatus");
    const loginBtn = document.getElementById("loginBtn");
    const otpTimer = document.getElementById("otpTimer");
    const aadhaarInput = document.getElementById("aadhaar");

    let generatedOtp = "";
    let timerInterval = null;

    function getUserByAadhaar(aadhaar) {
      const users = JSON.parse(localStorage.getItem("votingUsers")) || [];
      return users.find(user => user.aadhaar === aadhaar);
    }

    function startTimer(seconds) {
      let remaining = seconds;
      otpTimer.textContent = "Resend OTP in " + remaining + "s";
      getOtpBtn.disabled = true;
      timerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(timerInterval);
          otpTimer.textContent = "";
          getOtpBtn.disabled = false;
          getOtpBtn.textContent = "Resend OTP";
        } else {
          otpTimer.textContent = "Resend OTP in " + remaining + "s";
        }
      }, 1000);
    }

    function generateOtp() {
      generatedOtp = "";
      for (let i = 0; i < 6; i++) generatedOtp += Math.floor(Math.random() * 10);
      console.log("Demo OTP:", generatedOtp);
      alert("Demo OTP (for testing): " + generatedOtp);
    }

    getOtpBtn.addEventListener("click", async () => {
      const aadhaar = aadhaarInput.value.trim();
      if (!aadhaar || aadhaar.length !== 12) {
        alert("Please enter a valid 12-digit Aadhaar number.");
        return;
      }
      
      getOtpBtn.disabled = true;
      getOtpBtn.textContent = "Sending...";
      
      try {
        const response = await fetch('/api/request-otp/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aadhaar })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          generatedOtp = data.otp_code;
          console.log("OTP from backend:", generatedOtp);
          alert("OTP (test): " + generatedOtp);
          startTimer(30);
          otpStatus.style.display = "none";
          otpStatus.classList.remove("error");
          loginBtn.disabled = true;
          otpInputs.forEach(input => input.value = "");
          otpInputs[0].focus();
          getOtpBtn.textContent = "Get OTP";
          getOtpBtn.disabled = false;
        } else {
          alert(data.error || "Failed to request OTP. Please register first.");
          getOtpBtn.disabled = false;
          getOtpBtn.textContent = "Get OTP";
        }
      } catch (error) {
        alert("Error: " + error.message);
        getOtpBtn.disabled = false;
        getOtpBtn.textContent = "Get OTP";
      }
    });

    otpInputs.forEach((input, index) => {
      input.addEventListener("input", (e) => {
        const value = e.target.value;
        if (value.length > 1) e.target.value = value.charAt(0);
        if (value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
        checkOtp();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !e.target.value && index > 0) otpInputs[index - 1].focus();
      });
    });

    function checkOtp() {
      const entered = Array.from(otpInputs).map(input => input.value).join("");
      if (entered.length === 6) {
        if (entered === generatedOtp) {
          otpStatus.textContent = "OTP verified";
          otpStatus.classList.remove("error");
          otpStatus.style.display = "block";
          loginBtn.disabled = false;
        } else {
          otpStatus.textContent = "Incorrect OTP. Please try again.";
          otpStatus.classList.add("error");
          otpStatus.style.display = "block";
          loginBtn.disabled = true;
        }
      } else {
        otpStatus.style.display = "none";
        loginBtn.disabled = true;
      }
    }

    loginBtn.addEventListener("click", async () => {
      const aadhaar = aadhaarInput.value.trim();
      const otp_code = Array.from(otpInputs).map(input => input.value).join("");
      
      if (!aadhaar || otp_code.length !== 6) {
        alert("Please enter valid Aadhaar and OTP.");
        return;
      }
      
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";
      
      try {
        const response = await fetch('/api/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aadhaar, otp_code })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Store token and voter info
          sessionStorage.setItem('votingToken', data.token);
          sessionStorage.setItem('votingUser', JSON.stringify(data.voter));
          
          // Redirect based on role
          const role = data.voter.role;
          if (role === 'admin') {
            window.location.href = '/admin_panel/';
          } else if (role === 'voter') {
            window.location.href = '/voter_panel/';
          } else {
            alert('Unknown role. Please contact support.');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
          }
        } else {
          alert(data.error || 'Login failed');
          loginBtn.disabled = false;
          loginBtn.textContent = 'Login';
        }
      } catch (error) {
        alert("Login error: " + error.message);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
      }
    });
