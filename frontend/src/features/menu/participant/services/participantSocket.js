// src/features/menu/participants/services/participantSocket.js
import meetingSocketService from "../../../../services/meetingSocketService.js";
import { API_URL } from "../../../../config.js";

/**
 * Menginisialisasi koneksi socket untuk participant.
 */
export function connectParticipantSocket(meetingId, userId) {
  meetingSocketService.connect(meetingId, userId, API_URL);
}

/**
 * Mendaftarkan semua event listener yang relevan.
 */
export function registerParticipantSocketHandlers({
  onJoin,
  onLeave,
  onUpdate,
  onInitialList,
}) {
  meetingSocketService.on("participant_joined", onJoin);
  meetingSocketService.on("participant_left", onLeave);
  meetingSocketService.on("participant_updated", onUpdate);
  if (onInitialList) {
    meetingSocketService.on("participants_list", onInitialList);
  }
}

/**
 * Membersihkan semua listener saat unmount
 */
export function unregisterParticipantSocketHandlers({
  onJoin,
  onLeave,
  onUpdate,
  onInitialList,
}) {
  meetingSocketService.off("participant_joined", onJoin);
  meetingSocketService.off("participant_left", onLeave);
  meetingSocketService.off("participant_updated", onUpdate);
  if (onInitialList) {
    meetingSocketService.off("participants_list", onInitialList);
  }
}
