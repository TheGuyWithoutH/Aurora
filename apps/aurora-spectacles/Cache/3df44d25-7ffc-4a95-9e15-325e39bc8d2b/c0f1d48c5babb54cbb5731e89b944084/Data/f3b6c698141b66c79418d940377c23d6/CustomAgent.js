"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomAgent = void 0;
var __selfType = requireType("./CustomAgent");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const Event_1 = require("SpectaclesInteractionKit.lspkg/Utils/Event");
let CustomAgent = class CustomAgent extends BaseScriptComponent {
    onAwake() {
        // Start transcribing when the component is initialized
        this.createEvent("OnStartEvent").bind(() => {
            this.startListening();
        });
    }
    startListening() {
        if (this.isTranscribing) {
            print("Already transcribing...");
            return;
        }
        if (this.isWaitingForResponse) {
            print("Waiting for RPC response, please wait...");
            this.updateTextEvent.invoke({
                text: "⏳ Please wait for current response...",
                completed: false,
            });
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
    stopListening() {
        if (this.isTranscribing) {
            print("Stopping ASR transcription...");
            this.asrModule.stopTranscribing();
            this.isTranscribing = false;
        }
    }
    // Speak text using Text-to-Speech
    speakText(text) {
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
        this.ttsModule.synthesize(text, ttsOptions, (audioTrackAsset, wordInfo, phonemeInfo, voiceStyle) => {
            print("TTS synthesis complete, playing audio...");
            // Create an audio component and play the speech
            const audioComponent = this.sceneObject.createComponent("Component.AudioComponent");
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
        }, (errorCode, description) => {
            print(`TTS Error ${errorCode}: ${description}`);
        });
    }
    // Helper to generate a random hex string for tracing
    generateHexString(length) {
        let result = "";
        const chars = "0123456789abcdef";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    // Method to send transcribed text with image to your RPC server
    async callRpcServer(transcribedText, base64Image) {
        if (!this.internetModule) {
            print("InternetModule not assigned!");
            return;
        }
        // Set flag to prevent new recordings while waiting
        this.isWaitingForResponse = true;
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
                        this.startListening();
                    }
                    else if (exitData.exit._tag === "Failure") {
                        print("RPC Failure: " + JSON.stringify(exitData.exit.cause));
                        this.updateTextEvent.invoke({
                            text: "Error: " + JSON.stringify(exitData.exit.cause),
                            completed: true,
                        });
                        // Clear flag and restart listening
                        this.isWaitingForResponse = false;
                        this.startListening();
                    }
                }
            }
            else {
                print("RPC Error: Status " + response.status);
                this.updateTextEvent.invoke({
                    text: "Error: Server returned " + response.status,
                    completed: true,
                });
                // Clear flag and restart listening
                this.isWaitingForResponse = false;
                this.startListening();
            }
        }
        catch (error) {
            print("RPC Error: " + error);
            this.updateTextEvent.invoke({
                text: "Error calling server: " + error,
                completed: true,
            });
            // Clear flag and restart listening
            this.isWaitingForResponse = false;
            this.startListening();
        }
    }
    // Capture image and send with transcribed text
    async captureAndSendWithImage(transcribedText) {
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
            Base64.encodeTextureAsync(imageFrame.texture, (base64String) => {
                print("Image encoded, sending to server...");
                // Send both text and image to RPC
                this.callRpcServer(transcribedText, base64String);
            }, () => {
                print("Failed to encode image, sending without image");
                // Fallback: send without image
                this.callRpcServer(transcribedText, "");
            }, CompressionQuality.IntermediateQuality, EncodingType.Jpg);
        }
        catch (error) {
            print("Error capturing image: " + error);
            // Fallback: send without image
            this.callRpcServer(transcribedText, "");
        }
    }
    // Capture a photo and send it to the RPC server
    async captureAndSendImage(prompt = "What do you see?") {
        if (!this.cameraModule) {
            print("CameraModule not assigned!");
            this.updateTextEvent.invoke({
                text: "Error: Camera not available",
                completed: true,
            });
            return;
        }
        if (!this.internetModule) {
            print("InternetModule not assigned!");
            return;
        }
        try {
            print("Capturing image...");
            // Request a still image (high quality - 3200x2400)
            const imageRequest = CameraModule.createImageRequest();
            const imageFrame = await this.cameraModule.requestImage(imageRequest);
            print("Image captured, encoding to base64...");
            // Convert texture to base64
            Base64.encodeTextureAsync(imageFrame.texture, (base64String) => {
                print("Image encoded, sending to server...");
                print(base64String);
                this.sendImageToRpc(base64String, prompt);
            }, () => {
                print("Failed to encode image");
                this.updateTextEvent.invoke({
                    text: "Error: Failed to encode image",
                    completed: true,
                });
            }, CompressionQuality.IntermediateQuality, EncodingType.Jpg);
        }
        catch (error) {
            print("Error capturing image: " + error);
            this.updateTextEvent.invoke({
                text: "Error capturing image: " + error,
                completed: true,
            });
        }
    }
    // Send base64 image to RPC server
    async sendImageToRpc(base64Image, prompt) {
        // Set flag to prevent new recordings while waiting
        this.isWaitingForResponse = true;
        try {
            // Create the Effect RPC request for vision/image analysis
            const rpcRequest = {
                id: "1",
                _tag: "Request",
                tag: "AnalyzeImage", // You'll need to create this RPC method
                payload: {
                    image: base64Image,
                    prompt: prompt,
                },
                traceId: this.generateHexString(32),
                spanId: this.generateHexString(16),
                sampled: true,
                headers: [],
            };
            const request = new Request(this.apiServerUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(rpcRequest),
            });
            print("Sending image to server...");
            const response = await this.internetModule.fetch(request);
            if (response.status === 200) {
                const responseText = await response.text();
                print("Image analysis response: " + responseText);
                const responseData = JSON.parse(responseText);
                if (responseData && responseData.length > 0) {
                    const exitData = responseData[0];
                    if (exitData._tag === "Exit" && exitData.exit._tag === "Success") {
                        const value = exitData.exit.value;
                        print("Vision response: " + value);
                        this.updateTextEvent.invoke({
                            text: "🤖 " + value,
                            completed: true,
                        });
                        // Speak the vision response
                        this.speakText(value);
                        // Clear flag and restart listening
                        this.isWaitingForResponse = false;
                        this.startListening();
                    }
                    else if (exitData.exit._tag === "Failure") {
                        print("RPC Failure: " + JSON.stringify(exitData.exit.cause));
                        this.updateTextEvent.invoke({
                            text: "Error: " + JSON.stringify(exitData.exit.cause),
                            completed: true,
                        });
                        // Clear flag and restart listening
                        this.isWaitingForResponse = false;
                        this.startListening();
                    }
                }
            }
            else {
                print("RPC Error: Status " + response.status);
                this.updateTextEvent.invoke({
                    text: "Error: Server returned " + response.status,
                    completed: true,
                });
                // Clear flag and restart listening
                this.isWaitingForResponse = false;
                this.startListening();
            }
        }
        catch (error) {
            print("Error sending image: " + error);
            this.updateTextEvent.invoke({
                text: "Error: " + error,
                completed: true,
            });
            // Clear flag and restart listening
            this.isWaitingForResponse = false;
            this.startListening();
        }
    }
    __initialize() {
        super.__initialize();
        this.asrModule = require("LensStudio:AsrModule");
        this.ttsModule = require("LensStudio:TextToSpeechModule");
        this.isTranscribing = false;
        this.isWaitingForResponse = false;
        this.currentAudioComponent = null;
        this.apiServerUrl = "https://disklike-crysta-nonalkaloidal.ngrok-free.dev/api/internal/rpc";
        this.updateTextEvent = new Event_1.default();
    }
};
exports.CustomAgent = CustomAgent;
exports.CustomAgent = CustomAgent = __decorate([
    component
], CustomAgent);
//# sourceMappingURL=CustomAgent.js.map