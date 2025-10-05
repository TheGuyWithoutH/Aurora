# Camera Module

## Overview

Spectacles offers APIs to retrieve the camera frame – what the user is currently seeing – to better understand and build experiences around the user's real-world environment.

> **⚠️ Experimental API:** This is an Experimental API. Please see Experimental APIs for more details.

> **Important Privacy Note:** Accessing the camera frame in a Lens will disable open internet access for that Lens. The camera frame contains user information that may not be transmitted outside the Lens. For testing and experimental purposes however, extended permissions are available to access both the camera frame and the open internet at the same time. Note that Lenses built this way may not be released publicly. Please see Extended Permissions for more information.

## Requesting + Receiving Frames

The CameraModule enables developers to request the camera frame. There are two types of frame requests: **camera frame requests** and **still image requests**. 

- **Camera frame requests** deliver a steady stream of images, albeit at lower quality: this approach is recommended for applications that need video-like consistency in frame delivery.
- **Still image requests**, on the other hand, take longer to complete but result in a higher resolution image -- this is the preferred approach for applications that need high quality images for processing.

## Camera Frame Requests

To begin receiving camera frames, construct a `CameraRequest`, specifying the exact camera of interest (Spectacles have multiple cameras from which to choose: `Left_Color`, `Right_Color`, or `Default_Color`) and the desired resolution of the received frames (via `imageSmallerDimension`, which indicates the size in pixels of the smallest dimension to return).

For example:

```javascript
let cameraModule = require('LensStudio:CameraModule');
let cameraRequest = CameraModule.createCameraRequest();
cameraRequest.id = CameraModule.CameraId.Left_Color;
let cameraTexture = cameraModule.requestCamera(cameraRequest);
```

> **Note:** `createCameraRequest` may not be invoked inside `onAwake` event.

The `requestCamera` method takes a `CameraRequest` and returns a `Texture`. The texture contains the opaque handle that refers to the underlying camera data, and can be used as an input into an `MLComponent` or uploaded to a remote service via `RemoteMediaModule`.

To receive a notification each time the frame is updated, use the `CameraTextureProvider` which can be accessed via `cameraTexture.control`. The `CameraTextureProvider` has an `onNewFrame` event that can be utilized as shown below:

```javascript
let onNewFrame = cameraTexture.control.onNewFrame;
let registration = onNewFrame.add((frame) => {
  // Process the frame
});

script
  .createEvent('OnDestroyEvent')
  .bind(() => onNewFrame.remove(registration));
```

## Still Image Requests

To request still image frames, create an `ImageRequest` from the `CameraModule`, then invoke `requestImage`. The `requestImage` method is asynchronous and will return an `ImageFrame` when complete, which contains the resulting image in a `Texture`, as well as a timestamp if needed.

```javascript
let cameraModule = require('LensStudio:CameraModule');
let imageRequest = CameraModule.createImageRequest();

try {
  let imageFrame = await cameraModule.requestImage(imageRequest);
  // E.g, use the texture in some visual
  script.image.mainPass.baseTex = imageFrame.texture;
  let timestamp = imageFrame.timestampMillis; // scene-relative time
} catch (error) {
  print(`Still image request failed: ${error}`);
}
```

## Getting Camera Information

The Camera API also provides information about the cameras used on Spectacles in order to understand how the camera transforms 3D space into 2D space. This information is provided by the `DeviceCamera` which is accessible via the `DeviceInfoSystem`.

```javascript
// Select the camera
let camera = global.deviceInfoSystem.getTrackingCameraForId(
  CameraModule.CameraId.Left_Color
);

// Retrieve camera properties
let focalLength = camera.focalLength;
let principalPoint = camera.principalPoint;
let resolution = camera.resolution;
let pose = camera.pose;
```

Additionally, `DeviceCamera` includes `project` and `unproject` methods that makes it easier to convert 3D points into 2D points and vice versa.

## Code Example

In Lens Studio click "+" in the Asset Browser window, select "General" and create a new TypeScript or JavaScript file.

Copy and paste the following code into the file and attach the script to an object in the scene. Add an image component to the empty reference in the inspector.

### TypeScript Example

```typescript
@component
export class ContinuousCameraFrameExample extends BaseScriptComponent {
  private cameraModule: CameraModule = require('LensStudio:CameraModule');
  private cameraRequest: CameraModule.CameraRequest;
  private cameraTexture: Texture;
  private cameraTextureProvider: CameraTextureProvider;

  @input
  @hint('The image in the scene that will be showing the captured frame.')
  uiImage: Image | undefined;

  onAwake() {
    this.createEvent('OnStartEvent').bind(() => {
      this.cameraRequest = CameraModule.createCameraRequest();
      this.cameraRequest.cameraId = CameraModule.CameraId.Default_Color;
      this.cameraTexture = this.cameraModule.requestCamera(this.cameraRequest);
      this.cameraTextureProvider = this.cameraTexture
        .control as CameraTextureProvider;

      this.cameraTextureProvider.onNewFrame.add((cameraFrame) => {
        if (this.uiImage) {
          this.uiImage.mainPass.baseTex = this.cameraTexture;
        }
      });
    });
  }
}
```

### JavaScript Example

```javascript
let cameraModule = require('LensStudio:CameraModule');
let cameraRequest;
let cameraTexture;
let cameraTextureProvider;

//@input Component.Image uiImage {"hint":"The image in the scene that will be showing the captured frame."}

script.createEvent('OnStartEvent').bind(() => {
  cameraRequest = CameraModule.createCameraRequest();
  cameraRequest.cameraId = CameraModule.CameraId.Default_Color;
  cameraTexture = cameraModule.requestCamera(cameraRequest);
  cameraTextureProvider = cameraTexture.control;

  cameraTextureProvider.onNewFrame.add((cameraFrame) => {
    if (script.uiImage) {
      script.uiImage.mainPass.baseTex = cameraTexture;
    }
  });
});
```
