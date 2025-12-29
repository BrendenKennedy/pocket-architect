import { useState, useEffect } from 'react'
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'
import './UpdateManager.css'

function UpdateManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [checking, setChecking] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState(null)

  const checkForUpdates = async () => {
    try {
      setChecking(true)
      setError(null)

      const { shouldUpdate, manifest } = await checkUpdate()

      if (shouldUpdate) {
        setUpdateAvailable(true)
        setUpdateInfo(manifest)
      } else {
        setUpdateAvailable(false)
        setUpdateInfo(null)
      }
    } catch (err) {
      console.error('Update check failed:', err)
      setError('Failed to check for updates')
    } finally {
      setChecking(false)
    }
  }

  const installUpdateHandler = async () => {
    try {
      setInstalling(true)
      setError(null)

      await installUpdate()

      // Restart the app
      await relaunch()
    } catch (err) {
      console.error('Update installation failed:', err)
      setError('Failed to install update')
      setInstalling(false)
    }
  }

  const dismissUpdate = () => {
    setUpdateAvailable(false)
    setUpdateInfo(null)
  }

  // Check for updates on component mount and periodically
  useEffect(() => {
    checkForUpdates()

    // Check every 30 minutes
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  if (!updateAvailable) {
    return (
      <div className="update-manager">
        <button
          onClick={checkForUpdates}
          disabled={checking}
          className="check-updates-btn"
        >
          {checking ? 'Checking...' : 'Check for Updates'}
        </button>
        {error && <div className="update-error">{error}</div>}
      </div>
    )
  }

  return (
    <div className="update-manager">
      <div className="update-notification">
        <div className="update-header">
          <h3>🎉 Update Available!</h3>
          <button onClick={dismissUpdate} className="dismiss-btn">×</button>
        </div>

        <div className="update-details">
          <p><strong>Version:</strong> {updateInfo?.version}</p>
          {updateInfo?.date && (
            <p><strong>Released:</strong> {new Date(updateInfo.date).toLocaleDateString()}</p>
          )}
          {updateInfo?.body && (
            <div className="update-notes">
              <strong>What's new:</strong>
              <div dangerouslySetInnerHTML={{ __html: updateInfo.body.replace(/\n/g, '<br>') }} />
            </div>
          )}
        </div>

        <div className="update-actions">
          <button
            onClick={installUpdateHandler}
            disabled={installing}
            className="install-btn"
          >
            {installing ? 'Installing...' : 'Install Update'}
          </button>
          <button onClick={dismissUpdate} className="later-btn">
            Later
          </button>
        </div>

        {error && <div className="update-error">{error}</div>}
      </div>
    </div>
  )
}

export default UpdateManager