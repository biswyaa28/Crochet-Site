# 🔧 Google Sign-In Not Working - Complete Fix Guide

## Quick Fix Checklist

Run through these steps to fix Google Sign-In:

### ✅ Step 1: Run Diagnostic Tool

1. Open your terminal and run:
   ```bash
   cd "/Users/biswyaa/Documents/Crochet Site"
   python3 -m http.server 8080
   ```

2. Open in browser: http://localhost:8080/diagnose-google-signin.html

3. The diagnostic tool will tell you exactly what's wrong!

---

### ✅ Step 2: Enable Google Sign-In in Firebase Console

This is the **#1 reason** Google Sign-In fails!

1. Go to: https://console.firebase.google.com/project/sutrakala-aa44b/authentication/providers

2. Click on **"Google"** provider

3. Toggle **"Enable"** switch to ON

4. Add your **project support email** (e.g., your Gmail address)

5. Click **"Save"**

**Screenshot:** The toggle should be blue/green when enabled.

---

### ✅ Step 3: Add Authorized Domains

1. In Firebase Console, go to: **Authentication → Settings** tab

2. Scroll down to **"Authorized domains"** section

3. Verify these domains are listed:
   - ✅ `localhost` (should be there by default)
   - ✅ `sutrakala-aa44b.firebaseapp.com` (Firebase hosting domain)
   - ✅ `sutrakala.vercel.app` (Vercel deployment)
   - ✅ Your custom domain (if any, e.g., `sutrakala.com`)

4. If any are missing, click **"Add domain"** and add them

---

### ✅ Step 4: Configure OAuth in Google Cloud Console

Sometimes Firebase's OAuth setup needs manual configuration:

1. Go to: https://console.cloud.google.com/apis/credentials?project=sutrakala-aa44b

2. Find your **"OAuth 2.0 Client IDs"** (look for "Web client (auto created by Google Service)")

3. Click on it to edit

4. Under **"Authorized JavaScript origins"**, add:
   ```
   http://localhost:8080
   http://127.0.0.1:8080
   http://localhost:5500
   https://sutrakala-aa44b.firebaseapp.com
   ```

5. Under **"Authorized redirect URIs"**, add:
   ```
   http://localhost:8080/__/auth/handler
   http://127.0.0.1:8080/__/auth/handler
   https://sutrakala-aa44b.firebaseapp.com/__/auth/handler
   ```

6. Click **"Save"**

**Note:** OAuth changes can take 5-10 minutes to propagate. Be patient!

---

### ✅ Step 5: Verify Firebase Configuration

Check that your Firebase credentials are correct:

1. Open: `js/firebase-config.js`

2. Verify these values match your Firebase project:
   ```javascript
   window.ENV = {
     FIREBASE_API_KEY: 'AIzaSy...',  // Should start with "AIzaSy"
     FIREBASE_AUTH_DOMAIN: 'sutrakala-aa44b.firebaseapp.com',  // Must end with .firebaseapp.com
     FIREBASE_PROJECT_ID: 'sutrakala-aa44b',  // Your project ID
     // ... other fields
   };
   ```

3. If anything looks wrong, get the correct values from:
   Firebase Console → Project Settings → General → Your apps → SDK setup and configuration

---

## Common Error Messages & Solutions

### Error: "auth/unauthorized-domain"

**Cause:** Your current domain is not in Firebase authorized domains.

**Fix:**
1. Check what domain you're on (e.g., `localhost:8080`, `127.0.0.1:8080`, etc.)
2. Go to Firebase Console → Authentication → Settings → Authorized domains
3. Add your domain to the list
4. Wait 1-2 minutes for changes to propagate

---

### Error: "auth/popup-blocked"

**Cause:** Your browser blocked the popup window.

**Fix:**
1. Check your browser's address bar for a popup blocker icon
2. Click it and allow popups from this site
3. Try signing in again

**Alternative:** Use redirect instead of popup:
- We can modify the code to use `signInWithRedirect` instead of `signInWithPopup`
- This opens Google login in the same tab instead of a popup

---

### Error: "auth/operation-not-allowed"

**Cause:** Google sign-in provider is not enabled in Firebase Console.

