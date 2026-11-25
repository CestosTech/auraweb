import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import {afterEach, expect, test, vi} from 'vitest';
vi.mock('../firebase/config', () => ({auth: {currentUser: null}}));
vi.mock('firebase/auth', () => ({onAuthStateChanged: (_auth: unknown, callback: (user: null) => void) => { callback(null); return () => {}; }, signOut: vi.fn()}));
vi.mock('../utils/commandApi', () => ({command: vi.fn()}));
import {AuthProvider, useAuth} from '../context/AuthContext';
afterEach(cleanup);
test('real AuthProvider renders hooks with the React DOM renderer', () => {
  function Session() { const {user} = useAuth(); return <span>{user ? 'Signed in' : 'Guest session ready'}</span>; }
  render(<AuthProvider><Session /></AuthProvider>);
  expect(screen.getByText('Guest session ready')).toBeTruthy();
});
