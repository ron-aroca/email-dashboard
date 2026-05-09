import React, { useState, useEffect, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { AlertCircle, CheckCircle, Clock, Users, Mail, RefreshCw, Send, X, LogIn } from 'lucide-react';

const EmailDashboard = () => {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState([]);
  const [todos, setTodos] = useState([]);
  const [teamMetrics, setTeamMetrics] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [draftMode, setDraftMode] = useState(false);
  const [draftResponse, setDraftResponse] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [alertLog, setAlertLog] = useState([]);

  const CONFIG = {
    teamMembers: [
      { name: 'Nathaly Andrade', email: 'nandrade@planitroi.com', team: 'Client Success' },
      { name: 'Daniela Figueroa', email: 'dfigueroa@planitroi.com', team: 'Client Success' },
      { name: 'Kevin Silverstein', email: 'ksilverstein@planitroi.com', team: 'Client Success' },
      { name: 'Ayleen Barreto', email: 'abarreto@planitroi.com', team: 'Client Success' },
      { name: 'Denise Coronado', email: 'dcoronado@planitroi.com', team: 'Client Success' },
      { name: 'Bijay Karki', email: 'bkarki@planitroi.com', team: 'Systems' },
      { name: 'Jorge Aroca', email: 'jaroca@planitroi.com', team: 'Systems' },
    ],
    sla: {
      normal: 240,
      urgent: 120,
      critical: 60,
    },
    companyDomain: '@planitroi.com',
  };

  const fetchEmails = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const response = await fetch('/api/emails', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }

      const data = await response.json();
      const emailList = data.emails || [];

      const todoList = emailList
        .filter((e) => e.type === 'client' && !e.isRead)
        .map((e) => ({
          id: `todo-${e.id}`,
          emailId: e.id,
          type: e.type,
          from: e.from.name,
          subject: e.subject,
          urgency: e.urgency,
          receivedTime: e.receivedTime,
          completed: false,
        }));

      setEmails(emailList);
      setTodos(todoList);

      const alerts = [];
      const now = new Date();

      emailList.forEach((email) => {
        if (!email.isRead && email.type === 'client') {
          const minutesOutstanding = (now - new Date(email.receivedTime)) / (1000 * 60);
          const slaCriteria =
            email.urgency === 'critical' ? 60 : email.urgency === 'high' ? 120 : 240;

          if (minutesOutstanding > slaCriteria) {
            alerts.push({
              id: `alert-${email.id}`,
              severity: email.urgency,
              message: `⏰ SLA BREACH: "${email.subject}" from ${email.from.name} - ${Math.round(minutesOutstanding)} min outstanding`,
              timestamp: now,
            });
          }

          if (email.urgency === 'critical') {
            alerts.push({
              id: `alert-critical-${email.id}`,
              severity: 'critical',
              message: `🚨 CRITICAL: "${email.subject}" from ${email.from.name}`,
              timestamp: now,
            });
          }
        }
      });

      if (alerts.length > 0) {
        setAlertLog((prev) => [...alerts, ...prev].slice(0, 50));
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchEmails();
      const interval = setInterval(() => {
        fetchEmails();
      }, 3600000);
      return () => clearInterval(interval);
    }
  }, [status, fetchEmails]);

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 border-red-400 text-red-900';
      case 'high':
        return 'bg-orange-100 border-orange-400 text-orange-900';
      default:
        return 'bg-blue-100 border-blue-400 text-blue-900';
    }
  };

  const formatTimeOutstanding = (date) => {
    const now = new Date();
    const minutes = Math.round((now - new Date(date)) / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h ago`;
    return `${(minutes / 1440).toFixed(1)}d ago`;
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <Mail size={48} className="mx-auto text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Dashboard</h1>
            <p className="text-gray-600">Connect your Outlook account</p>
          </div>
          <button
            onClick={() => signIn('azure-ad')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            Connect to Outlook
          </button>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
            <p><strong>🔒 Secure:</strong> Uses Microsoft 365 security. Your emails stay private.</p>
          </div>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-300">
          <div className="text-3xl font-bold text-blue-700">{emails.length}</div>
          <div className="text-sm text-blue-600 font-medium">Emails</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-300">
          <div className="text-3xl font-bold text-orange-700">{todos.filter((t) => t.urgency === 'high').length}</div>
          <div className="text-sm text-orange-600 font-medium">Urgent</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-300">
          <div className="text-3xl font-bold text-red-700">{todos.filter((t) => t.urgency === 'critical').length}</div>
          <div className="text-sm text-red-600 font-medium">Critical</div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-300">
          <div className="text-sm text-gray-600 font-medium">Last Sync</div>
          <div className="text-xs text-gray-500 mt-1">{lastRefresh.toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Mail size={20} className="text-blue-600" /> Recent Emails
        </h3>
        <div className="space-y-3">
          {emails.slice(0, 10).map((email) => (
            <div
              key={email.id}
              className={`p-4 rounded-lg border-l-4 ${getUrgencyColor(email.urgency)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{email.from.name}</div>
                  <div className="text-sm font-medium mt-1">{email.subject}</div>
                  <div className="text-xs mt-2 opacity-75">{email.summary}</div>
                </div>
                <div className="text-xs whitespace-nowrap ml-3 font-mono">
                  {formatTimeOutstanding(email.receivedTime)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTodoTab = () => (
    <div className="space-y-3">
      {todos.length === 0 ? (
        <div className="bg-green-50 p-6 rounded-lg border border-green-300 text-green-800 text-center">
          ✅ All caught up!
        </div>
      ) : (
        todos.map((todo) => (
          <div key={todo.id} className={`p-4 rounded-lg border-l-4 ${getUrgencyColor(todo.urgency)} bg-white`}>
            <div className="font-semibold">{todo.subject}</div>
            <div className="text-xs mt-2">
              <strong>From:</strong> {todo.from}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderTeamTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-blue-700 mb-3">👥 Client Success Team</h3>
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-blue-50 border-b border-gray-300">
              <tr>
                <th className="p-4 text-left font-semibold">Team Member</th>
              </tr>
            </thead>
            <tbody>
              {CONFIG.teamMembers
                .filter((m) => m.team === 'Client Success')
                .map((member) => (
                  <tr key={member.name} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-4 font-medium">{member.name}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-purple-700 mb-3">⚙️ Systems Team</h3>
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-purple-50 border-b border-gray-300">
              <tr>
                <th className="p-4 text-left font-semibold">Team Member</th>
              </tr>
            </thead>
            <tbody>
              {CONFIG.teamMembers
                .filter((m) => m.team === 'Systems')
                .map((member) => (
                  <tr key={member.name} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-4 font-medium">{member.name}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAlertsTab = () => (
    <div className="space-y-3">
      {alertLog.length === 0 ? (
        <div className="bg-green-50 p-5 rounded-lg border border-green-300 text-green-800 text-sm font-medium">
          ✅ All clear!
        </div>
      ) : (
        alertLog.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border-l-4 ${
              alert.severity === 'critical'
                ? 'bg-red-50 border-red-400 text-red-900'
                : 'bg-orange-50 border-orange-400 text-orange-900'
            } shadow-sm`}
          >
            <div className="font-semibold text-sm">{alert.message}</div>
            <div className="text-xs mt-2 opacity-75">{alert.timestamp.toLocaleTimeString()}</div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">📧 Email Workflow Dashboard</h1>
              <p className="text-sm text-gray-600 mt-2">
                PlanITROI Client Success & Systems Teams
              </p>
            </div>
            <div className="flex gap-2">
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                ✅ Connected
              </div>
              <button
                onClick={() => signOut()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-8 border-b border-gray-300 overflow-x-auto">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'todos', label: `✓ TO-DOs (${todos.length})` },
            { id: 'team', label: '👥 Team' },
            { id: 'alerts', label: '🚨 Alerts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'todos' && renderTodoTab()}
          {activeTab === 'team' && renderTeamTab()}
          {activeTab === 'alerts' && renderAlertsTab()}
        </div>
      </div>
    </div>
  );
};

export default EmailDashboard;