**Fix:**
1. Go to Firebase Console → Authentication → Sign-in method
2. Find "Google" in the list
3. Click on it and toggle "Enable" to ON
4. Save changes

---

### Error: "auth/popup-closed-by-user"

**Cause:** User closed the Google sign-in popup before completing.

**Fix:**
- This is normal user behavior, not a bug
- Make sure the popup opened successfully (not blocked)
- Try again and complete the sign-in process

---

### Error: "auth/network-request-failed"

**Cause:** No internet connection or Firebase services are down.

**Fix:**
1. Check your internet connection
2. Try accessing https://firebase.google.com in a new tab
3. If Firebase is up, check your firewall settings
4. Try disabling browser extensions (especially ad blockers)

---

### Error: "auth/invalid-api-key"

**Cause:** API key in `firebase-config.js` is wrong or missing.

**Fix:**
1. Go to Firebase Console → Project Settings → General
2. Find your Web App in "Your apps" section
3. Copy the `apiKey` value
4. Update it in `js/firebase-config.js`

---

## Testing After Fix

After making changes:

1. **Clear browser cache** (important!):
   - Chrome: Ctrl+Shift+Delete → Clear cached images and files
   - Firefox: Ctrl+Shift+Delete → Cached Web Content
   - Safari: Cmd+Option+E → Empty Caches

2. **Hard refresh** the page:
   - Windows/Linux: Ctrl+Shift+R
   - Mac: Cmd+Shift+R

3. **Open browser console** (F12) to check for errors

4. Try signing in with Google again

---

## Still Not Working?

### Option 1: Use Redirect Instead of Popup

Some browsers/environments don't like popups. Let's use redirect instead:

1. Open: `js/core/auth-helpers.js`

2. Find the `signInWithGoogle` function (around line 15)

3. Replace:
   ```javascript
   const result = await signInWithPopup(auth, provider);
   ```
   
   With:
   ```javascript
   await signInWithRedirect(auth, provider);
   return null; // Result will be available after redirect
   ```

4. Then modify `login-page.js` to handle redirect result

---

### Option 2: Check Browser Console

1. Open the page where Google Sign-In isn't working
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Click the Google Sign-In button
5. Look for red error messages
6. Copy the full error message and search for it online or contact support

---

### Option 3: Test in Incognito Mode

Browser extensions can interfere with authentication:

1. Open an incognito/private window (Ctrl+Shift+N in Chrome)
2. Navigate to your site
3. Try Google Sign-In
4. If it works, a browser extension was blocking it

---

### Option 4: Try Different Browser

Test in a different browser:
- If Chrome doesn't work, try Firefox or Safari
- If it works in another browser, the issue is browser-specific

---

## Firebase Console Quick Links

- **Project Overview:** https://console.firebase.google.com/project/sutrakala-aa44b/overview
- **Authentication Settings:** https://console.firebase.google.com/project/sutrakala-aa44b/authentication/providers
- **Authorized Domains:** https://console.firebase.google.com/project/sutrakala-aa44b/authentication/settings
- **Google Cloud OAuth:** https://console.cloud.google.com/apis/credentials?project=sutrakala-aa44b

---

## Advanced Debugging

Enable detailed Firebase logging:

1. Open browser console (F12)
2. Paste this code:
   ```javascript
   localStorage.setItem('firebase:debug', 'true');
   ```
3. Refresh the page
4. Try signing in again
5. You'll see detailed logs in console

---

## Contact Support

If nothing works, gather this info:

- [ ] Error message from console (exact text)
- [ ] Screenshot of the error
- [ ] What happens when you click "Sign in with Google"? (popup opens? nothing happens? error message?)
- [ ] Browser name and version
- [ ] Operating system
- [ ] Results from diagnostic tool (http://localhost:8080/diagnose-google-signin.html)

---

## Success Checklist

You'll know it's working when:

- ✅ Clicking "Sign in with Google" opens a popup
- ✅ Popup shows Google account selection screen
- ✅ After selecting account, popup closes automatically
- ✅ You see "Welcome back!" or success message
- ✅ Your avatar/email appears in the navbar
- ✅ Console shows: `[LoginPage] Google login successful: [your-uid]`

---

**Most Common Fix:** Enable Google sign-in provider in Firebase Console (Step 2 above) ☝️
