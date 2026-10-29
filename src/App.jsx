import React, { useEffect, useMemo, useState } from "react";
import {
  addFood,
  approveRequest,
  consumeRequest,
  correctInventory,
  createInitialState,
  DEFAULT_EXPIRY_HOURS,
  expireApprovals,
  markFoodSpoiled,
  rejectRequest,
  requestPortion,
} from "./logic.js";

const STORAGE_KEY = "fridgepolice-state-v1";
const EXPIRY_KEY = "fridgepolice-expiry-v1";
const statuses = ["all", "pending", "approved", "rejected", "expired", "consumed"];

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialState();
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.foods) || !Array.isArray(parsed.requests)) return createInitialState();
    return parsed;
  } catch {
    return createInitialState();
  }
}

function loadExpiry() {
  const value = Number(localStorage.getItem(EXPIRY_KEY));
  return Number.isFinite(value) && value > 0 && value <= 8760 ? value : DEFAULT_EXPIRY_HOURS;
}

function amountLabel(amount) {
  return `${Number(amount)}%`;
}

function App() {
  const [state, setState] = useState(loadSavedState);
  const [expiryHours, setExpiryHours] = useState(loadExpiry);
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState(null);
  const [foodForm, setFoodForm] = useState({ name: "", owner: "", quantity: "" });
  const [requestForm, setRequestForm] = useState({ foodId: "", requester: "", amount: "" });
  const [corrections, setCorrections] = useState({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(EXPIRY_KEY, String(expiryHours));
    setState((current) => expireApprovals(current, expiryHours));
  }, [expiryHours]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((current) => expireApprovals(current, expiryHours));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [expiryHours]);

  const availableFoods = useMemo(() => state.foods.filter((food) => !food.spoiled), [state.foods]);
  const visibleRequests = useMemo(
    () => state.requests.filter((request) => filter === "all" || request.status === filter),
    [filter, state.requests],
  );
  const reservedByFood = useMemo(() => {
    const totals = new Map();
    for (const request of state.requests) {
      if (request.status === "approved") {
        totals.set(request.foodId, (totals.get(request.foodId) ?? 0) + request.amount);
      }
    }
    return totals;
  }, [state.requests]);

  function perform(action, successMessage) {
    try {
      setState(action(state));
      setNotice({ type: "success", text: successMessage });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  function submitFood(event) {
    event.preventDefault();
    try {
      setState(addFood(state, foodForm));
      setFoodForm({ name: "", owner: "", quantity: "" });
      setNotice({ type: "success", text: "Food added to the fridge." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  function submitRequest(event) {
    event.preventDefault();
    try {
      setState(requestPortion(state, requestForm));
      setRequestForm((current) => ({ ...current, amount: "" }));
      setNotice({ type: "success", text: "Portion request sent for approval." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  function submitCorrection(event, foodId) {
    event.preventDefault();
    try {
      setState(correctInventory(state, foodId, corrections[foodId]));
      setNotice({ type: "success", text: "Inventory corrected. Reservations were reconciled." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  const pendingCount = state.requests.filter((request) => request.status === "pending").length;
  const activeCount = state.requests.filter((request) => request.status === "approved").length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="FridgePolice home">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>Fridge<span className="brand-accent">Police</span></span>
        </a>
        <span className="topbar-note"><span className="live-dot" /> Your shared fridge, sorted</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">THE HOUSEHOLD FOOD DESK</p>
          <h1>Good food.<br /><span>Good roommates.</span></h1>
          <p className="hero-copy">Keep tabs on what’s in the fridge, ask before you dig in, and make sure every bite is accounted for.</p>
        </div>
        <div className="hero-stats" aria-label="Fridge summary">
          <div className="stat-card"><span className="stat-icon">◈</span><strong>{availableFoods.filter((food) => food.quantity > 0).length}</strong><span>items to share</span></div>
          <div className="stat-card"><span className="stat-icon coral">↗</span><strong>{pendingCount}</strong><span>need a decision</span></div>
          <div className="stat-card"><span className="stat-icon gold">◷</span><strong>{activeCount}</strong><span>portions reserved</span></div>
        </div>
      </section>

      {notice && (
        <div className={`notice ${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
          <span aria-hidden="true">{notice.type === "error" ? "!" : "✓"}</span>
          {notice.text}
          <button type="button" className="notice-dismiss" onClick={() => setNotice(null)} aria-label="Dismiss message">×</button>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="panel inventory-panel">
          <div className="section-heading">
            <div><p className="eyebrow">WHAT’S INSIDE</p><h2>Fridge inventory <span className="count-pill">{state.foods.length}</span></h2></div>
            <span className="section-icon">▤</span>
          </div>
          <div className="food-list">
            {state.foods.map((food) => {
              const reserved = reservedByFood.get(food.id) ?? 0;
              return (
                <article className={`food-card${food.spoiled ? " spoiled" : ""}`} key={food.id}>
                  <div className="food-avatar" aria-hidden="true">{food.name.trim().charAt(0).toUpperCase()}</div>
                  <div className="food-info">
                    <div className="food-name-row"><h3>{food.name}</h3>{food.spoiled && <span className="spoiled-tag">Spoiled</span>}</div>
                    <p>Owned by <strong>{food.owner}</strong></p>
                    <div className="quantity-row">
                      <div className="quantity-track"><span style={{ width: `${food.quantity}%` }} /></div>
                      <strong>{amountLabel(food.quantity)}</strong>
                    </div>
                    {!food.spoiled && <small>{reserved}% reserved · {food.quantity}% available</small>}
                  </div>
                  {!food.spoiled && (
                    <div className="food-actions">
                      <form className="correction-form" onSubmit={(event) => submitCorrection(event, food.id)}>
                        <label className="visually-hidden" htmlFor={`correct-${food.id}`}>Actual remaining quantity for {food.name} owned by {food.owner}</label>
                        <input id={`correct-${food.id}`} type="number" min="0" max="100" step="1" placeholder="Actual %" value={corrections[food.id] ?? ""} onChange={(event) => setCorrections((current) => ({ ...current, [food.id]: event.target.value }))} />
                        <button className="mini-button" type="submit">Correct</button>
                      </form>
                      <button className="text-button spoil-button" type="button" onClick={() => perform((current) => markFoodSpoiled(current, food.id), `${food.name} marked as spoiled.`)}>Mark spoiled</button>
                    </div>
                  )}
                </article>
              );
            })}
            {state.foods.length === 0 && <p className="empty-state">Nothing in the fridge yet. Add the first item below.</p>}
          </div>

          <div className="inline-forms">
            <form className="form-card" onSubmit={submitFood}>
              <div className="form-title"><span className="form-icon green">＋</span><div><h3>Add food</h3><p>Log something that’s up for grabs.</p></div></div>
              <label>Food name<input value={foodForm.name} onChange={(event) => setFoodForm({ ...foodForm, name: event.target.value })} placeholder="e.g. Hummus" /></label>
              <div className="form-row">
                <label>Owner<input value={foodForm.owner} onChange={(event) => setFoodForm({ ...foodForm, owner: event.target.value })} placeholder="Roommate" /></label>
                <label>Amount (%)<input type="number" min="0.1" max="100" step="0.1" value={foodForm.quantity} onChange={(event) => setFoodForm({ ...foodForm, quantity: event.target.value })} placeholder="100" /></label>
              </div>
              <button className="primary-button" type="submit">Add to fridge <span>→</span></button>
            </form>
            <form className="form-card request-card" onSubmit={submitRequest}>
              <div className="form-title"><span className="form-icon orange">↗</span><div><h3>Request a portion</h3><p>Ask a roommate before taking some.</p></div></div>
              <label>Food item<select value={requestForm.foodId} onChange={(event) => setRequestForm({ ...requestForm, foodId: event.target.value })}><option value="">Choose food…</option>{availableFoods.map((food) => <option value={food.id} key={food.id}>{food.name} · {food.owner} ({food.quantity}% available)</option>)}</select></label>
              <label>Your name<input value={requestForm.requester} onChange={(event) => setRequestForm({ ...requestForm, requester: event.target.value })} placeholder="Roommate" /></label>
              <label>Portion (%)<input type="number" min="0.1" max="100" step="0.1" value={requestForm.amount} onChange={(event) => setRequestForm({ ...requestForm, amount: event.target.value })} placeholder="25" /></label>
              <button className="secondary-button" type="submit">Send request <span>→</span></button>
            </form>
          </div>
        </section>

        <section className="panel requests-panel">
          <div className="section-heading requests-heading">
            <div><p className="eyebrow">THE HOUSEMATE QUEUE</p><h2>Portion requests</h2></div>
            <span className="section-icon request-section-icon">↗</span>
          </div>
          <p className="panel-intro">Every approval reserves its portion immediately, so no one gets more than what’s left.</p>
          <div className="filter-tabs" role="tablist" aria-label="Filter requests">
            {statuses.map((status) => <button key={status} type="button" role="tab" aria-selected={filter === status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}{status === "pending" && pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}</button>)}
          </div>
          <div className="request-list">
            {visibleRequests.map((request) => (
              <article className="request-card-item" key={request.id}>
                <div className={`request-avatar status-${request.status}`} aria-hidden="true">{request.requester.charAt(0).toUpperCase()}</div>
                <div className="request-main">
                  <div className="request-name-line"><h3>{request.requester}</h3><span className={`status-badge ${request.status}`}>{request.status}</span></div>
                  <p><strong>{amountLabel(request.amount)}</strong> of {request.foodName}</p>
                  <small>{request.status === "approved" ? `Approved ${new Date(request.approvedAt).toLocaleString()}` : `Requested ${new Date(request.createdAt).toLocaleString()}`}</small>
                  {request.note && <small className="request-note">{request.note}</small>}
                  {request.status === "pending" && <div className="decision-actions"><button type="button" className="approve-button" onClick={() => perform((current) => approveRequest(current, request.id), "Request approved and portion reserved.")}>Approve</button><button type="button" className="reject-button" onClick={() => perform((current) => rejectRequest(current, request.id), "Request rejected.")}>Reject</button></div>}
                  {request.status === "approved" && <button type="button" className="consume-button" onClick={() => perform((current) => consumeRequest(current, request.id), "Portion marked as consumed.")}>Mark consumed ✓</button>}
                </div>
              </article>
            ))}
            {visibleRequests.length === 0 && <div className="empty-state request-empty"><span>☷</span><p>No {filter === "all" ? "" : `${filter} `}requests yet.</p><small>New roommate requests will show up here.</small></div>}
          </div>
          <div className="expiry-setting">
            <div><strong>Approval expiry</strong><small>Unused portions return to the fridge.</small></div>
            <label><span className="visually-hidden">Approval expiry in hours</span><input aria-label="Approval expiry in hours" type="number" min="0.1" max="8760" step="0.5" value={expiryHours} onChange={(event) => {
              const value = Number(event.target.value);
              if (value > 0 && value <= 8760) setExpiryHours(value);
            }} /><span>hours</span></label>
          </div>
        </section>
      </div>
      <footer><span className="footer-mark">F</span><span>FridgePolice</span><span className="footer-separator">·</span><span>Less guessing, more sharing.</span></footer>
    </main>
  );
}

export default App;
