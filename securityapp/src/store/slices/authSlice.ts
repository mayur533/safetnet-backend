import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SecurityOfficer } from '../../types/user.types';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  officer: SecurityOfficer | null;
  error: string | null;
  shouldNavigateToSOS?: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  token: null,
  officer: null,
  error: null,
  shouldNavigateToSOS: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ token: string; officer: SecurityOfficer; navigateToSOS?: boolean }>) => {
      state.isAuthenticated = true;
      state.isLoading = false;
      state.token = action.payload.token;
      state.officer = action.payload.officer;
      state.error = null;
      state.shouldNavigateToSOS = action.payload.navigateToSOS || false;
    },
    clearNavigateToSOS: (state) => {
      state.shouldNavigateToSOS = false;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.officer = null;
      state.error = null;
    },
    updateOfficerProfile: (state, action: PayloadAction<Partial<SecurityOfficer>>) => {
      if (state.officer) {
        state.officer = { ...state.officer, ...action.payload };
      }
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateOfficerProfile, clearNavigateToSOS } = authSlice.actions;
export default authSlice.reducer;