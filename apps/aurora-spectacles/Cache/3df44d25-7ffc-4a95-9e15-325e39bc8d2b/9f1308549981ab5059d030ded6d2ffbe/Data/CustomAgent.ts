import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";

@component
export class CustomAgent extends BaseScriptComponent {
  // Internet Module for making HTTP requests
  @input
  private internetModule: InternetModule;

  // ASR Module for speech recognition
  private asrModule: AsrModule = require("LensStudio:AsrModule");

  private isTranscribing: boolean = false;

  // Your RPC server URL (update this to your actual server URL)
  private rpcServerUrl: string = "http://localhost:3002/api/internal/rpc";

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
      this.updateTextEvent.invoke({
        text: asrOutput.text,
        completed: true,
      });

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
          this.updateTextEvent.invoke({
            text: "Error: Internal Error",
            completed: true,
          });
          break;
        case AsrModule.AsrStatusCode.Unauthenticated:
          this.updateTextEvent.invoke({
            text: "Error: Unauthenticated",
            completed: true,
          });
          break;
        case AsrModule.AsrStatusCode.NoInternet:
          this.updateTextEvent.invoke({
            text: "Error: No Internet",
            completed: true,
          });
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

  // Example method to call your RPC server
  public async callRpcServer(transcribedText: string) {
    if (!this.internetModule) {
      print("InternetModule not assigned!");
      return;
    }

    try {
      print("Calling RPC server with text: " + transcribedText);

      // Create the request
      const request = new Request(this.rpcServerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Format based on your RPC schema
          jsonrpc: "2.0",
          method: "UserCreate",
          params: {
            name: transcribedText,
          },
          id: 1,
        }),
      });

      // Make the request
      const response = await this.internetModule.fetch(request);

      if (response.status === 200) {
        const responseText = await response.text();
        print("RPC Response: " + responseText);

        // Update the UI with the response
        this.updateTextEvent.invoke({
          text: "Server response: " + responseText,
          completed: true,
        });
      } else {
        print("RPC Error: Status " + response.status);
        this.updateTextEvent.invoke({
          text: "Error: Server returned " + response.status,
          completed: true,
        });
      }
    } catch (error) {
      print("RPC Error: " + error);
      this.updateTextEvent.invoke({
        text: "Error calling server: " + error,
        completed: true,
      });
    }
  }
}
