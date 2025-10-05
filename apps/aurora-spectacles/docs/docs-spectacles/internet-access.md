# Internet Access

Spectacles offers APIs to access the internet so you can access external APIs, open WebSocket connections, download media, and more.

> **Privacy Note:** Accessing the internet in a Lens will disable access to privacy-sensitive user information in that Lens, such as the camera frame, location, and audio. For testing and experimental purposes however, extended permissions are available to access both the camera frame and the open internet at the same time. Note that lenses built this way may not be released publicly. Please see Extended Permissions doc for more information.

> **Important:** Prior to Lens Studio 5.9, `performHttpRequest` and `fetch` were available via the `RemoteServiceModule`. From Lens Studio 5.9, these APIs have been moved to the `InternetModule`. Lenses that are already public can continue to use these methods in `RemoteServiceModule` until they are re-published with Lens Studio 5.9.

The `InternetModule` enables developers to access the internet via http and https requests. There are two methods available to make these requests: `fetch` and `performHttpRequest`. For most cases we recommend using `fetch`.

> **Note:** Using insecure connections (http) requires enabling Experimental APIs. While these Lenses are suitable for testing purposes, they cannot be published. Lenses employing secure connections (https) are eligible for publication.

## Fetch

Spectacles offers the standardized Fetch API to make https requests on the open internet. This API is based on the [MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

### Prerequisites

- Lens Studio v5.3.0 or later
- Spectacles OS v5.58.6621 or later

> **Note:** This API is only available on Spectacles.

### Usage

To use the Fetch API add the `InternetModule` to your project and include it in your scripts as per the examples below.

> **Important:** The Fetch API will only work in the Preview window if the Device Type Override is set to Spectacles. Otherwise all requests will return 404.

To send a request, invoke the `fetch` method.

#### Basic GET Request

**TypeScript:**
```typescript
@component
export class FetchExampleGET extends BaseScriptComponent {
  @input internetModule: InternetModule;

  // Method called when the script is awake
  async onAwake() {
    let request = new Request('[YOUR URL]', {
      method: 'GET',
    });
    let response = await this.internetModule.fetch(request);
    if (response.status == 200) {
      let text = await response.text();
      // Handle response
    }
  }
}
```

**JavaScript:**
```javascript
//@input Asset.InternetModule internetModule
/** @type {InternetModule} */
var internetModule = script.internetModule;

let request = new Request('[YOUR URL]', {
  method: 'GET',
});
let response = await internetModule.fetch(request);
if (response.status == 200) {
  let text = await response.text();
  // Handle response
}
```

Fetch can also send Get, Post, Delete, and Put requests.

#### POST Request with Headers and JSON

Below is a more detailed example that issues a Post request with headers and parses the response in JSON.

**TypeScript:**
```typescript
@component
export class FetchExamplePOST extends BaseScriptComponent {
  @input internetModule: InternetModule;

  async onAwake() {
    let request = new Request('[YOUR URL]', {
      method: 'POST',
      body: JSON.stringify({ user: { name: 'user', career: 'developer' } }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let response = await this.internetModule.fetch(request);
    if (response.status != 200) {
      print('Failure: response not successful');
      return;
    }

    let contentTypeHeader = response.headers.get('Content-Type');
    if (!contentTypeHeader.includes('application/json')) {
      print('Failure: wrong content type in response');
      return;
    }

    let responseJson = await response.json();
    let username = responseJson.json['user']['name'];
    let career = responseJson.json['user']['career'];
  }
}
```

**JavaScript:**
```javascript
//@input Asset.InternetModule internetModule
/** @type {InternetModule} */
var internetModule = script.internetModule;

let request = new Request('[YOUR URL]', {
  method: 'POST',
  body: JSON.stringify({ user: { name: 'user', career: 'developer' } }),
  headers: {
    'Content-Type': 'application/json',
  },
});

let response = await internetModule.fetch(request);
if (response.status != 200) {
  print('Failure: response not successful');
  return;
}

let contentTypeHeader = response.headers.get('content-type');
if (!contentTypeHeader.includes('application/json')) {
  print('Failure: wrong content type in response');
  return;
}

let responseJson = await response.json();
let username = responseJson.json['user']['name'];
let career = responseJson.json['user']['career'];
```

> **Note:** For even more detail, see the sample project that fully utilizes Fetch API.

### Compatibility

The Fetch API supports all methods in the standard, with the following exceptions:

- The Request constructor does not support taking another Request as input; it only takes a URL.
- Request and Response bodies can be retrieved via `bytes`, `text`, and `json`. The `body`, `blob`, and `arrayBuffer` properties are not yet supported.
- Other properties related to web browser functionality are not supported.

#### API Support Table

| **Request** | Support | **Response** | Support | **Headers** | Support |
|------------|---------|-------------|---------|-------------|---------|
| Request(input, options) | ✅ | Response() | ❌ | Headers() | ✅ |
| body | ❌ | body | ❌ | append() | ✅ |
| bodyUsed | ✅ | bodyUsed | ✅ | delete() | ✅ |
| cache | ❌ | headers | ✅ | entries() | ✅ |
| credentials | ❌ | ok | ✅ | forEach() | ❌ |
| destination | ❌ | redirected | ❌ | get() | ✅ |
| headers | ✅ | status | ✅ | getSetCookie() | ❌ |
| integrity | ❌ | statusText | ✅ | has() | ✅ |
| isHistoryNavigation | ❌ | type | ❌ | keys() | ✅ |
| keepalive | ✅ | url | ✅ | set() | ✅ |
| method | ✅ | arrayBuffer() | ❌ | values() | ✅ |
| mode | ❌ | blob() | ❌ | | |
| redirect | ✅ | bytes() | ✅ | | |
| referrer | ❌ | clone() | ❌ | | |
| referrerPolicy | ❌ | formData() | ❌ | | |
| signal | ❌ | json() | ✅ | | |
| url | ✅ | text() | ✅ | | |
| arrayBuffer() | ❌ | | | | |
| blob() | ❌ | | | | |
| bytes() | ✅ | | | | |
| clone() | ❌ | | | | |
| formData() | ❌ | | | | |
| json() | ✅ | | | | |
| text() | ✅ | | | | |

## PerformHttpRequest

The `performHttpRequest` method can also be used to send HTTPS requests.

> **Note:** `PerformHttpRequest` is a simpler API with less functionality, provided for compatibility reasons. We recommend using `fetch` instead.

To use `performHttpRequest`, create a `RemoteServiceHttpRequest`, configure it, and send it via the `InternetModule`.

### Basic GET Request

**TypeScript:**
```typescript
@component
export class GetCatFacts extends BaseScriptComponent {
  @input
  internetModule: InternetModule;

  // Method called when the script is awake
  onAwake() {
    // Create a new HTTP request
    let httpRequest = RemoteServiceHttpRequest.create();
    httpRequest.url = 'https://catfact.ninja/facts'; // Set the URL for the request
    httpRequest.method = RemoteServiceHttpRequest.HttpRequestMethod.Get; // Set the HTTP method to GET

    // Perform the HTTP request
    this.internetModule.performHttpRequest(httpRequest, (response) => {
      if (response.statusCode === 200) {
        // Check if the response status is 200 (OK)
        print('Body: ' + response.body);
      }
    });
  }
}
```

**JavaScript:**
```javascript
//@input Asset.InternetModule internetModule
/** @type {InternetModule} */
var internetModule = script.internetModule;

// Create a new HTTP request
let httpRequest = RemoteServiceHttpRequest.create();
httpRequest.url = 'https://catfact.ninja/facts'; // Set the URL for the request
httpRequest.method = RemoteServiceHttpRequest.HttpRequestMethod.Get; // Set the HTTP method to GET

// Perform the HTTP request
internetModule.performHttpRequest(httpRequest, (response) => {
  if (response.statusCode === 200) {
    // Check if the response status is 200 (OK)
    print('Body: ' + response.body);
  }
});
```

The `RemoteServiceHttpRequest` can send Get, Post, Delete, and Put requests. The URL for the request must be specified.

### Request with Headers

Headers can be set via `setHeader(name, value)`. Below is an example that utilizes request headers for authorization:

```javascript
var httpRequest = RemoteServiceHttpRequest.create();
httpRequest.url = '[YOUR URL]';
httpRequest.method = RemoteServiceHttpRequest.HttpRequestMethod.Post;
httpRequest.setHeader('Content-Type', 'application/x-www-form-urlencoded');
httpRequest.setHeader('Authorization', `Basic ${encodedCredentials}`);
httpRequest.body = 'grant_type=client_credentials';

script.internetModule.performHttpRequest(httpRequest, function (response) {
  print('Status code: ' + response.statusCode);
  print('Content type: ' + response.contentType);
  print('Body: ' + response.body);
  print('Headers: ' + response.headers);
  print('Header(date): ' + response.getHeader('date'));
  print('Header(contenttype): ' + response.getHeader('content-type'));
});
```

## Accessing Remote Media

To download media (Image, Video, glTF, and audio), utilize the `makeResourceFromUrl` method to create a Resource out of the URL, then pass that resource into the appropriate method in `RemoteMediaModule`.

### Download an Image from a URL

**TypeScript:**
```typescript
@component
export class GetHttpImage extends BaseScriptComponent {
  // Import the RemoteServiceModule and RemoteMediaModule
  private remoteServiceModule: RemoteServiceModule = require('LensStudio:RemoteServiceModule');
  private remoteMediaModule: RemoteMediaModule = require('LensStudio:RemoteMediaModule');

  // URL of the image to fetch
  private imageUrl: string =
    'https://developers.snap.com/img/spectacles/spectacles-2024-hero.png';

  // Method called when the script is awake
  async onAwake() {
    if (!this.remoteServiceModule || !this.remoteMediaModule) {
      print('Remote Service Module or Remote Media Module is missing.');
      return;
    }

    try {
      print('Fetching image...');

      // Using makeResourceFromUrl to fetch the image
      const resource: DynamicResource =
        this.remoteServiceModule.makeResourceFromUrl(this.imageUrl);

      // Load resource and convert it to image texture
      if (resource) {
        this.remoteMediaModule.loadResourceAsImageTexture(
          resource,
          (texture) => {
            // Assign texture to a material
            print('Image texture loaded: ' + texture);
          },
          (error) => {
            print('Error loading image texture: ' + error); // Print an error message if loading fails
          }
        );
      } else {
        print('Error: Failed to create resource from URL.');
      }
    } catch (error) {
      print('Error fetching image: ' + error);
    }
  }
}
```

**JavaScript:**
```javascript
// Import the RemoteServiceModule and RemoteMediaModule
var remoteServiceModule = require('LensStudio:RemoteServiceModule');
var remoteMediaModule = require('LensStudio:RemoteMediaModule');

// URL of the image to fetch
var imageUrl =
  'https://developers.snap.com/img/spectacles/spectacles-2024-hero.png';

// Initialize processing state
var isProcessing = false;

// Create and bind the OnStartEvent
script.createEvent('OnStartEvent').bind(onStart);

// Function that's called on starting the event
function onStart() {
  if (isProcessing) {
    print('A request is already in progress.');
    return;
  }

  isProcessing = true;
  fetchAndLoadImage();
}

// Function to fetch and load the image as a texture
function fetchAndLoadImage() {
  if (!remoteServiceModule || !remoteMediaModule) {
    print('RemoteServiceModule or RemoteMediaModule is not available.');
    isProcessing = false;
    return;
  }

  try {
    print('Fetching image...');

    // Create a resource from the image URL
    var resource = remoteServiceModule.makeResourceFromUrl(imageUrl);

    // Load resource and convert it to image texture
    if (resource) {
      remoteMediaModule.loadResourceAsImageTexture(
        resource,
        function (texture) {
          // Image texture loaded successfully, apply texture
          print('Image texture loaded: ' + texture);
        },
        function (error) {
          print('Error loading image texture: ' + error);
        }
      );
    } else {
      print('Error: Failed to create resource from URL.');
    }
  } catch (error) {
    print('Error fetching image: ' + error);
  } finally {
    isProcessing = false;
  }
}
```

### Download a GLTF with animations from a URL

**TypeScript:**
```typescript
@component
export class DownloadGltfExample extends BaseScriptComponent {
  @input
  material: Material;

  @input
  cameraObject: SceneObject;

  private remoteServiceModule: RemoteServiceModule = require('LensStudio:RemoteServiceModule');
  private remoteMediaModule: RemoteMediaModule = require('LensStudio:RemoteMediaModule');

  onAwake() {
    // Set the URL to your remote GLTF resource
    let gltfUrl: string = 'YOUR_GLTF_URL_HERE';

    if (!this.remoteServiceModule || !this.remoteMediaModule) {
      print('Remote Service Module or Remote Media Module is missing.');
      return;
    }

    try {
      print('Fetching gltf asset...');
      let resource: DynamicResource =
        this.remoteServiceModule.makeResourceFromUrl(gltfUrl);

      if (resource) {
        this.remoteMediaModule.loadResourceAsGltfAsset(
          resource,
          (gltfAsset) => {
            let gltfSettings = GltfSettings.create();
            gltfSettings.convertMetersToCentimeters = true;

            gltfAsset.tryInstantiateAsync(
              this.sceneObject,
              this.material,
              (sceneObj) => {
                // Get the camera position
                let cameraPosition = this.cameraObject
                  .getTransform()
                  .getWorldPosition();

                // Set the position of the instantiated GLTF object in front of the camera
                sceneObj
                  .getTransform()
                  .setWorldPosition(
                    new vec3(
                      cameraPosition.x,
                      cameraPosition.y,
                      cameraPosition.z - 100
                    )
                  );

                // Get the Animation Player component from second child of the object.
                // Adjust it depending on where the Animation Player is in the gltf model.
                let animationPlayer = sceneObj
                  .getChild(0)
                  .getChild(0)
                  .getComponent('AnimationPlayer');

                print('Animation Player: ' + animationPlayer);

                let activeClips = animationPlayer.getActiveClips();
                let inactiveClips = animationPlayer.getInactiveClips();

                print('Active Clips: ' + activeClips.length);
                print('Inactive Clips: ' + inactiveClips.length);

                inactiveClips.forEach((clip) => {
                  print('Inactive Clip: ' + clip);
                });

                animationPlayer.playClipAt('Talk', 0);
              },
              (error) => {
                print('Error: ' + error);
              },
              (progress) => {
                print('Progress: ' + progress);
              },
              gltfSettings
            );
          },
          (error) => {
            // Handle error if GLTF does not load
            print('Error: ' + error);
          }
        );
      } else {
        print('Failed to create resource from URL.');
      }
    } catch (error) {
      print('Error fetching gltf asset: ' + error);
    }
  }
}
```

**JavaScript:**
```javascript
//@input Asset.Material material
//@input SceneObject cameraObject

let remoteServiceModule = require('LensStudio:RemoteServiceModule');
let remoteMediaModule = require('LensStudio:RemoteMediaModule');

let gltfUrl = 'YOUR_GLTF_URL_HERE';

if (!remoteServiceModule || !remoteMediaModule) {
  print('Remote Service Module or Remote Media Module is missing.');
  return;
}

try {
  print('Fetching GLTF asset from URL');
  let resource = remoteServiceModule.makeResourceFromUrl(gltfUrl);

  if (resource) {
    remoteMediaModule.loadResourceAsGltfAsset(
      resource,
      (gltfAsset) => {
        let gltfSettings = GltfSettings.create();
        gltfSettings.convertMetersToCentimeters = true;

        gltfAsset.tryInstantiateAsync(
          script.sceneObject,
          script.material,
          (sceneObj) => {
            // Get the camera position
            let cameraPosition = script.cameraObject
              .getTransform()
              .getWorldPosition();

            // Set the position of the instantiated GLTF object in front of the camera
            sceneObj
              .getTransform()
              .setWorldPosition(
                new vec3(
                  cameraPosition.x,
                  cameraPosition.y,
                  cameraPosition.z - 100
                )
              );

            // Get the Animation Player component from second child of the object.
            // Adjust it depending on where the Animation Player is in the gltf model.
            let animationPlayer = sceneObj
              .getChild(0)
              .getChild(0)
              .getComponent('Component.AnimationPlayer');

            print('Animation Player: ' + animationPlayer);

            let activeClips = animationPlayer.getActiveClips();
            let inactiveClips = animationPlayer.getInactiveClips();

            print('Active Clips: ' + activeClips.length);
            print('Inactive Clips: ' + inactiveClips.length);

            inactiveClips.forEach((clip) => {
              print(clip);
            });

            animationPlayer.playClipAt('Idle', 0);
          },
          (error) => {
            print('Error instantiating GLTF asset: ' + error);
          },
          (progress) => {
            print('Progress: ' + progress);
          },
          gltfSettings
        );
      },
      (error) => {
        print('Error loading GLTF asset: ' + error);
      }
    );
  } else {
    print('Failed to create resource from URL.');
  }
} catch (error) {
  print('Error fetching gltf asset: ' + error);
}
```

### Supported Media Types

The `RemoteMediaModule` can be used this way to load the following media types:

| Media Type | Method | Returned Class |
|------------|--------|----------------|
| Image | `loadResourceAsImageTexture` | `Asset.Texture` |
| Video | `loadResourceAsVideoTexture` | `Asset.Texture` |
| glTF | `loadResourceAsGltfAsset` | `Asset.GltfAsset` |
| audio | `loadResourceAsAudioTrackAsset` | `Asset.AudioTrackAsset` |

## Internet Availability

Spectacles allows you to detect and respond to changes of internet availability status. This can help you avoid frozen, empty, or broken experiences and clearly indicate that the internet is needed for some functionality to work.

### Prerequisites

- Lens Studio v5.7.0 or later
- Spectacles OS v5.60.x or later

The `isInternetAvailable` method of `DeviceInfoSystem` checks the current status of the internet connection. It returns a boolean value:
- `true` if internet is available
- `false` if internet is not available

This function is typically used to determine the initial state of the internet connection upon lens starts. It can also be used to determine internet availability at an arbitrary time.

The `onInternetStatusChanged` is an event, retrieved from `DeviceInfoSystem`, that triggers whenever there is a change in the internet connection status. It allows the application to respond dynamically to changes in connectivity.

> **Note:** Features such as Text-to-Speech, Speech-to-Text, Connected Lenses, Web View, Bitmoji Module, Location Cloudstorage, Map, and Leaderboard require Internet Connection.

**TypeScript:**
```typescript
@component
export class NewScript extends BaseScriptComponent {
  @input textObject: Text;

  onAwake() {
    this.textObject.text = global.deviceInfoSystem.isInternetAvailable()
      ? 'Internet is available'
      : 'No internet';

    global.deviceInfoSystem.onInternetStatusChanged.add((args) => {
      this.textObject.text = args.isInternetAvailable
        ? 'UPDATED: Internet is available'
        : 'UPDATED: No internet';
    });
  }
}
```

**JavaScript:**
```javascript
// @input Component.Text textObject

script.textObject.text = global.deviceInfoSystem.isInternetAvailable()
  ? 'Internet is available'
  : 'No internet';

global.deviceInfoSystem.onInternetStatusChanged.add(function (eventData) {
  script.textObject.text = eventData.isInternetAvailable
    ? 'UPDATED: Internet is available'
    : 'UPDATED: No internet';
});
```