
    const getOtpBtn = document.getElementById("getOtpBtn");
    const otpInputs = document.querySelectorAll(".otp-input");
    const otpStatus = document.getElementById("otpStatus");
    const registerBtn = document.getElementById("registerBtn");
    const otpTimer = document.getElementById("otpTimer");
    const aadhaarInput = document.getElementById("aadhaar");
    const mobileInput = document.getElementById("mobile");
    const fullNameInput = document.getElementById("fullName");
    const roleSelect = document.getElementById("role");
    const successModal = document.getElementById("successModal");
    const greetingMessageSpan = document.getElementById("greetingMessage");
    const loginNowBtn = document.getElementById("loginNowBtn");

    let generatedOtp = "";
    let timerInterval = null;
    let isOtpVerified = false;

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

    function validateFields() {
      const name = fullNameInput.value.trim();
      const aadhaar = aadhaarInput.value.trim();
      const mobile = mobileInput.value.trim();
      if (!name) { alert("Please enter your full name."); return false; }
      if (!aadhaar || aadhaar.length !== 12 || isNaN(aadhaar)) { alert("Please enter a valid 12-digit Aadhaar number."); return false; }
      if (!mobile || mobile.length !== 10 || isNaN(mobile)) { alert("Please enter a valid 10-digit mobile number."); return false; }
      return true;
    }

    getOtpBtn.addEventListener("click", async () => {
      if (!validateFields()) return;
      
      const aadhaar = aadhaarInput.value.trim();
      const mobile = mobileInput.value.trim();
      getOtpBtn.disabled = true;
      getOtpBtn.textContent = "Sending...";
      
      try {
        const response = await fetch('/api/request-registration-otp/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aadhaar, mobile })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          generatedOtp = data.otp_code;
          console.log("OTP from backend:", generatedOtp);
          alert("OTP (test): " + generatedOtp + "\n\nOTP sent to your phone!");
          startTimer(30);
          otpStatus.style.display = "none";
          otpStatus.classList.remove("error");
          isOtpVerified = false;
          registerBtn.disabled = true;
          otpInputs.forEach(input => input.value = "");
          otpInputs[0].focus();
          getOtpBtn.textContent = "Get OTP";
          getOtpBtn.disabled = false;
        } else {
          alert(data.error || "Failed to request OTP");
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
          isOtpVerified = true;
          registerBtn.disabled = false;
        } else {
          otpStatus.textContent = "Incorrect OTP. Please try again.";
          otpStatus.classList.add("error");
          otpStatus.style.display = "block";
          isOtpVerified = false;
          registerBtn.disabled = true;
        }
      } else {
        otpStatus.style.display = "none";
        isOtpVerified = false;
        registerBtn.disabled = true;
      }
    }

    registerBtn.addEventListener("click", async () => {
      if (!isOtpVerified) {
        alert("Please verify OTP first.");
        return;
      }
      
      const fullName = fullNameInput.value.trim();
      const aadhaar = aadhaarInput.value.trim();
      const mobile = mobileInput.value.trim();
      const role = roleSelect.value;
      const otp_code = Array.from(otpInputs).map(input => input.value).join("");
      
      registerBtn.disabled = true;
      registerBtn.textContent = "Registering...";
      
      try {
        const response = await fetch('/api/register/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aadhaar,
            full_name: fullName,
            mobile,
            email: `${aadhaar}@voting.app`,
            role,
            otp_code
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Store voter info in sessionStorage
          sessionStorage.setItem('votingUser', JSON.stringify(data));
          greetingMessageSpan.textContent = `Welcome, ${fullName}! You have registered as ${role.toUpperCase()}. Your account is ready.`;
          successModal.style.display = "flex";
          registerBtn.textContent = "Register";
        } else {
          alert(data.error || data.aadhaar?.[0] || "Registration failed");
          registerBtn.disabled = false;
          registerBtn.textContent = "Register";
        }
      } catch (error) {
        alert("Registration error: " + error.message);
        registerBtn.disabled = false;
        registerBtn.textContent = "Register";
      }
    });

    successModal.addEventListener("click", (e) => {
      if (e.target === successModal) {
        successModal.style.display = "none";
        window.location.href = "/";
      }
    });
    loginNowBtn.addEventListener("click", () => {
      window.location.href = "/";
    });
  