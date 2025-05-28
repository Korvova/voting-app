import React from 'react';
import './DisconnectModal.css';

function DisconnectModal({ isOpen, userName, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="disconnect-modal">
      <div className="disconnect-modal-content">
        <h2>
          <span className="modal-title-bold">Отключить пользователя </span>
          <span className="modal-title-normal">{userName}?</span>
        </h2>
        <div className="disconnect-modal-buttons">
          <button className="confirm-button" onClick={onConfirm}>
            Да
          </button>
          <button className="cancel-button" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

export default DisconnectModal;