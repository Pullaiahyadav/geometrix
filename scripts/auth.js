/* ============================================
   Geometrixx Auth System
   Handles signup, login, session & user data
   Storage: localStorage (simulating JSON file)
   ============================================ */

var GeoAuth = (function () {
  var USERS_KEY = "geometrixx_users";     // stored users (array of user objects)
  var SESSION_KEY = "geometrixx_session"; // current logged-in user

  // --- Helpers ---
  function getUsers() {
    try {
      var data = localStorage.getItem(USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function generateUserId() {
    return "GEO-" + Math.floor(1000 + Math.random() * 9000);
  }

  // --- Public API ---
  return {
    /**
     * Sign up a new user
     * @param {Object} data - { username, phone, customerType, loyaltyStatus, email, password, address }
     * @returns {Object} { success, message, user? }
     */
    signup: function (data) {
      if (!data.username || !data.email || !data.password) {
        return { success: false, message: "Username, email, and password are required." };
      }

      var users = getUsers();

      // Check for duplicate username
      for (var i = 0; i < users.length; i++) {
        if (users[i].username.toLowerCase() === data.username.toLowerCase()) {
          return { success: false, message: "Username already exists. Please choose another." };
        }
      }

      // Check for duplicate email
      for (var j = 0; j < users.length; j++) {
        if (users[j].email.toLowerCase() === data.email.toLowerCase()) {
          return { success: false, message: "Email already registered. Please login instead." };
        }
      }

      var newUser = {
        userId: generateUserId(),
        username: data.username,
        fullName: data.fullName || "",
        phone: data.phone || "",
        customerType: data.customerType || "consumer",
        loyaltyStatus: data.loyaltyStatus || "guest",
        loyaltyTier: "",
        email: data.email,
        password: data.password,
        address: data.address || "",
        city: data.city || "",
        country: data.country || "US",
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      saveUsers(users);

      return { success: true, message: "Signup successful! Please login.", user: newUser };
    },

    /**
     * Login a user
     * @param {string} username
     * @param {string} password
     * @returns {Object} { success, message, user? }
     */
    login: function (username, password) {
      if (!username || !password) {
        return { success: false, message: "Username and password are required." };
      }

      var users = getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].username.toLowerCase() === username.toLowerCase() && users[i].password === password) {
          // Store session (without password)
          var sessionUser = {
            userId: users[i].userId,
            username: users[i].username,
            phone: users[i].phone,
            customerType: users[i].customerType,
            loyaltyStatus: users[i].loyaltyStatus,
            loyaltyTier: users[i].loyaltyTier,
            email: users[i].email,
            address: users[i].address,
            country: users[i].country
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
          return { success: true, message: "Login successful!", user: sessionUser };
        }
      }

      return { success: false, message: "Invalid username or password." };
    },

    /**
     * Logout
     */
    logout: function () {
      localStorage.removeItem(SESSION_KEY);
    },

    /**
     * Get current logged-in user
     * @returns {Object|null}
     */
    getLoggedInUser: function () {
      try {
        var data = localStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        return null;
      }
    },

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn: function () {
      return this.getLoggedInUser() !== null;
    },

    /**
     * Get user data for adobeDataLayer
     * @returns {Object}
     */
    getUserDataLayer: function () {
      var user = this.getLoggedInUser();
      if (user) {
        return {
          userId: user.userId,
          loginStatus: "loggedin",
          customerType: user.customerType || "consumer",
          loyaltyStatus: user.loyaltyStatus || "guest",
          loyaltyTier: user.loyaltyTier || "",
          country: user.country || "US"
        };
      }
      return {
        userId: "",
        loginStatus: "loggedOut",
        customerType: "consumer",
        loyaltyStatus: "guest",
        loyaltyTier: "",
        country: "US"
      };
    },

    /**
     * Get all registered users (for debug/admin)
     */
    getAllUsers: function () {
      return getUsers();
    }
  };
})();

/* ============================================
   Auto-render logged-in username in header
   Runs on every page after DOM is ready
   ============================================ */
(function () {
  function renderAuthHeader() {
    var checkoutDivs = document.querySelectorAll('.checkout');
    if (!checkoutDivs.length) return;

    var user = GeoAuth.getLoggedInUser();

    for (var i = 0; i < checkoutDivs.length; i++) {
      var div = checkoutDivs[i];

      // Remove existing login/signup/logout links
      var links = div.querySelectorAll('a');
      for (var j = links.length - 1; j >= 0; j--) {
        var href = links[j].getAttribute('href') || '';
        if (href.indexOf('login.html') !== -1 || href.indexOf('signup.html') !== -1) {
          div.removeChild(links[j]);
        }
      }

      // Remove any existing auth-user span
      var existing = div.querySelector('.auth-user');
      if (existing) div.removeChild(existing);

      if (user) {
        // Show username + logout
        var span = document.createElement('span');
        span.className = 'auth-user';
        span.style.cssText = 'font:bold 12px Helvetica,Arial; color:#F05A28; padding:0 0 0 20px;';
        span.innerHTML = 'Hi, ' + user.username + ' | <a href="#" class="auth-logout" style="color:#4D4D4D; font:bold 12px Helvetica,Arial; text-decoration:none;">logout</a>';
        div.appendChild(span);

        // Bind logout
        var logoutLink = span.querySelector('.auth-logout');
        logoutLink.addEventListener('click', function (e) {
          e.preventDefault();
          GeoAuth.logout();
          window.location.reload();
        });
      } else {
        // Show login + signup links
        // Determine relative path
        var path = window.location.pathname;
        var prefix = '';
        if (path.indexOf('/activewear/') !== -1 || path.indexOf('/fineapparel/') !== -1) {
          prefix = '../../';
        } else if (path.indexOf('/checkout/') !== -1 || path.indexOf('/company/') !== -1 ||
                   path.indexOf('/search/') !== -1 || path.indexOf('/men/') !== -1 ||
                   path.indexOf('/women/') !== -1) {
          prefix = '../';
        }

        var loginLink = document.createElement('a');
        loginLink.href = prefix + 'login.html';
        loginLink.textContent = 'login';
        loginLink.style.cssText = 'font:bold 12px Helvetica,Arial; color:#4D4D4D; padding:0 0 0 20px; text-decoration:none;';

        var signupLink = document.createElement('a');
        signupLink.href = prefix + 'signup.html';
        signupLink.textContent = 'sign up';
        signupLink.style.cssText = 'font:bold 12px Helvetica,Arial; color:#4D4D4D; padding:0 0 0 20px; text-decoration:none;';

        div.appendChild(loginLink);
        div.appendChild(signupLink);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAuthHeader);
  } else {
    renderAuthHeader();
  }
})();

/* ============================================
   Console log all adobeDataLayer events
   Intercepts push to log every event
   ============================================ */
(function () {
  window.adobeDataLayer = window.adobeDataLayer || [];
  var originalPush = Array.prototype.push;
  window.adobeDataLayer.push = function () {
    for (var i = 0; i < arguments.length; i++) {
      var obj = arguments[i];
      if (obj && obj.event) {
        console.log('%c[adobeDataLayer] ' + obj.event + ' %c' + JSON.stringify(obj, null, 2), 'color: #F05A28; font-weight: bold;', 'color: #333; font-weight: normal;');
      }
    }
    return originalPush.apply(this, arguments);
  };
})();
