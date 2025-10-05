import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";

@component
export class CustomAgent extends BaseScriptComponent {
  // Internet Module for making HTTP requests
  @input
  private internetModule: InternetModule;

  // Camera Module for capturing images (requires Extended Permissions for testing)
  @input
  private cameraModule: CameraModule;

  // ASR Module for speech recognition
  private asrModule: AsrModule = require("LensStudio:AsrModule");

  // TTS Module for text-to-speech
  private ttsModule: TextToSpeechModule = require("LensStudio:TextToSpeechModule");

  private isTranscribing: boolean = false;
  private isWaitingForResponse: boolean = false;
  private currentAudioComponent: AudioComponent | null = null;

  // Your RPC server URL
  private apiServerUrl: string =
    "https://disklike-crysta-nonalkaloidal.ngrok-free.dev/api/internal/rpc";

  public updateTextEvent: Event<{ text: string; completed: boolean }> =
    new Event<{ text: string; completed: boolean }>();

  public waitingForResponseEvent: Event<boolean> = new Event<boolean>();

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

    if (this.isWaitingForResponse) {
      print("Waiting for RPC response, please wait...");
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

      // If the transcription is final, capture image and send to RPC
      if (asrOutput.isFinal) {
        print("Transcription complete: " + asrOutput.text);
        this.isTranscribing = false;

        // Always capture an image for context
        this.captureAndSendWithImage(asrOutput.text);
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

  // Speak text using Text-to-Speech
  private speakText(text: string) {
    if (!this.ttsModule) {
      print("TTS Module not available!");
      return;
    }

    // Stop any currently playing audio
    if (this.currentAudioComponent) {
      this.currentAudioComponent.stop(false);
      this.currentAudioComponent = null;
    }

    print("Speaking: " + text);

    // Create TTS options
    const ttsOptions = TextToSpeech.Options.create();
    ttsOptions.voiceName = "Sasha"; // Default voice

    // Synthesize speech
    this.ttsModule.synthesize(
      text,
      ttsOptions,
      (audioTrackAsset, wordInfo, phonemeInfo, voiceStyle) => {
        print("TTS synthesis complete, playing audio...");

        // Create an audio component and play the speech
        const audioComponent = this.sceneObject.createComponent(
          "Component.AudioComponent"
        ) as AudioComponent;
        audioComponent.audioTrack = audioTrackAsset;
        audioComponent.play(1);

        this.currentAudioComponent = audioComponent;

        // Clean up after audio finishes (approximate duration based on text length)
        const estimatedDuration = text.length * 0.1; // rough estimate
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(() => {
          if (this.currentAudioComponent === audioComponent) {
            this.currentAudioComponent = null;
          }
        });
        delayedEvent.reset(estimatedDuration);
      },
      (errorCode, description) => {
        print(`TTS Error ${errorCode}: ${description}`);
      }
    );
  }

  // Helper to generate a random hex string for tracing
  private generateHexString(length: number): string {
    let result = "";
    const chars = "0123456789abcdef";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Method to send transcribed text with image to your RPC server
  private async callRpcServer(transcribedText: string, base64Image: string) {
    if (!this.internetModule) {
      print("InternetModule not assigned!");
      return;
    }

    // Set flag to prevent new recordings while waiting
    this.isWaitingForResponse = true;
    this.waitingForResponseEvent.invoke(true);

    // Show processing indicator
    this.updateTextEvent.invoke({
      text: "🤔 Thinking...",
      completed: false,
    });

    try {
      print("Sending to RPC server: " + transcribedText);

      // Create the Effect RPC request format with image
      const rpcRequest = {
        id: "1",
        _tag: "Request",
        tag: "GenerateText", // Your RPC method name
        payload: {
          prompt: transcribedText,
          image: base64Image,
        },
        traceId: this.generateHexString(32), // 32 char hex string
        spanId: this.generateHexString(16), // 16 char hex string
        sampled: true,
        headers: [],
      };

      // Create the HTTP request
      const request = new Request(this.apiServerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rpcRequest),
      });

      // Make the request
      const response = await this.internetModule.fetch(request);

      if (response.status === 200) {
        const responseText = await response.text();
        print("RPC Response: " + responseText);

        // Parse the Effect RPC response format
        // Response is an array like: [{"_tag":"Exit","requestId":"1","exit":{"_tag":"Success","value":"..."}}]
        const responseData = JSON.parse(responseText);

        if (responseData && responseData.length > 0) {
          const exitData = responseData[0];

          if (exitData._tag === "Exit" && exitData.exit._tag === "Success") {
            const value = exitData.exit.value;
            print("Success: " + value);

            // Update the UI with the server's response
            this.updateTextEvent.invoke({
              text: value,
              completed: true,
            });

            // Speak the response
            this.speakText(value);

            // Clear flag and restart listening
            this.isWaitingForResponse = false;
            this.waitingForResponseEvent.invoke(false);
            this.startListening();
          } else if (exitData.exit._tag === "Failure") {
            print("RPC Failure: " + JSON.stringify(exitData.exit.cause));
            this.updateTextEvent.invoke({
              text: "Error: " + JSON.stringify(exitData.exit.cause),
              completed: true,
            });

            // Clear flag and restart listening
            this.isWaitingForResponse = false;
            this.waitingForResponseEvent.invoke(false);
            this.startListening();
          }
        }
      } else {
        print("RPC Error: Status " + response.status);

        // Clear flag and restart listening
        this.isWaitingForResponse = false;
        this.waitingForResponseEvent.invoke(false);
        this.startListening();
      }
    } catch (error) {
      print("RPC Error: " + error);

      // Clear flag and restart listening
      this.isWaitingForResponse = false;
      this.waitingForResponseEvent.invoke(false);
      this.startListening();
    }
  }

  // Capture image and send with transcribed text
  public async captureAndSendWithImage(transcribedText: string) {
    if (!this.cameraModule) {
      print("CameraModule not assigned! Sending without image.");
      // Fallback: send empty image string
      this.callRpcServer(transcribedText, "");
      return;
    }

    try {
      print("Capturing image for context...");
      this.updateTextEvent.invoke({
        text: "📸 Capturing...",
        completed: true,
      });

      // Request a still image (high quality - 3200x2400)
      const imageRequest = CameraModule.createImageRequest();
      const imageFrame = await this.cameraModule.requestImage(imageRequest);

      print("Image captured, encoding...");

      // Convert texture to base64
      Base64.encodeTextureAsync(
        imageFrame.texture,
        (base64String) => {
          print("Image encoded, sending to server...");
          // Send both text and image to RPC
          this.callRpcServer(transcribedText, base64String);
        },
        () => {
          print("Failed to encode image, sending without image");
          // Fallback: send without image
          this.callRpcServer(transcribedText, "");
        },
        CompressionQuality.IntermediateQuality,
        EncodingType.Jpg
      );
    } catch (error) {
      print("Error capturing image: " + error);
      // Fallback: send without image
      this.callRpcServer(transcribedText, "");
    }
  }
}
