import './Toast.css';
import { useApp } from '../context/AppContext.jsx';

function Toast() {
  const { toast, hideToast } = useApp();

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type}`} data-testid="toast" role="alert">
      <div className="toast-content">
        {toast.message}
      </div>
      <button
        className="toast-close"
        onClick={hideToast}
        aria-label="Close notification"
        data-testid="toast-close"
      >
        ×
      </button>
    </div>
  );
}

export default Toast;
