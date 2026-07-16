(() => {
  'use strict';

  const config = window.__LEXIFY_PUBLIC_CONFIG__;
  const signInForm = document.getElementById('deletion-sign-in');
  const emailInput = document.getElementById('deletion-email');
  const passwordInput = document.getElementById('deletion-password');
  const signInButton = document.getElementById('deletion-sign-in-button');
  const confirmPanel = document.getElementById('deletion-confirm-panel');
  const accountLabel = document.getElementById('deletion-account');
  const confirmForm = document.getElementById('deletion-confirm');
  const confirmationInput = document.getElementById('deletion-confirmation');
  const confirmButton = document.getElementById('deletion-confirm-button');
  const status = document.getElementById('deletion-status');
  let accessToken = '';

  const setStatus = (message, kind = '') => {
    status.textContent = message;
    status.className = `status-message${kind ? ` status-${kind}` : ''}`;
  };

  const setBusy = (button, busy, busyLabel, idleLabel) => {
    button.disabled = busy;
    button.textContent = busy ? busyLabel : idleLabel;
  };

  const projectUrl = typeof config?.supabaseUrl === 'string'
    ? config.supabaseUrl.replace(/\/$/, '')
    : '';
  const publishableKey = typeof config?.supabasePublishableKey === 'string'
    ? config.supabasePublishableKey
    : '';
  const hasValidConfig = /^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(projectUrl)
    && (publishableKey.startsWith('sb_publishable_') || publishableKey.startsWith('eyJ'));

  if (!hasValidConfig) {
    signInButton.disabled = true;
    setStatus('Web deletion is temporarily unavailable. You can still delete immediately in the Lexify app.', 'error');
    return;
  }

  const request = async (path, body, token = '') => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    try {
      const headers = {
        apikey: publishableKey,
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${projectUrl}${path}`, {
        method: 'POST',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
        headers,
        body: JSON.stringify(body),
      });

      return response;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  confirmationInput.addEventListener('input', () => {
    confirmButton.disabled = confirmationInput.value !== 'DELETE' || !accessToken;
  });

  signInForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');
    accessToken = '';
    confirmPanel.hidden = true;

    if (!emailInput.validity.valid || !passwordInput.value) {
      setStatus('Enter a valid account email and password.', 'error');
      return;
    }

    setBusy(signInButton, true, 'Verifying...', 'Verify account');

    try {
      const response = await request('/auth/v1/token?grant_type=password', {
        email: emailInput.value.trim(),
        password: passwordInput.value,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || typeof payload.access_token !== 'string') {
        throw new Error('sign_in_failed');
      }

      accessToken = payload.access_token;
      passwordInput.value = '';
      accountLabel.textContent = `Verified account: ${payload.user?.email ?? emailInput.value.trim()}`;
      confirmPanel.hidden = false;
      confirmationInput.value = '';
      confirmButton.disabled = true;
      setStatus('Account verified. Continue only if you want to permanently delete it.', 'success');
      confirmationInput.focus();
    } catch {
      passwordInput.value = '';
      setStatus('Account verification failed. Check your credentials and try again.', 'error');
    } finally {
      setBusy(signInButton, false, 'Verifying...', 'Verify account');
    }
  });

  confirmForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!accessToken || confirmationInput.value !== 'DELETE') {
      setStatus('Type DELETE exactly before continuing.', 'error');
      return;
    }

    setBusy(confirmButton, true, 'Deleting...', 'Permanently delete account');

    try {
      const response = await request('/rest/v1/rpc/delete_my_account', {
        p_confirmation: 'DELETE',
      }, accessToken);

      if (!response.ok) {
        throw new Error('deletion_failed');
      }

      accessToken = '';
      emailInput.value = '';
      confirmationInput.value = '';
      signInForm.hidden = true;
      confirmPanel.hidden = true;
      setStatus('Your Lexify account and associated live-service data were permanently deleted.', 'success');
    } catch {
      accessToken = '';
      confirmPanel.hidden = true;
      setStatus('Deletion could not be completed. Sign in again and retry, or delete from the Lexify app.', 'error');
    } finally {
      setBusy(confirmButton, false, 'Deleting...', 'Permanently delete account');
    }
  });
})();
