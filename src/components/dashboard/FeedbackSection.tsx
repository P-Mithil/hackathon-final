import React, { useState } from 'react';

const FeedbackSection: React.FC = () => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, we'll just log the feedback
    console.log('Feedback submitted:', feedback);
    setFeedback(''); // Clear the textarea after submission
  };

  return (
    <div className="feedback-section">
      <h3>Leave Your Feedback</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="feedback">Your Feedback:</label>
          <textarea
            id="feedback"
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            style={{ width: '100%', marginTop: '8px', padding: '8px' }}
          />
        </div>
        <button type="submit" style={{ marginTop: '8px', padding: '8px 16px' }}>
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

export default FeedbackSection;