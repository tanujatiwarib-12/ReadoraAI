const authSection = document.getElementById("authSection");
const appLayout = document.getElementById("appLayout");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const logoutButton = document.getElementById("logoutButton");
const authMessage = document.getElementById("authMessage");
const userEmail = document.getElementById("userEmail");

function showAuthMessage(message, isSuccess) {
  authMessage.textContent = message;
  authMessage.style.color = isSuccess ? "#4d5f3f" : "#8b2f2f";
}

function clearAuthMessage() {
  authMessage.textContent = "";
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  signupButton.disabled = isLoading;
  loginButton.textContent = isLoading ? "Please wait..." : "Log In";
}

function updateScreen(session) {
  if (session) {
    authSection.classList.add("hidden");
    appLayout.classList.remove("hidden");
    userEmail.textContent = session.user.email;
  } else {
    authSection.classList.remove("hidden");
    appLayout.classList.add("hidden");
    userEmail.textContent = "";
  }
}

loginButton.addEventListener("click", async function () {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  clearAuthMessage();

  if (!email) {
    showAuthMessage("Please enter your email.");
    return;
  }

  if (!password) {
    showAuthMessage("Please enter your password.");
    return;
  }

  setLoading(true);

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        showAuthMessage("Incorrect email or password. Please try again.");
      } else if (error.message.includes("Email not confirmed")) {
        showAuthMessage("Please confirm your email before logging in. Check your inbox.");
      } else {
        showAuthMessage(error.message);
      }
      return;
    }

    if (data.session) {
      clearAuthMessage();
      updateScreen(data.session);
    }

  } catch (err) {
    showAuthMessage("Something went wrong. Please check your internet connection.");
  } finally {
    setLoading(false);
  }
});

signupButton.addEventListener("click", async function () {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  clearAuthMessage();

  if (!email) {
    showAuthMessage("Please enter your email.");
    return;
  }

  if (password.length < 6) {
    showAuthMessage("Password must be at least 6 characters.");
    return;
  }

  setLoading(true);

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password
    });

    if (error) {
      if (error.message.includes("User already registered")) {
        showAuthMessage("An account with this email already exists. Try logging in.");
      } else {
        showAuthMessage(error.message);
      }
      return;
    }

    if (data.session) {
      clearAuthMessage();
      updateScreen(data.session);
    } else {
      showAuthMessage("Account created! Check your email to confirm before logging in.", true);
    }

  } catch (err) {
    showAuthMessage("Something went wrong. Please check your internet connection.");
  } finally {
    setLoading(false);
  }
});

logoutButton.addEventListener("click", async function () {
  logoutButton.disabled = true;
  logoutButton.textContent = "Logging out...";

  try {
    await supabaseClient.auth.signOut();
  } catch (err) {
    console.error("Logout error:", err);
  } finally {
    logoutButton.disabled = false;
    logoutButton.textContent = "Log Out";
  }
});

supabaseClient.auth.onAuthStateChange(function (event, session) {
  updateScreen(session);
});

async function checkSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Session check error:", error);
      updateScreen(null);
      return;
    }

    updateScreen(data.session);
  } catch (err) {
    console.error("Session check failed:", err);
    updateScreen(null);
  }
}

checkSession();