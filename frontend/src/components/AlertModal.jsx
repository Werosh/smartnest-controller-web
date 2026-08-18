import { Info } from 'lucide-react';

export default function AlertModal({ title, message, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="card w-full max-w-sm p-6 animate-slide-up flex flex-col gap-4 text-center items-center" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-2">
          <Info className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 className="text-text font-bold text-lg">{title}</h2>
          <p className="text-muted text-sm mt-1">{message}</p>
        </div>
        <button onClick={onClose} className="btn-primary w-full py-2 mt-2">
          OK
        </button>
      </div>
    </div>
  );
}
