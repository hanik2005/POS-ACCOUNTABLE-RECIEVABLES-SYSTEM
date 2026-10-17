// Shared POS state. Modules cannot reassign imported variables,
// so everything lives on this one object (state.shift = ..., state.details = ...).
export const state = {
  products: [],
  customers: [],
  paymentMethods: [],
  details: [],
  customer: null,
  saleType: null,
  recallId: null,
  terminal: null,
  shift: null,
  selected: -1,
  suggestions: [],
  suggestIndex: 0,
  dialog: null,
};
