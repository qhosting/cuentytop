import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice';
import cartSlice from './cartSlice';
import servicesSlice from './servicesSlice';
import ordersSlice from './ordersSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    cart: cartSlice,
    services: servicesSlice,
    orders: ordersSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

// Selectors
export const selectAuth = (state) => state.auth;
export const selectCart = (state) => state.cart;
export const selectServices = (state) => state.services;
export const selectOrders = (state) => state.orders;

export default store;