import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import UpdateManager from './UpdateManager'
import './App.css'

function App() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAccount, setNewAccount] = useState({
    name: '',
    access_key: '',
    secret_key: '',
    region: 'us-east-1'
  })

  // Load accounts on component mount
  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const response = await invoke('get_accounts')
      if (response.success) {
        setAccounts(response.data || [])
      } else {
        setMessage(`Error: ${response.message}`)
      }
    } catch (error) {
      setMessage(`Failed to load accounts: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await invoke('create_account', {
        request: JSON.stringify(newAccount)
      })
      if (response.success) {
        setMessage('Account created successfully!')
        setNewAccount({ name: '', access_key: '', secret_key: '', region: 'us-east-1' })
        setShowCreateForm(false)
        loadAccounts()
      } else {
        setMessage(`Error: ${response.message}`)
      }
    } catch (error) {
      setMessage(`Failed to create account: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncAccount = async (accountId) => {
    try {
      setLoading(true)
      setMessage('Syncing account...')
      const response = await invoke('sync_account', { id: accountId })
      if (response.success) {
        const data = response.data
        setMessage(`Sync completed! Synced ${data.synced} resources. ${data.results.join(', ')}`)
        loadAccounts() // Refresh to show updated sync time
      } else {
        setMessage(`Sync failed: ${response.message}`)
      }
    } catch (error) {
      setMessage(`Failed to sync account: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async (accountId) => {
    try {
      setLoading(true)
      setMessage('Testing connection...')
      const response = await invoke('test_account_connection', { id: accountId })
      if (response.success) {
        setMessage(`Connection test successful: ${response.message}`)
      } else {
        setMessage(`Connection test failed: ${response.message}`)
      }
    } catch (error) {
      setMessage(`Failed to test connection: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Pocket Architect</h1>
        <p>AWS Resource Management Tool</p>
      </header>

      <UpdateManager />

      <main>
        <div className="actions">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={loading}
          >
            {showCreateForm ? 'Cancel' : 'Add AWS Account'}
          </button>
          <button onClick={loadAccounts} disabled={loading}>
            Refresh
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes('Error') || message.includes('failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {showCreateForm && (
          <form onSubmit={handleCreateAccount} className="create-form">
            <h3>Add New AWS Account</h3>
            <div className="form-group">
              <label>Account Name:</label>
              <input
                type="text"
                value={newAccount.name}
                onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                required
                placeholder="e.g., My AWS Account"
              />
            </div>
            <div className="form-group">
              <label>Access Key ID:</label>
              <input
                type="text"
                value={newAccount.access_key}
                onChange={(e) => setNewAccount({...newAccount, access_key: e.target.value})}
                required
                placeholder="AKIAIOSFODNN7EXAMPLE"
              />
            </div>
            <div className="form-group">
              <label>Secret Access Key:</label>
              <input
                type="password"
                value={newAccount.secret_key}
                onChange={(e) => setNewAccount({...newAccount, secret_key: e.target.value})}
                required
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              />
            </div>
            <div className="form-group">
              <label>Region:</label>
              <select
                value={newAccount.region}
                onChange={(e) => setNewAccount({...newAccount, region: e.target.value})}
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">EU (Ireland)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="accounts-section">
          <h2>AWS Accounts ({accounts.length})</h2>
          {accounts.length === 0 ? (
            <p className="empty-state">No AWS accounts configured yet. Add your first account above.</p>
          ) : (
            <div className="accounts-grid">
              {accounts.map((account) => (
                <div key={account.id} className="account-card">
                  <h3>{account.name}</h3>
                  <div className="account-details">
                    <p><strong>Region:</strong> {account.region || 'Not set'}</p>
                    <p><strong>Last Sync:</strong> {account.last_sync ? new Date(account.last_sync).toLocaleString() : 'Never'}</p>
                    <p><strong>Status:</strong> {account.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div className="account-actions">
                    <button
                      onClick={() => handleTestConnection(account.id)}
                      disabled={loading}
                      className="test-btn"
                    >
                      Test Connection
                    </button>
                    <button
                      onClick={() => handleSyncAccount(account.id)}
                      disabled={loading}
                      className="sync-btn"
                    >
                      {loading ? 'Syncing...' : 'Sync Resources'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
