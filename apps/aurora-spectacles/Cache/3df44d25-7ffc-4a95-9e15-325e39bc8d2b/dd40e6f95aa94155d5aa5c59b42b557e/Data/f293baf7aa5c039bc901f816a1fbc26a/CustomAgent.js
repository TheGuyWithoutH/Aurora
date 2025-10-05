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
                completed: asrOutput.isFinal,
            });
            // If the transcription is final, send it to the RPC server
            if (asrOutput.isFinal) {
                print("Transcription complete: " + asrOutput.text);
                this.isTranscribing = false;
                // Call the RPC server with the transcribed text
                this.callRpcServer(asrOutput.text);
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
    // Helper to generate a random hex string for tracing
    generateHexString(length) {
        let result = "";
        const chars = "0123456789abcdef";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    // Method to send transcribed text to your RPC server
    async callRpcServer(transcribedText) {
        if (!this.internetModule) {
            print("InternetModule not assigned!");
            return;
        }
        try {
            print("Sending to RPC server: " + transcribedText);
            // Create the Effect RPC request format
            const rpcRequest = {
                id: "1",
                _tag: "Request",
                tag: "GenerateText", // Your RPC method name
                payload: {
                    prompt: transcribedText,
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
                            text: "AI: " + value,
                            completed: true,
                        });
                    }
                    else if (exitData.exit._tag === "Failure") {
                        print("RPC Failure: " + JSON.stringify(exitData.exit.cause));
                        this.updateTextEvent.invoke({
                            text: "Error: " + JSON.stringify(exitData.exit.cause),
                            completed: true,
                        });
                    }
                }
            }
            else {
                print("RPC Error: Status " + response.status);
                this.updateTextEvent.invoke({
                    text: "Error: Server returned " + response.status,
                    completed: true,
                });
            }
        }
        catch (error) {
            print("RPC Error: " + error);
            this.updateTextEvent.invoke({
                text: "Error calling server: " + error,
                completed: true,
            });
        }
    }
    __initialize() {
        super.__initialize();
        this.asrModule = require("LensStudio:AsrModule");
        this.isTranscribing = false;
        this.apiServerUrl = "https://disklike-crysta-nonalkaloidal.ngrok-free.dev/api/internal/rpc";
        this.updateTextEvent = new Event_1.default();
    }
};
exports.CustomAgent = CustomAgent;
exports.CustomAgent = CustomAgent = __decorate([
    component
], CustomAgent);
//# sourceMappingURL=CustomAgent.js.map