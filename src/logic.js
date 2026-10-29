export const DEFAULT_EXPIRY_HOURS = 24;

const makeId = (prefix) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

const cloneState = (state) => ({
  foods: state.foods.map((food) => ({ ...food })),
  requests: state.requests.map((request) => ({ ...request })),
});

const requireText = (value, label) => {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
};

const requireQuantity = (value, label = "Quantity") => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100) {
    throw new Error(`${label} must be a number greater than 0 and no more than 100%.`);
  }
  return quantity;
};

const requireFood = (state, foodId) => {
  const food = state.foods.find((item) => item.id === foodId);
  if (!food) throw new Error("That food item could not be found.");
  return food;
};

export function createInitialState() {
  const pizzaId = "food-pizza-sample";
  const cheeseId = "food-cheese-sample";
  const requests = [
    {
      id: "request-pizza-alex-sample",
      foodId: pizzaId,
      foodName: "Friday pizza",
      requester: "Alex",
      amount: 25,
      status: "pending",
      createdAt: "2026-10-28T18:00:00.000Z",
      approvedAt: null,
      note: "",
    },
    {
      id: "request-pizza-sam-sample",
      foodId: pizzaId,
      foodName: "Friday pizza",
      requester: "Sam",
      amount: 25,
      status: "pending",
      createdAt: "2026-10-28T18:05:00.000Z",
      approvedAt: null,
      note: "",
    },
  ];

  return {
    foods: [
      { id: pizzaId, name: "Friday pizza", owner: "Jamie", quantity: 25, spoiled: false },
      { id: cheeseId, name: "Cheddar", owner: "Alex", quantity: 75, spoiled: false },
      { id: "food-cheese-roommate-sample", name: "Cheddar", owner: "Sam", quantity: 40, spoiled: false },
    ],
    requests,
  };
}

export function addFood(state, { name, owner, quantity }, id = makeId("food")) {
  const next = cloneState(state);
  next.foods.push({
    id,
    name: requireText(name, "Food name"),
    owner: requireText(owner, "Owner"),
    quantity: requireQuantity(quantity),
    spoiled: false,
  });
  return next;
}

export function requestPortion(
  state,
  { foodId, requester, amount },
  { id = makeId("request"), now = new Date().toISOString() } = {},
) {
  const food = requireFood(state, foodId);
  if (food.spoiled) throw new Error("This food has been marked as spoiled.");
  const next = cloneState(state);
  next.requests.push({
    id,
    foodId,
    foodName: food.name,
    requester: requireText(requester, "Roommate name"),
    amount: requireQuantity(amount, "Portion"),
    status: "pending",
    createdAt: now,
    approvedAt: null,
    note: "",
  });
  return next;
}

export function approveRequest(state, requestId, now = new Date().toISOString()) {
  const next = cloneState(state);
  const request = next.requests.find((item) => item.id === requestId);
  if (!request) throw new Error("That request could not be found.");
  if (request.status !== "pending") throw new Error("Only pending requests can be approved.");
  const food = requireFood(next, request.foodId);
  if (food.spoiled) throw new Error("This food has been marked as spoiled.");
  if (food.quantity < request.amount) {
    throw new Error(`Not enough food is available. Only ${food.quantity}% is unreserved.`);
  }

  food.quantity -= request.amount;
  request.status = "approved";
  request.approvedAt = now;
  request.note = "";
  return next;
}

export function rejectRequest(state, requestId) {
  const next = cloneState(state);
  const request = next.requests.find((item) => item.id === requestId);
  if (!request) throw new Error("That request could not be found.");
  if (request.status !== "pending") throw new Error("Only pending requests can be rejected.");
  request.status = "rejected";
  return next;
}

export function consumeRequest(state, requestId) {
  const next = cloneState(state);
  const request = next.requests.find((item) => item.id === requestId);
  if (!request) throw new Error("That request could not be found.");
  if (request.status !== "approved") throw new Error("Only approved portions can be marked consumed.");
  request.status = "consumed";
  return next;
}

export function expireApprovals(state, expiryHours, now = new Date().toISOString()) {
  const hours = Number(expiryHours);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 8760) {
    throw new Error("Expiry time must be greater than 0 and no more than 8,760 hours.");
  }
  const currentTime = new Date(now).getTime();
  if (!Number.isFinite(currentTime)) throw new Error("The current time is invalid.");

  const next = cloneState(state);
  for (const request of next.requests) {
    if (request.status !== "approved" || !request.approvedAt) continue;
    const approvalTime = new Date(request.approvedAt).getTime();
    if (!Number.isFinite(approvalTime)) continue;
    if (currentTime - approvalTime < hours * 60 * 60 * 1000) continue;

    request.status = "expired";
    const food = next.foods.find((item) => item.id === request.foodId);
    if (food && !food.spoiled) food.quantity = Math.min(100, food.quantity + request.amount);
  }
  return next;
}

export function correctInventory(state, foodId, actualQuantity) {
  const correctedAmount = Number(actualQuantity);
  if (!Number.isFinite(correctedAmount) || correctedAmount < 0 || correctedAmount > 100) {
    throw new Error("Actual quantity must be a number from 0% to 100%.");
  }

  const next = cloneState(state);
  const food = requireFood(next, foodId);
  if (food.spoiled) throw new Error("Spoiled food cannot have its inventory corrected.");

  const active = next.requests
    .filter((request) => request.foodId === foodId && request.status === "approved")
    .sort((a, b) => new Date(a.approvedAt) - new Date(b.approvedAt));
  let reserved = active.reduce((sum, request) => sum + request.amount, 0);

  for (const request of active.reverse()) {
    if (reserved <= correctedAmount) break;
    request.status = "rejected";
    request.note = "Reservation cancelled because the inventory was corrected.";
    reserved -= request.amount;
  }
  food.quantity = correctedAmount - reserved;
  return next;
}

export function markFoodSpoiled(state, foodId) {
  const next = cloneState(state);
  const food = requireFood(next, foodId);
  if (food.spoiled) throw new Error("This food is already marked as spoiled.");
  food.spoiled = true;
  food.quantity = 0;
  for (const request of next.requests) {
    if (request.foodId !== foodId || !["pending", "approved"].includes(request.status)) continue;
    request.status = "rejected";
    request.note = "Request cancelled because the food was marked as spoiled.";
  }
  return next;
}
