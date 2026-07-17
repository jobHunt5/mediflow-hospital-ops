import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../src/Login.jsx';

async function goToLinenWorkerForm(user) {
  render(<Login onLogin={vi.fn()} />);
  await user.click(screen.getByText('Worker'));
  await user.click(screen.getByText('Linen & Environmental Services'));
}

describe('Login', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('walks from role selection to department selection to the credentials form', async () => {
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByText('Sign in')).toBeInTheDocument();

    await user.click(screen.getByText('Worker'));
    expect(screen.getByText('Which team?')).toBeInTheDocument();

    await user.click(screen.getByText('Linen & Environmental Services'));
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('submits the entered credentials and logs in on success', async () => {
    const onLogin = vi.fn();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'worker', department: 'linen', workerId: 'w1', name: 'Test Worker', token: 'tok123' }),
    });

    render(<Login onLogin={onLogin} />);
    await user.click(screen.getByText('Worker'));
    await user.click(screen.getByText('Linen & Environmental Services'));
    await user.type(screen.getByPlaceholderText('Username'), 'night-linen-assistant');
    await user.type(screen.getByPlaceholderText('Password'), 'MediFlow2026!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith({
      role: 'worker', department: 'linen', workerId: 'w1', name: 'Test Worker', token: 'tok123',
    }));

    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ username: 'night-linen-assistant', password: 'MediFlow2026!' }),
    }));
  });

  it('shows the server error message on failed login', async () => {
    fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Invalid username or password' }) });

    await goToLinenWorkerForm(user);
    await user.type(screen.getByPlaceholderText('Username'), 'wrong-user');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
  });

  it('flags a role/department mismatch instead of logging in', async () => {
    // Server accepts the credentials, but they belong to an admin account, not a worker.
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'admin', department: 'linen', workerId: null, name: null, token: 'tok123' }),
    });
    const onLogin = vi.fn();

    render(<Login onLogin={onLogin} />);
    await user.click(screen.getByText('Worker'));
    await user.click(screen.getByText('Linen & Environmental Services'));
    await user.type(screen.getByPlaceholderText('Username'), 'linen-admin');
    await user.type(screen.getByPlaceholderText('Password'), 'MediFlow2026!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText(/go back and pick the right team/i)).toBeInTheDocument());
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('shows a connection error when the request throws', async () => {
    fetch.mockRejectedValueOnce(new Error('network down'));
    await goToLinenWorkerForm(user);
    await user.type(screen.getByPlaceholderText('Username'), 'someone');
    await user.type(screen.getByPlaceholderText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument();
  });

  it('the back button returns from the credentials form to department selection', async () => {
    await goToLinenWorkerForm(user);
    fireEvent.click(screen.getByText('← Back'));
    expect(screen.getByText('Which team?')).toBeInTheDocument();
  });
});
