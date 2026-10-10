/* ============================================================
   ACCESS GATE
   A simple shared access code, not a real login. Anyone who
   knows this code can use the app as the owner. Change
   ACCESS_CODE below to whatever you want, then share that code
   with whoever you want to let in (or just remember it
   yourself). Once entered correctly on a browser, it is
   remembered there so it is not asked again on that device.

   Honest limitation: this check happens in the browser, so it
   keeps casual visitors out of the interface, but it is not a
   real security boundary. See the note in supabase-schema.sql
   for the full picture on what this does and does not protect.
   ============================================================ */

const ACCESS_CODE = 'allyisthebest'; // <-- change this to your own code
const ACCESS_GRANTED_KEY = 'allyTripsAccessGranted';

function isAccessGranted() {
  return localStorage.getItem(ACCESS_GRANTED_KEY) === 'true';
}

function showAccessGate() {
  document.documentElement.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id = 'accessGateOverlay';
  overlay.innerHTML = `
    <style>
      #accessGateOverlay {
        position: fixed;
        inset: 0;
        background: var(--sky, #bfe3f0);
        z-index: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        font-family: 'Quicksand', sans-serif;
      }
      #accessGateBox {
        background: var(--cream, #fdf6ec);
        border: 4px solid var(--ink, #2e2a35);
        box-shadow: 6px 6px 0 var(--shadow, #d8c9b0);
        padding: 32px;
        max-width: 360px;
        width: 100%;
        text-align: center;
      }
      #accessGateBox h2 {
        font-family: 'Press Start 2P', cursive;
        font-size: 15px;
        margin: 0 0 16px 0;
        color: var(--coral-deep, #e87a60);
      }
      #accessGateBox p {
        font-size: 13px;
        color: var(--ink-soft, #5c5663);
        margin-bottom: 16px;
      }
      #accessGateInput {
        width: 100%;
        padding: 11px;
        border: 2px solid var(--ink, #2e2a35);
        font-size: 14px;
        margin-bottom: 14px;
        box-sizing: border-box;
        font-family: 'Quicksand', sans-serif;
      }
      #accessGateSubmit {
        font-family: 'Press Start 2P', cursive;
        font-size: 11px;
        padding: 13px 18px;
        border: 3px solid var(--ink, #2e2a35);
        background: var(--coral, #f2957e);
        color: var(--cream, #fdf6ec);
        cursor: pointer;
        width: 100%;
      }
      #accessGateSubmit:hover { background: var(--coral-deep, #e87a60); }
      #accessGateError {
        color: #c9433f;
        font-size: 12px;
        margin-top: 10px;
        min-height: 16px;
      }
    </style>
    <div id="accessGateBox">
      <h2>🔒 ALLY TRIPS</h2>
      <p>Enter the access code to continue</p>
      <input type="password" id="accessGateInput" placeholder="Access code" autofocus>
      <button id="accessGateSubmit">UNLOCK</button>
      <div id="accessGateError"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const submit = () => {
    const val = document.getElementById('accessGateInput').value;
    if (val === ACCESS_CODE) {
      localStorage.setItem(ACCESS_GRANTED_KEY, 'true');
      overlay.remove();
      document.documentElement.style.overflow = '';
    } else {
      document.getElementById('accessGateError').textContent = 'Incorrect code, try again';
      document.getElementById('accessGateInput').value = '';
      document.getElementById('accessGateInput').focus();
    }
  };

  document.getElementById('accessGateSubmit').addEventListener('click', submit);
  document.getElementById('accessGateInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
}

if (!isAccessGranted()) {
  showAccessGate();
}
