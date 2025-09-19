// src/hooks/useMeetingRTC.js
import { useEffect, useRef, useState, useCallback } from "react";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
    // Rekomendasi produksi:
    // { urls: "turn:YOUR_TURN_HOST:3478", username: "user", credential: "pass" },
  ],
};

export default function useMeetingRTC({ meetingId, userId, ws }) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const localStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [localReady, setLocalReady] = useState(false);

  const peersRef = useRef(new Map()); // peerId -> { pc, stream, isOffering }
  const [remoteStreams, setRemoteStreams] = useState([]); // [{peerId, stream}]
  const pendingCallsRef = useRef(new Set()); // peerId yg antri dipanggil
  const connectedPeersRef = useRef(new Set()); // track connected peers

  const selfIdRef = useRef(null);
  const isInitiatorRef = useRef(false); // track if we initiated the call

  useEffect(() => {
    if (selfIdRef.current == null) {
      try {
        const raw = localStorage.getItem("user");
        selfIdRef.current = raw ? JSON.parse(raw).id : undefined;
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (userId) selfIdRef.current = userId;
  }, [userId]);

  const refreshRemoteList = useCallback(() => {
    setRemoteStreams(
      Array.from(peersRef.current.entries())
        .filter(([_, obj]) => obj.stream && obj.stream.getTracks().length > 0)
        .map(([peerId, obj]) => ({
          peerId,
          stream: obj.stream,
        }))
    );
  }, []);

  const send = useCallback(
    (payload) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket not ready, cannot send:", payload.type);
        return false;
      }
      const data = { meetingId, from: selfIdRef.current, ...payload };
      console.log("[RTC SEND]", data.type, { to: data.to, from: data.from });
      ws.send(JSON.stringify(data));
      return true;
    },
    [ws, meetingId]
  );

  // 1) Ambil media lokal
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        console.log("Requesting user media...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
            frameRate: { ideal: 15 }, // limit framerate to reduce bandwidth
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        console.log(
          "Got local media stream:",
          stream.getTracks().map((t) => t.kind)
        );

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Set initial state
        stream.getAudioTracks().forEach((t) => (t.enabled = micOn));
        stream.getVideoTracks().forEach((t) => (t.enabled = camOn));

        setLocalReady(true);
        console.log("Local media ready");
      } catch (e) {
        console.error("getUserMedia failed:", e);
        alert(
          "Tidak bisa mengakses mic/camera. Cek permission & gunakan HTTPS untuk produksi."
        );
      }
    })();

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setLocalStream(null);
      setLocalReady(false);
    };
  }, []); // init sekali

  const addLocalTracksIfNeeded = useCallback((pc) => {
    const st = localStreamRef.current;
    if (!st) {
      console.warn("No local stream to add tracks");
      return;
    }

    const senders = pc.getSenders();
    console.log("Current senders:", senders.length);

    const audioTrack = st.getAudioTracks()[0];
    if (
      audioTrack &&
      !senders.find((s) => s.track && s.track.kind === "audio")
    ) {
      console.log("Adding audio track");
      pc.addTrack(audioTrack, st);
    }

    const videoTrack = st.getVideoTracks()[0];
    if (
      videoTrack &&
      !senders.find((s) => s.track && s.track.kind === "video")
    ) {
      console.log("Adding video track");
      pc.addTrack(videoTrack, st);
    }

    console.log("Local tracks added, total senders:", pc.getSenders().length);
  }, []);

  // 2) Buat/get peer connection
  const ensurePeer = useCallback(
    (peerId) => {
      if (peersRef.current.has(peerId)) {
        return peersRef.current.get(peerId);
      }

      console.log(`Creating new peer connection for: ${peerId}`);
      const pc = new RTCPeerConnection(RTC_CONFIG);

      const remoteStream = new MediaStream();
      let trackCount = 0;

      pc.ontrack = (e) => {
        console.log(`Received track from ${peerId}:`, e.track.kind);
        trackCount++;

        const track = e.track;
        const streams = e.streams;

        if (streams && streams[0]) {
          // Use the stream from the event
          const incomingStream = streams[0];
          console.log(
            `Using stream from event for ${peerId}, tracks:`,
            incomingStream.getTracks().length
          );

          const obj = peersRef.current.get(peerId);
          if (obj) {
            obj.stream = incomingStream;
            refreshRemoteList();
          }
        } else {
          // Fallback: add track to our managed stream
          if (!remoteStream.getTracks().includes(track)) {
            remoteStream.addTrack(track);
            console.log(
              `Added ${track.kind} track to remote stream for ${peerId}`
            );
          }

          const obj = peersRef.current.get(peerId);
          if (obj) {
            obj.stream = remoteStream;
            refreshRemoteList();
          }
        }

        // Track lifecycle
        track.onended = () => {
          console.log(`Track ended from ${peerId}:`, track.kind);
          refreshRemoteList();
        };
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          console.log(`Sending ICE candidate to ${peerId}`);
          send({ type: "rtc-ice", to: peerId, candidate: e.candidate });
        } else {
          console.log(`ICE gathering complete for ${peerId}`);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(
          `ICE connection state for ${peerId}:`,
          pc.iceConnectionState
        );

        if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          connectedPeersRef.current.add(peerId);
          console.log(`Peer ${peerId} connected successfully`);
        } else if (
          pc.iceConnectionState === "disconnected" ||
          pc.iceConnectionState === "failed"
        ) {
          connectedPeersRef.current.delete(peerId);
          console.log(`Peer ${peerId} disconnected`);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`Connection state for ${peerId}:`, pc.connectionState);
      };

      // Add local tracks immediately if available
      if (localReady) {
        addLocalTracksIfNeeded(pc);
      }

      const peerObj = { pc, stream: remoteStream, isOffering: false };
      peersRef.current.set(peerId, peerObj);

      console.log(`Peer connection created for ${peerId}`);
      return peerObj;
    },
    [send, localReady, addLocalTracksIfNeeded, refreshRemoteList]
  );

  // 3) Kirim offer (delay jika local belum siap)
  const callPeer = useCallback(
    async (peerId, isInitiator = true) => {
      console.log(`Calling peer ${peerId}, isInitiator: ${isInitiator}`);

      if (!localReady) {
        console.log(`Local not ready, queueing call to ${peerId}`);
        pendingCallsRef.current.add(peerId);
        return;
      }

      const peerObj = ensurePeer(peerId);
      const { pc } = peerObj;

      peerObj.isOffering = isInitiator;
      isInitiatorRef.current = isInitiator;

      try {
        // Make sure local tracks are added
        addLocalTracksIfNeeded(pc);

        console.log(`Creating offer for ${peerId}`);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });

        await pc.setLocalDescription(offer);
        console.log(`Sending offer to ${peerId}`);

        const success = send({
          type: "rtc-offer",
          to: peerId,
          sdp: offer.sdp,
          isInitiator: isInitiator,
        });

        if (!success) {
          console.error(`Failed to send offer to ${peerId}`);
        }
      } catch (error) {
        console.error(`Error calling peer ${peerId}:`, error);
      }
    },
    [ensurePeer, localReady, send, addLocalTracksIfNeeded]
  );

  // 4) Saat localReady true → pasang track ke semua PC & proses antrian call
  useEffect(() => {
    if (!localReady) return;

    console.log(
      "Local ready, adding tracks to existing peers and processing pending calls"
    );

    // Add tracks to existing peer connections
    peersRef.current.forEach(({ pc }, peerId) => {
      addLocalTracksIfNeeded(pc);
      console.log(`Added local tracks to existing peer ${peerId}`);
    });

    // Process pending calls
    if (pendingCallsRef.current.size > 0) {
      console.log(`Processing ${pendingCallsRef.current.size} pending calls`);
      pendingCallsRef.current.forEach((peerId) => {
        callPeer(peerId, true);
      });
      pendingCallsRef.current.clear();
    }
  }, [localReady, callPeer, addLocalTracksIfNeeded]);

  // 5) Announce presence when WebSocket connects and local media is ready
  useEffect(() => {
    if (!ws || !localReady || !meetingId || !selfIdRef.current) return;

    const announcePresence = () => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log("Announcing presence to meeting");
        send({
          type: "participant_joined",
          participantId: selfIdRef.current,
        });
      }
    };

    // If already connected, announce immediately
    if (ws.readyState === WebSocket.OPEN) {
      announcePresence();
    } else {
      // Wait for connection
      const onOpen = () => announcePresence();
      ws.addEventListener("open", onOpen);
      return () => ws.removeEventListener("open", onOpen);
    }
  }, [ws, localReady, meetingId, send]);

  // 6) Signaling WS
  useEffect(() => {
    if (!ws) return;

    const onMsg = async (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }

      if (data.meetingId !== meetingId) return;

      console.log("[RTC RECV]", data.type, { from: data.from, to: data.to });

      const myId = selfIdRef.current;

      // Someone joined - existing participants call the new one
      if (
        data.type === "participant_joined" &&
        data.participantId &&
        String(data.participantId) !== String(myId)
      ) {
        console.log(
          `New participant joined: ${data.participantId}, initiating call`
        );
        await callPeer(data.participantId, true);
        return;
      }

      // Direct signaling messages
      if (String(data.to) !== String(myId)) return;

      if (data.type === "rtc-offer") {
        console.log(`Received offer from ${data.from}`);
        try {
          const peerObj = ensurePeer(data.from);
          const { pc } = peerObj;

          // Add local tracks before setting remote description
          if (localReady) {
            addLocalTracksIfNeeded(pc);
          }

          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: data.sdp })
          );

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          console.log(`Sending answer to ${data.from}`);
          send({ type: "rtc-answer", to: data.from, sdp: answer.sdp });
        } catch (error) {
          console.error(`Error handling offer from ${data.from}:`, error);
        }
        return;
      }

      if (data.type === "rtc-answer") {
        console.log(`Received answer from ${data.from}`);
        try {
          const peerObj = peersRef.current.get(data.from);
          if (!peerObj) {
            console.warn(`No peer connection for ${data.from}`);
            return;
          }

          await peerObj.pc.setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp: data.sdp })
          );
          console.log(`Set remote description for ${data.from}`);
        } catch (error) {
          console.error(`Error handling answer from ${data.from}:`, error);
        }
        return;
      }

      if (data.type === "rtc-ice" && data.candidate) {
        console.log(`Received ICE candidate from ${data.from}`);
        try {
          const peerObj = peersRef.current.get(data.from);
          if (!peerObj) {
            console.warn(`No peer connection for ${data.from}`);
            return;
          }

          await peerObj.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log(`Added ICE candidate from ${data.from}`);
        } catch (e) {
          console.warn(`Error adding ICE candidate from ${data.from}:`, e);
        }
        return;
      }

      if (data.type === "participant_left") {
        const pid = data.participantId;
        console.log(`Participant left: ${pid}`);
        const obj = peersRef.current.get(pid);
        if (obj) {
          obj.pc.close();
          peersRef.current.delete(pid);
          connectedPeersRef.current.delete(pid);
          refreshRemoteList();
        }
        return;
      }

      if (data.type === "media-toggle") {
        console.log(`Media toggle from ${data.from}:`, {
          audio: data.audio,
          video: data.video,
        });
        // Handle remote media state changes if needed
        return;
      }
    };

    ws.addEventListener("message", onMsg);
    return () => ws.removeEventListener("message", onMsg);
  }, [
    ws,
    meetingId,
    ensurePeer,
    callPeer,
    localReady,
    send,
    addLocalTracksIfNeeded,
    refreshRemoteList,
  ]);

  // 7) Toggle mic/cam
  const toggleMic = useCallback(() => {
    const st = localStreamRef.current;
    if (!st) return;

    const next = !micOn;
    st.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);

    console.log(`Toggled mic: ${next}`);

    // Notify peers of media state change
    peersRef.current.forEach((_obj, peerId) => {
      send({ type: "media-toggle", to: peerId, audio: next });
    });
  }, [micOn, send]);

  const toggleCam = useCallback(() => {
    const st = localStreamRef.current;
    if (!st) return;

    const next = !camOn;
    st.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);

    console.log(`Toggled camera: ${next}`);

    // Notify peers of media state change
    peersRef.current.forEach((_obj, peerId) => {
      send({ type: "media-toggle", to: peerId, video: next });
    });
  }, [camOn, send]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("Cleaning up WebRTC connections");
      peersRef.current.forEach(({ pc }) => {
        try {
          pc.close();
        } catch (e) {
          console.warn("Error closing peer connection:", e);
        }
      });
      peersRef.current.clear();
      connectedPeersRef.current.clear();
    };
  }, []);

  return {
    localStream,
    remoteStreams,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
    connectedPeers: Array.from(connectedPeersRef.current),
  };
}
