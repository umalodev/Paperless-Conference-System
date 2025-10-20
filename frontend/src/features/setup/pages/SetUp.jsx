import React from "react";
import { useNavigate } from "react-router-dom";
import meetingService from "../../../services/meetingService.js";
import { API_URL } from "../../../config.js";
import { useModal } from "../../../contexts/ModalProvider.jsx";
import useSetUp from "../hooks/useSetUp.js";
import SetUpView from "../components/SetUpView.jsx";
import MeetingWizardModal from "../components/MeetingWizardModal.jsx";

export default function SetUpPage() {
  const navigate = useNavigate();
  const modal = useModal();
  const vm = useSetUp({ meetingService, API_URL, navigate, modal });

  return (
    <SetUpView
      // header
      hostName={vm.hostName}
      onLogout={vm.handleLogout}
      // cards & wizard
      joiningDefault={vm.joiningDefault}
      errJoinDefault={vm.errJoinDefault}
      onJoinDefault={vm.joinDefaultAsHost}
      onClearJoinDefaultErr={vm.clearJoinDefaultErr}
      creating={vm.creating}
      errCreate={vm.errCreate}
      onClearCreateErr={vm.clearCreateErr}
      onOpenQuickStart={vm.openQuickStart}
      onOpenSchedule={vm.openScheduleWizard}
      onCloseWizard={vm.closeWizard}
      onSaveMeeting={vm.saveMeetingPayload}
      showWizard={vm.showWizard}
      isQuickStartWizard={vm.isQuickStartWizard}
      WizardComponent={MeetingWizardModal}
      // scheduled
      scheduled={vm.scheduled}
      loadingScheduled={vm.loadingScheduled}
      errScheduled={vm.errScheduled}
      onStartScheduled={vm.startScheduledMeeting}
      refreshScheduled={vm.refreshScheduled}
      // history
      history={vm.history}
      loadingHistory={vm.loadingHistory}
      errHistory={vm.errHistory}
      onFetchHistory={() => {
        vm.setViewMode("history");
        vm.fetchHistory();
      }}
      onBackToScheduled={() => vm.setViewMode("scheduled")}
      // view mode
      viewMode={vm.viewMode}
      setViewMode={vm.setViewMode}
    />
  );
}
