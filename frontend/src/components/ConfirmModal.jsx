import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="card w-full max-w-sm p-6 animate-slide-up flex flex-col gap-4 text-center items-center" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-text font-bold text-lg">{title}</h2>
          <p className="text-muted text-sm mt-1">{message}</p>
        </div>
        <div className="flex gap-3 w-full mt-2">
          <button onClick={onCancel} className="btn-ghost flex-1 py-2">
            {cancelText}
          </button>
          <button onClick={onConfirm} className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium flex-1 py-2 transition-colors">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
