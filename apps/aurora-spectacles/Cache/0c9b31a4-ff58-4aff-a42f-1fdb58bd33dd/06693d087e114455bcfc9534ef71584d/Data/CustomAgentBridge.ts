import { SphereController } from "../SphereController";
import { CustomAgent } from "./CustomAgent";

@component
export class CustomAgentBridge extends BaseScriptComponent {
  @input
  private customAgent: CustomAgent;

  @input
  private sphereController: SphereController;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.connectEvents();
    });
  }

  private connectEvents() {
    // Initialize the UI
    this.sphereController.initializeUI();

    // Connect the CustomAgent's text updates to the SphereController
    this.customAgent.updateTextEvent.add((data) => {
      this.sphereController.setText(data);
    });

    // Connect sphere activation to start/stop transcription
    this.sphereController.isActivatedEvent.add((isActivated) => {
      if (isActivated) {
        print("Sphere activated - transcription should be running");
      } else {
        print("Sphere deactivated");
      }
    });
  }
}
