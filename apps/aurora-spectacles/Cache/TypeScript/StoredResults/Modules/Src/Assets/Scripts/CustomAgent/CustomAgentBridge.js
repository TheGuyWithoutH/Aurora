"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomAgentBridge = void 0;
var __selfType = requireType("./CustomAgentBridge");
function component(target) { target.getTypeName = function () { return __selfType; }; }
let CustomAgentBridge = class CustomAgentBridge extends BaseScriptComponent {
    onAwake() {
        this.createEvent("OnStartEvent").bind(() => {
            this.connectEvents();
        });
    }
    connectEvents() {
        // Initialize the UI
        this.sphereController.initializeUI();
        // Connect the CustomAgent's text updates to the SphereController
        this.customAgent.updateTextEvent.add((data) => {
            this.sphereController.setText(data);
        });
        // Connect waiting state to animation speed
        this.customAgent.waitingForResponseEvent.add((isWaiting) => {
            this.sphereController.setThinkingMode(isWaiting);
        });
        // Connect sphere activation to start/stop transcription
        this.sphereController.isActivatedEvent.add((isActivated) => {
            if (isActivated) {
                print("Sphere activated - transcription should be running");
            }
            else {
                print("Sphere deactivated");
            }
        });
    }
};
exports.CustomAgentBridge = CustomAgentBridge;
exports.CustomAgentBridge = CustomAgentBridge = __decorate([
    component
], CustomAgentBridge);
//# sourceMappingURL=CustomAgentBridge.js.map