import { useAppState }       from "./hooks/useAppState";
import { useAnalysis }       from "./hooks/useAnalysis";
import { useChat }           from "./hooks/useChat";
import { useConnectionTest } from "./hooks/useConnectionTest";
import { UploadPage }        from "./pages/UploadPage";
import { AnalyzingPage }     from "./pages/AnalyzingPage";
import { ChatPage }          from "./pages/ChatPage";
import { FormPage }          from "./pages/FormPage";

export default function App() {
  const appState = useAppState();
  const connTest = useConnectionTest();

  const analysis = useAnalysis({
    files:        appState.files,
    zillow:       appState.zillow,
    damages:      appState.damages,
    hasSupporting: appState.hasSupporting,
  });

  const chat = useChat({ hasSupporting: appState.hasSupporting });

  // ── Orchestration ──────────────────────────────────────────────────────────

  // Form is ready when Claude returned either filled formData OR an HTML form block.
  // AppealForm renders from formData so HTML is no longer required.
  const isFormReady = (parsed) =>
    !!(parsed?.formData?.county || parsed?.formData?.parcel || parsed?.html?.length > 300);

  const startAgent = async () => {
    appState.setError("");
    appState.setPhase("analyzing");
    try {
      const parsed = await analysis.run();
      appState.applyParsed(parsed);

      const analysisUserMsg = { role: "user", content: "📎 Documents analyzed." };

      if (isFormReady(parsed)) {
        chat.initMessages([
          analysisUserMsg,
          { role: "assistant", content: "✅ All information extracted. Your appeal form and personalized roadmap are ready below." },
        ]);
        appState.setPhase("form");
      } else {
        chat.initMessages([
          analysisUserMsg,
          { role: "assistant", content: parsed.clean },
        ]);
        appState.setPhase("chat");
      }
    } catch (e) {
      analysis.stopProgress();
      appState.setError(e.message);
      appState.setPhase("upload");
    }
  };

  const sendMessage = async () => {
    try {
      const parsed = await chat.send();
      if (!parsed) return;
      if (parsed.formData || parsed.nextActions || parsed.processInfo || parsed.html?.length > 300) {
        appState.applyParsed(parsed);
      }
      if (isFormReady(parsed)) {
        appState.setPhase("form");
      }
    } catch (e) {
      appState.setError(e.message);
    }
  };

  const handleReset = () => {
    analysis.stopProgress();
    chat.initMessages([]);
    appState.reset();
  };

  // ── Phase routing ──────────────────────────────────────────────────────────

  const { phase } = appState;

  if (phase === "upload") return (
    <UploadPage
      files={appState.files}        onFileChange={appState.setFile}
      zillow={appState.zillow}       onZillowChange={appState.setZillow}
      damages={appState.damages}     onDamagesChange={appState.setDamages}
      canStart={appState.canStart}
      hasSupporting={appState.hasSupporting}
      error={appState.error}
      connTest={connTest}
      onSubmit={startAgent}
    />
  );

  if (phase === "analyzing") return (
    <AnalyzingPage
      progress={analysis.progress}
      progressLabel={analysis.progressLabel}
      detectedCounty={analysis.detectedCounty}
      files={appState.files}
      hasSupporting={appState.hasSupporting}
    />
  );

  if (phase === "chat") return (
    <ChatPage
      messages={chat.messages}
      input={chat.input}
      setInput={chat.setInput}
      loading={chat.loading}
      streamText={chat.streamText}
      processInfo={appState.processInfo}
      nextActions={appState.nextActions}
      error={appState.error}
      onSend={sendMessage}
      onReset={handleReset}
    />
  );

  return (
    <FormPage
      formHTML={appState.formHTML}
      formData={appState.formData}
      nextActions={appState.nextActions}
      processInfo={appState.processInfo}
      supportingSummary={appState.supportingSummary}
      hasSupporting={appState.hasSupporting}
      onChat={() => appState.setPhase("chat")}
      onReset={handleReset}
    />
  );
}
