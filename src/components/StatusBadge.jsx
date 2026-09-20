export default function StatusBadge({ status }) {
  const map = {
    open: ['success', 'Open'],
    pending: ['warn', 'Pending'],
    accepted: ['success', 'Accepted'],
    declined: ['brand', 'Declined'],
    closed: ['', 'Closed'],
    filled: ['brand', 'Filled'],
  };
  const [kind, label] = map[status] || ['', status];
  return <span className={`badge ${kind}`}>{label}</span>;
}
