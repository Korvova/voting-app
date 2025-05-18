import React from 'react';
import '../App.css';

function PollModal({ isOpen, question, options, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{question}</h2>
        <div className="options">
          {options.map((option, index) => (
            <button key={index} className="option-button">
              {option}
            </button>
          ))}
        </div>
        <button className="close-button" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
}

export default PollModal;