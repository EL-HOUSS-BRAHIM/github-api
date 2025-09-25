import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from '../src/components/SearchBar.jsx';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

describe('SearchBar component', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('validates username input and guides submission flow', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByLabelText(/GitHub username/i);
    const submitButton = screen.getByRole('button', { name: /generate report/i });

    expect(submitButton).toBeDisabled();

    await user.click(input);
    await user.tab();

    const alertMessage = await screen.findByRole('alert');
    expect(alertMessage).toHaveTextContent('Enter a GitHub username to continue.');

    await user.type(input, ' octocat ');

    expect(screen.queryByRole('alert')).toBeNull();
    expect(submitButton).not.toBeDisabled();

    await user.click(submitButton);

    expect(navigateMock).toHaveBeenCalledWith('/user/octocat');
    const statusMessage = await screen.findByRole('status');
    expect(statusMessage).toHaveTextContent('Loading profile for octocat...');
  });

  it('prevents navigation when only whitespace is submitted', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const input = screen.getByLabelText(/GitHub username/i);
    const submitButton = screen.getByRole('button', { name: /generate report/i });

    await user.type(input, '   ');
    await user.click(submitButton);

    expect(navigateMock).not.toHaveBeenCalled();
    const alertMessage = await screen.findByRole('alert');
    expect(alertMessage).toHaveTextContent('Enter a GitHub username to continue.');
  });
});

