import React from "react";
import "../styles/SetUp.css";
import TopHeader from "./TopHeader.jsx";
import {
  CardQuickStart,
  CardJoinDefault,
  CardSchedule,
  CardHistory,
} from "./Cards.jsx";
import ScheduledList from "./ScheduledList.jsx";
import HistoryList from "./HistoryList.jsx";

export default function SetUpView({
  hostName,
  onLogout,
  joiningDefault,
  errJoinDefault,
  onJoinDefault,
  onClearJoinDefaultErr,
  creating,
  errCreate,
  onClearCreateErr,
  onOpenQuickStart,
  onOpenSchedule,
  onCloseWizard,
  onSaveMeeting,
  showWizard,
  isQuickStartWizard,
  WizardComponent,

  // lists
  scheduled,
  loadingScheduled,
  errScheduled,
  onStartScheduled,
  refreshScheduled,
  history,
  loadingHistory,
  errHistory,

  // view mode
  viewMode,
  onFetchHistory,
  onBackToScheduled,
  setViewMode,
}) {
  return (
    <div className="hd-app">
      <TopHeader hostName={hostName} onLogout={onLogout} />

      <main className="hd-main">
        {/* top cards */}
        <section className="hd-cards">
          <CardQuickStart
            creating={creating}
            onOpenQuickStart={onOpenQuickStart}
          />

          <CardJoinDefault
            joiningDefault={joiningDefault}
            err={errJoinDefault}
            onJoinDefault={onJoinDefault}
            onClearError={onClearJoinDefaultErr}
          />

          <CardSchedule
            onOpenSchedule={onOpenSchedule}
            WizardComponent={WizardComponent}
            showWizard={showWizard}
            isQuickStart={isQuickStartWizard}
            onCloseWizard={onCloseWizard}
            onSave={onSaveMeeting}
            errCreate={errCreate}
            onClearCreateErr={onClearCreateErr}
          />

          <CardHistory onViewHistory={onFetchHistory} />
        </section>

        {/* scheduled list */}
        {viewMode === "scheduled" && (
          <ScheduledList
            scheduled={scheduled}
            loading={loadingScheduled}
            error={errScheduled}
            onStart={onStartScheduled}
            onRefresh={refreshScheduled}
          />
        )}

        {/* history list */}
        {viewMode === "history" && (
          <HistoryList
            history={history}
            loading={loadingHistory}
            error={errHistory}
            onBack={onBackToScheduled}
          />
        )}
      </main>
    </div>
  );
}
