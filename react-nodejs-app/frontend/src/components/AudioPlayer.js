import React from 'react';
import './AudioPlayer.css';

const AudioPlayer = ({ audioBase64, audioFormat = 'mp3' }) => {
  if (!audioBase64) return null;

  const audioSrc = `data:audio/${audioFormat};base64,${audioBase64}`;

  return (
    <div className="audio-player-container fade-in">
      <div className="audio-player-label">
        <span className="audio-icon">🔊</span>
        <span>Audio Response</span>
      </div>
      <audio controls className="audio-player">
        <source src={audioSrc} type={`audio/${audioFormat}`} />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

export default AudioPlayer;
