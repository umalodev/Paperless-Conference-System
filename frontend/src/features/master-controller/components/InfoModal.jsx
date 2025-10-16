import React from "react";

/**
 * Modal to display detailed participant device information.
 * @param {object} info - Participant object (id, hostname, os, account, etc.)
 * @param {function} onClose - Function to close the modal
 */
export default function InfoModal({ info, onClose }) {
  if (!info) return null;

  const account = info.account || {};

  return (
    <div className="info-overlay" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Participant Device Info</h3>

        <table className="info-table">
          <tbody>
            <tr>
              <th>ID</th>
              <td>{info.id}</td>
            </tr>
            <tr>
              <th>Hostname</th>
              <td>{info.hostname || "Unknown"}</td>
            </tr>
            <tr>
              <th>User</th>
              <td>{info.user || "-"}</td>
            </tr>
            <tr>
              <th>Operating System</th>
              <td>{info.os || "N/A"}</td>
            </tr>
            <tr>
              <th>Locked Status</th>
              <td>
                {info.isLocked ? (
                  <span style={{ color: "red", fontWeight: 600 }}>Locked</span>
                ) : (
                  <span style={{ color: "green", fontWeight: 600 }}>Unlocked</span>
                )}
              </td>
            </tr>
            <tr>
              <th>Account ID</th>
              <td>{account.id || "-"}</td>
            </tr>
            <tr>
              <th>Username</th>
              <td>{account.username || "-"}</td>
            </tr>
            <tr>
              <th>Display Name</th>
              <td>{account.displayName || "-"}</td>
            </tr>
            <tr>
              <th>Role</th>
              <td>{account.role || "-"}</td>
            </tr>
            <tr>
              <th>Created At</th>
              <td>
                {account.created_at
                  ? new Date(account.created_at).toLocaleString()
                  : "-"}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="info-footer">
          <button className="mc-btn gray" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
