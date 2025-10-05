import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";

@component
export class CustomAgent extends BaseScriptComponent {
  // Text component to display the transcription
  @input
  private displayText: Text;

  // ASR Module for speech recognition
  private asrModule: AsrModule = require("LensStudio:AsrModule");

  private isTranscribing: boolean = false;

  public updateTextEvent: Event<{ text: string; completed: boolean }> =
    new Event<{ text: string; completed: boolean }>();

  onAwake() {
    // Start transcribing when the component is initialized
    this.createEvent("OnStartEvent").bind(() => {
      this.startListening();
    });
  }

  private startListening() {
    if (this.isTranscribing) {
      print("Already transcribing...");
      return;
    }

    print("Starting ASR transcription...");
    this.isTranscribing = true;

    // Create ASR options
    const asrSettings = AsrModule.AsrTranscriptionOptions.create();
    asrSettings.mode = AsrModule.AsrMode.HighAccuracy;
    asrSettings.silenceUntilTerminationMs = 1500; // 1.5 seconds of silence before marking as final

    // Handle transcription updates
    asrSettings.onTranscriptionUpdateEvent.add((asrOutput) => {
      print(`Transcription: ${asrOutput.text}, isFinal: ${asrOutput.isFinal}`);

      // Update the display text
      if (this.displayText) {
        this.updateTextEvent.invoke({
          text: asrOutput.text,
          completed: true,
        });
        this.displayText.text = asrOutput.text;
      }

      // If the transcription is final, start a new one
      if (asrOutput.isFinal) {
        print("Transcription complete: " + asrOutput.text);
        // Automatically start listening again for continuous transcription
        this.isTranscribing = false;
      }
    });

    // Handle transcription errors
    asrSettings.onTranscriptionErrorEvent.add((errorCode) => {
      print(`Transcription error: ${errorCode}`);
      this.isTranscribing = false;

      switch (errorCode) {
        case AsrModule.AsrStatusCode.InternalError:
          if (this.displayText) this.displayText.text = "Error: Internal Error";
          break;
        case AsrModule.AsrStatusCode.Unauthenticated:
          if (this.displayText)
            this.displayText.text = "Error: Unauthenticated";
          break;
        case AsrModule.AsrStatusCode.NoInternet:
          if (this.displayText) this.displayText.text = "Error: No Internet";
          break;
      }
    });

    // Start transcribing
    this.asrModule.startTranscribing(asrSettings);
  }

  public stopListening() {
    if (this.isTranscribing) {
      print("Stopping ASR transcription...");
      this.asrModule.stopTranscribing();
      this.isTranscribing = false;
    }
  }
}
