import { API_URL } from "../../../../config";
import meetingService from "../../../../services/meetingService";

export default function useServiceActions(showError, loadRequests, setBusyId) {
  const doAssign = async (id) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API_URL}/api/services/${id}/assign`, {
        method: "POST",
        headers: meetingService.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      await loadRequests();
    } catch (e) {
      showError(`Assign gagal: ${String(e.message || e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const doUpdateStatus = async (id, status) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API_URL}/api/services/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      await loadRequests();
    } catch (e) {
      showError(`Update failed: ${String(e.message || e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const markDone = async (id) => await doUpdateStatus(id, "done");

  const doCancel = async (id) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API_URL}/api/services/${id}/cancel`, {
        method: "POST",
        headers: meetingService.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      await loadRequests();
    } catch (e) {
      showError(`Cancel failed: ${String(e.message || e)}`);
    } finally {
      setBusyId(null);
    }
  };

  return { doAssign, doUpdateStatus, doCancel, markDone };
}
