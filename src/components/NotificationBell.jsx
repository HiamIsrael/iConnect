import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () =>
      api.get('/notifications')
        .then((data) => active && setUnread(data.unread))
        .catch(() => {});
    load();
    const timer = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Link to="/notifications" className="btn ghost small" title="Notifications">
      🔔{unread > 0 && <span className="badge brand" style={{ marginLeft: 4 }}>{unread}</span>}
    </Link>
  );
}
