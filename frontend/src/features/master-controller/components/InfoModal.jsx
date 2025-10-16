import React from "react";

/**
 * Modal sederhana untuk menampilkan detail device participant.
 * @param {object} info - Objek participant (id, hostname, account, dll)
 * @param {function} onClose - Fungsi untuk menutup modal
 */
export default function InfoModal({ info, onClose }) {
  if (!info) return null;

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
              <th>OS</th>
              <td>{info.os || "N/A"}</td>
            </tr>
            <tr>
              <th>Account ID</th>
              <td>{info.account?.id || "-"}</td>
            </tr>
            <tr>
              <th>Username</th>
              <td>{info.account?.username || "-"}</td>
            </tr>
            <tr>
              <th>Display Name</th>
              <td>{info.account?.displayName || "-"}</td>
            </tr>
            <tr>
              <th>Role</th>
              <td>{info.account?.role || "-"}</td>
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
