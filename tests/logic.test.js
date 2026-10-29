import test from "node:test";
import assert from "node:assert/strict";
import {
  addFood,
  approveRequest,
  consumeRequest,
  correctInventory,
  expireApprovals,
  markFoodSpoiled,
  requestPortion,
} from "../src/logic.js";

function setup(quantity = 25) {
  const state = {
    foods: [{ id: "pizza-one", name: "Pizza", owner: "Jamie", quantity, spoiled: false }],
    requests: [],
  };
  const alex = requestPortion(state, { foodId: "pizza-one", requester: "Alex", amount: 25 }, { id: "alex", now: "2026-10-29T00:00:00.000Z" });
  return requestPortion(alex, { foodId: "pizza-one", requester: "Sam", amount: 25 }, { id: "sam", now: "2026-10-29T00:01:00.000Z" });
}

test("only one 25% request can reserve the last 25% of pizza", () => {
  const state = setup();
  const approved = approveRequest(state, "alex", "2026-10-29T00:10:00.000Z");
  assert.equal(approved.foods[0].quantity, 0);
  assert.equal(approved.requests.find((request) => request.id === "alex").status, "approved");
  assert.throws(() => approveRequest(approved, "sam"), /Not enough food/);
  assert.equal(approved.foods[0].quantity, 0);
  assert.equal(state.foods[0].quantity, 25);
});

test("expired approval releases its reservation; consumed portion does not", () => {
  const state = setup();
  const approved = approveRequest(state, "alex", "2026-10-29T00:00:00.000Z");
  const expired = expireApprovals(approved, 1, "2026-10-29T01:00:00.000Z");
  assert.equal(expired.requests[0].status, "expired");
  assert.equal(expired.foods[0].quantity, 25);
  const consumed = consumeRequest(approved, "alex");
  const afterExpiry = expireApprovals(consumed, 1, "2026-10-29T02:00:00.000Z");
  assert.equal(afterExpiry.requests[0].status, "consumed");
  assert.equal(afterExpiry.foods[0].quantity, 0);
});

test("spoiling a food removes available quantity and cancels outstanding requests", () => {
  const state = setup(80);
  const approved = approveRequest(state, "alex", "2026-10-29T00:00:00.000Z");
  const spoiled = markFoodSpoiled(approved, "pizza-one");
  assert.equal(spoiled.foods[0].quantity, 0);
  assert.equal(spoiled.foods[0].spoiled, true);
  assert.equal(spoiled.requests.find((request) => request.id === "alex").status, "rejected");
  assert.equal(spoiled.requests.find((request) => request.id === "sam").status, "rejected");
});

test("same-named foods stay independent through unique IDs", () => {
  const initial = { foods: [{ id: "cheese-a", name: "Cheddar", owner: "Alex", quantity: 60, spoiled: false }], requests: [] };
  const next = addFood(initial, { name: "Cheddar", owner: "Sam", quantity: 40 }, "cheese-b");
  const requested = requestPortion(next, { foodId: "cheese-b", requester: "Lee", amount: 15 }, { id: "cheese-request" });
  const approved = approveRequest(requested, "cheese-request");
  assert.equal(approved.foods.find((food) => food.id === "cheese-a").quantity, 60);
  assert.equal(approved.foods.find((food) => food.id === "cheese-b").quantity, 25);
});

test("inventory correction honors oldest reservations and cancels newer ones if required", () => {
  const state = setup(100);
  const alexApproved = approveRequest(state, "alex", "2026-10-29T00:00:00.000Z");
  const samApproved = approveRequest(alexApproved, "sam", "2026-10-29T00:01:00.000Z");
  const corrected = correctInventory(samApproved, "pizza-one", 30);
  assert.equal(corrected.requests.find((request) => request.id === "alex").status, "approved");
  assert.equal(corrected.requests.find((request) => request.id === "sam").status, "rejected");
  assert.equal(corrected.foods[0].quantity, 5);
  const reduced = correctInventory(samApproved, "pizza-one", 10);
  assert.equal(reduced.requests.find((request) => request.id === "alex").status, "rejected");
  assert.equal(reduced.foods[0].quantity, 10);
});

test("inventory and portion inputs are validated", () => {
  const state = setup();
  assert.throws(() => correctInventory(state, "pizza-one", -1), /from 0% to 100%/);
  assert.throws(() => correctInventory(state, "pizza-one", 101), /from 0% to 100%/);
  assert.throws(() => requestPortion(state, { foodId: "pizza-one", requester: "Pat", amount: 0 }));
  assert.throws(() => addFood(state, { name: "Milk", owner: "Pat", quantity: "lots" }));
});
