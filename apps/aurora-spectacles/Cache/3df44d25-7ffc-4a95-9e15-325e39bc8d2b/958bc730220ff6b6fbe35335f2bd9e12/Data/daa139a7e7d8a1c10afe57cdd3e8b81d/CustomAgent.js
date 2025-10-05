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
    // Example method to call your RPC server
    async callRpcServer(transcribedText) {
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
        this.rpcServerUrl = "http://localhost:3002/api/internal/rpc";
        this.updateTextEvent = new Event_1.default();
    }
};
exports.CustomAgent = CustomAgent;
exports.CustomAgent = CustomAgent = __decorate([
    component
], CustomAgent);
//# sourceMappingURL=CustomAgent.js.map