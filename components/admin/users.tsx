'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Search, Trash2, Users } from 'lucide-react';

type Account = {
  id: string;
  email: string;
  displayName: string;
  confirmedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};
type UserPage = {
  users: Account[];
  page: number;
  nextPage: number | null;
  lastPage: number;
  total: number;
};
type Queue = { total: number; events: { user_id: string; last_error: string | null }[] };

const emptyPage: UserPage = { users: [], page: 1, nextPage: null, lastPage: 1, total: 0 };

export function AdminUsers() {
  const [data, setData] = useState<UserPage>(emptyPage),
    [queue, setQueue] = useState<Queue>({ total: 0, events: [] }),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(''),
    [loading, setLoading] = useState(true),
    [retrying, setRetrying] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [target, setTarget] = useState<Account | null>(null),
    [confirmation, setConfirmation] = useState('');

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const [usersResponse, queueResponse] = await Promise.all([
          fetch(`/api/admin/users?page=${page}`, { cache: 'no-store', signal }),
          fetch('/api/admin/signup-notifications', { cache: 'no-store', signal }),
        ]);
        const [usersData, queueData] = await Promise.all([
          usersResponse.json(),
          queueResponse.json(),
        ]);
        if (!usersResponse.ok) throw new Error(usersData.error);
        if (!queueResponse.ok) throw new Error(queueData.error);
        setData(usersData);
        setQueue(queueData);
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError')
          setError(loadError instanceof Error ? loadError.message : 'Account data could not load.');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data.users;
    return data.users.filter(
      (account) =>
        account.email.toLowerCase().includes(term) ||
        account.displayName.toLowerCase().includes(term),
    );
  }, [data.users, query]);
  const confirmed = data.users.filter((account) => account.confirmedAt).length;

  async function retryNotifications() {
    setRetrying(true);
    setError('');
    try {
      const response = await fetch('/api/admin/signup-notifications', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(
        `${result.sent} notification${result.sent === 1 ? '' : 's'} sent${
          result.failed ? `; ${result.failed} still need attention` : ''
        }.`,
      );
      await load();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Notifications could not retry.');
    } finally {
      setRetrying(false);
    }
  }

  async function deleteAccount() {
    if (!target || confirmation.toLowerCase() !== target.email.toLowerCase()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/users/${target.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: confirmation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(`${target.email} and its private learning data were deleted.`);
      setTarget(null);
      setConfirmation('');
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The account was not deleted.');
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PRIVATE OPERATIONS</p>
          <h1>People using LexiLoop.</h1>
          <p>Confirmed accounts, recent activity, and signup email delivery.</p>
        </div>
        <button className="button secondary" disabled={loading} onClick={() => void load()}>
          <RefreshCw size={17} /> Refresh
        </button>
      </div>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="admin-metrics">
        <div className="panel">
          <Users size={20} />
          <strong>{data.total.toLocaleString()}</strong>
          <span>Total accounts</span>
        </div>
        <div className="panel">
          <CheckCircle2 size={20} />
          <strong>{confirmed}</strong>
          <span>Confirmed on this page</span>
        </div>
        <div className="panel">
          <AlertCircle size={20} />
          <strong>{queue.total}</strong>
          <span>Signup emails pending</span>
        </div>
      </div>
      {queue.total > 0 && (
        <section className="panel notification-queue">
          <div>
            <h2>Signup email queue</h2>
            <p>
              Failed deliveries stay here. The retry is idempotent, so the same signup is not sent
              twice when Resend has already accepted it.
            </p>
          </div>
          <button className="button" disabled={retrying} onClick={() => void retryNotifications()}>
            <RefreshCw size={17} /> {retrying ? 'Retrying…' : 'Retry pending'}
          </button>
        </section>
      )}
      <section className="panel admin-users">
        <div className="admin-toolbar">
          <div>
            <p className="eyebrow">SUPABASE AUTH</p>
            <h2>Accounts</h2>
          </div>
          <label className="search-field">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this page"
              aria-label="Search accounts on this page"
            />
          </label>
        </div>
        <div className="admin-table-wrap" aria-busy={loading}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Last sign-in</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((account) => (
                <tr key={account.id}>
                  <td>
                    <strong>{account.displayName || 'Unnamed learner'}</strong>
                    <span>{account.email}</span>
                  </td>
                  <td>
                    <span className={account.confirmedAt ? 'status-chip success' : 'status-chip'}>
                      {account.confirmedAt ? 'Confirmed' : 'Unconfirmed'}
                    </span>
                  </td>
                  <td>{formatDate(account.createdAt)}</td>
                  <td>{formatDate(account.lastSignInAt)}</td>
                  <td>
                    <button
                      className="icon-button danger"
                      aria-label={`Delete ${account.email}`}
                      onClick={() => {
                        setTarget(account);
                        setConfirmation('');
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !visible.length && <p className="empty-row">No accounts match this page.</p>}
        </div>
        <div className="admin-pagination">
          <button
            className="button secondary"
            disabled={loading || page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <span>
            Page {data.page}
            {data.lastPage > 0 ? ` of ${data.lastPage}` : ''}
          </span>
          <button
            className="button secondary"
            disabled={loading || !data.nextPage}
            onClick={() => setPage(data.nextPage ?? page)}
          >
            Next
          </button>
        </div>
      </section>
      {target && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="panel delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <Trash2 size={25} />
            <h2 id="delete-title">Delete this account?</h2>
            <p>
              This permanently deletes <strong>{target.email}</strong> from Supabase Auth and
              cascades through its private LexiLoop progress.
            </p>
            <label>
              Type the complete email to confirm
              <input
                autoFocus
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            <div className="inline-actions">
              <button className="button secondary" onClick={() => setTarget(null)}>
                Cancel
              </button>
              <button
                className="button danger-button"
                disabled={confirmation.toLowerCase() !== target.email.toLowerCase() || loading}
                onClick={() => void deleteAccount()}
              >
                Permanently delete
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}
