import { Modal } from "./Modal";

type GenerationProgressProps = {
  open: boolean;
  progress: number; // 0-100
  currentLanguage?: string;
  status?: string;
};

export function GenerationProgress({
  open,
  progress,
  currentLanguage,
  status,
}: GenerationProgressProps) {
  return (
    <Modal open={open} onClose={() => {}}>
      <div className="generation-progress-modal">
        <h2>⏳ Đang sinh tạo nội dung đa ngôn ngữ...</h2>

        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-percentage">{progress}%</div>
        </div>

        {currentLanguage && (
          <div className="current-language">
            <span className="language-badge">
              {currentLanguage.toUpperCase()}
            </span>
            <span className="processing-text">Đang xử lý...</span>
          </div>
        )}

        {status && <div className="status-message">{status}</div>}

        <div className="progress-hint">
          Quá trình này dịch và tạo audio.
          <br />
          Vui lòng đợi...
        </div>
      </div>

      <style>{`
        .generation-progress-modal {
          padding: 32px 24px;
          background: white;
          border-radius: 8px;
          max-width: 400px;
          text-align: center;
          margin: 0 auto;
        }

        .generation-progress-modal h2 {
          margin: 0 0 24px 0;
          font-size: 18px;
          color: #333;
        }

        .progress-container {
          position: relative;
          margin-bottom: 24px;
        }

        .progress-bar {
          height: 12px;
          background: #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4a90e2, #2c5aa0);
          transition: width 0.3s ease;
        }

        .progress-percentage {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-weight: 600;
          color: #333;
          font-size: 13px;
          background: white;
          padding: 0 4px;
        }

        .current-language {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .language-badge {
          background: #4a90e2;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 13px;
        }

        .processing-text {
          color: #666;
          font-size: 14px;
        }

        .status-message {
          color: #666;
          font-size: 14px;
          margin-bottom: 16px;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .progress-hint {
          color: #999;
          font-size: 13px;
          line-height: 1.5;
          margin-top: 24px;
        }
      `}</style>
    </Modal>
  );
}
