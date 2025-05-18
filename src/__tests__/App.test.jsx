import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import io from 'socket.io-client';
import App from '../App';

jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  };
  return jest.fn(() => mockSocket);
});

describe('App Component', () => {
  test('показывает модальный режим при получении события, изменившего голосование', async () => {
    const mockSocket = io();
    render(<App />);

    await act(async () => {
      const voteChangedHandler = mockSocket.on.mock.calls.find(call => call[0] === 'vote-changed')[1];
      voteChangedHandler({ optionId: 1, votes: 8 });
    });

    await waitFor(() => {
      expect(screen.getByText('Vote Updated')).toBeInTheDocument();
    }, { timeout: 1000 });

    mockSocket.disconnect();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});