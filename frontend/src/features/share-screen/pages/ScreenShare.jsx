import React from "react";
import useScreenShare from "../hooks/useScreenShare.js";
import ScreenShareView from "../components/ScreenShareView.jsx";

export default function ScreenSharePage() {
  const vm = useScreenShare();

  return (
    <ScreenShareView
      // meta
      meetingId={vm.meetingId}
      userRole={vm.userRole}
      userId={vm.userId}
      // share & annotate
      sharingUser={vm.sharingUser}
      setSharingUser={vm.setSharingUser}
      screenShareOn={vm.screenShareOn}
      setScreenShareOn={vm.setScreenShareOn}
      isAnnotating={vm.isAnnotating}
      onToggleAnnotate={vm.onToggleAnnotate}
      // media
      micOn={vm.micOn}
      camOn={vm.camOn}
      onToggleMic={vm.onToggleMic}
      onToggleCam={vm.onToggleCam}
    />
  );
}
